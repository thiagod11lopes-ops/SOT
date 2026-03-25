/**
 * Sincronização bidirecional localStorage ↔ Firebase (offline-first, resiliente).
 * Regra: Firebase nunca perde dados; união local + remoto; integridade checada antes de gravar.
 * Execução em segundo plano com yield à UI entre coleções.
 *
 * Segurança: escrita efetiva na nuvem continua sujeita às regras Firestore; este script não as substitui.
 */
(function() {
    'use strict';

    var SOT_LAST_SYNC_KEY = 'sot_last_sync_timestamp';
    var AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;
    var LOG_PREFIX = '[sot-sync]';
    var syncInFlight = false;

    /** C3: alinhado a firebaseSot.isOfflineMode (fallback se script ainda não carregou). */
    function isSotCloudSyncDisabledByPolicy() {
        try {
            if (window.firebaseSot && typeof window.firebaseSot.isOfflineMode === 'function') {
                return window.firebaseSot.isOfflineMode();
            }
        } catch (e) {}
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem('sot_offline_mode') === 'true';
        } catch (e2) {
            return false;
        }
    }

    function log(level, msg, err) {
        try {
            var text = err != null ? msg + ' ' + (err.message || String(err)) : msg;
            if (level === 'warn') console.warn(LOG_PREFIX, text);
            else if (level === 'error') console.error(LOG_PREFIX, text);
        } catch (e) {}
    }

    function yieldToUI() {
        return new Promise(function(resolve) {
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(function() { resolve(); }, { timeout: 50 });
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    function stableKeyForItem(item, idField) {
        if (!item || typeof item !== 'object') return null;
        var id = item[idField || 'id'] || item.id || item._id || item.uuid || item.key;
        if (id != null && String(id).trim() !== '') return 'id:' + String(id).trim();
        // Fallback para evitar duplicação quando não há id estável.
        var sig = [
            item.tipo || '',
            item.dataSaida || item.dataPedido || item.data || '',
            item.horaSaida || item.hora || item.saida || '',
            item.viatura || '',
            item.motorista || '',
            item.setor || '',
            item.destino || item.hospital || item.objetivo || ''
        ].join('|').toLowerCase();
        if (!sig.replace(/\|/g, '').trim()) return null;
        return 'sig:' + sig;
    }

    function mergeArraysById(local, remote, idField) {
        idField = idField || 'id';
        if (!Array.isArray(local)) local = [];
        if (!Array.isArray(remote)) remote = [];
        var byId = new Map();
        // Preferir o "remote" em conflitos (mesmo id).
        // Isso impede que uma versão antiga no localStorage sobrescreva o Firebase
        // quando ocorrer sincronização após atualizações no app.
        remote.forEach(function(item) {
            var key = stableKeyForItem(item, idField);
            if (key) byId.set(key, item);
        });
        local.forEach(function(item) {
            var key = stableKeyForItem(item, idField);
            if (key && !byId.has(key)) byId.set(key, item);
        });
        return Array.from(byId.values());
    }

    // Tenta inferir "criado/modificado" do id quando ele carrega um timestamp.
    // Usado para não ressuscitar itens antigos do localStorage que já foram deletados no remoto.
    function getIdTimestampMs(id) {
        if (id == null) return null;
        var s = String(id);
        var m = s.match(/^saida_(\d+)_/); // ex.: saida_1712345678901_...
        if (m && m[1]) {
            var n = parseInt(m[1], 10);
            return isNaN(n) ? null : n;
        }
        m = s.match(/^import-(\d+)-/); // ex.: import-1712345678901-...
        if (m && m[1]) {
            var n2 = parseInt(m[1], 10);
            return isNaN(n2) ? null : n2;
        }
        return null;
    }

    function getLocalEscalaObject() {
        var out = {};
        var re = /^\d{4}-\d{2}$/;
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && re.test(key)) {
                    var v = localStorage.getItem(key);
                    if (v) out[key] = JSON.parse(v);
                }
            }
        } catch (e) {
            log('warn', 'getLocalEscalaObject', e);
        }
        return out;
    }

    function setLocalEscalaFromObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        try {
            Object.keys(obj).forEach(function(key) {
                localStorage.setItem(key, JSON.stringify(obj[key]));
            });
        } catch (e) {
            log('warn', 'setLocalEscalaFromObject', e);
        }
    }

    function getLocal(key, def) {
        try {
            var v = localStorage.getItem(key);
            return v ? JSON.parse(v) : def;
        } catch (e) {
            return def;
        }
    }

    function setLocal(key, val) {
        try {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        } catch (e) {
            log('warn', 'setLocal ' + key, e);
        }
    }

    function getLastSyncDisplay() {
        try {
            var raw = localStorage.getItem(SOT_LAST_SYNC_KEY);
            if (!raw) return 'nunca';
            var dt = new Date(raw);
            if (isNaN(dt.getTime())) return 'nunca';
            return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        } catch (e) {
            return 'nunca';
        }
    }

    function persistLastSyncTimestamp(now) {
        try {
            localStorage.setItem(SOT_LAST_SYNC_KEY, now);
            if (!isSotCloudSyncDisabledByPolicy() && window.firebaseSot && typeof window.firebaseSot.set === 'function') {
                window.firebaseSot.set(SOT_LAST_SYNC_KEY, now).catch(function() {});
            }
        } catch (e) {
            log('warn', 'persistLastSyncTimestamp', e);
        }
    }

    function notifyRefresh() {
        try {
            if (window.parent && window.parent.postMessage) window.parent.postMessage({ type: 'refresh_all_data' }, '*');
        } catch (e) {}
    }

    async function sync(silent, callbacks) {
        callbacks = callbacks || {};
        if (syncInFlight) {
            if (callbacks.onError) callbacks.onError(new Error('Sincronização já em andamento.'));
            return false;
        }
        if (isSotCloudSyncDisabledByPolicy()) {
            if (!silent && callbacks.onError) {
                callbacks.onError(new Error('Modo offline ativo: sincronização com a nuvem está desativada.'));
            }
            return false;
        }
        if (typeof dataService === 'undefined') {
            if (callbacks.onError) callbacks.onError(new Error('Serviço de dados não carregado. Recarregue a página.'));
            return false;
        }
        try {
            await dataService.waitForAPICheck();
        } catch (e) {
            if (callbacks.onError) callbacks.onError(e);
            return false;
        }
        if (!dataService.useFirebase || !window.firebaseSot || typeof window.firebaseSot.get !== 'function' || typeof window.firebaseSot.set !== 'function') {
            if (callbacks.onError) callbacks.onError(new Error('Firebase não está configurado.'));
            return false;
        }
        if (typeof window.firebaseSot.authGateOk === 'function' && !window.firebaseSot.authGateOk()) {
            log('warn', 'sync ignorado: usuário não autenticado no Firebase (login Google necessário).');
            if (!silent && callbacks.onError) callbacks.onError(new Error('Faça login com Google para sincronizar com a nuvem.'));
            return false;
        }

        syncInFlight = true;
        try {
            var lastSyncMs = 0;
            try {
                var rawLast = localStorage.getItem(SOT_LAST_SYNC_KEY);
                var dtLast = rawLast ? new Date(rawLast) : null;
                var t = dtLast && !isNaN(dtLast.getTime()) ? dtLast.getTime() : 0;
                lastSyncMs = t;
            } catch (e) {}

            var pairsDataService = [
                ['saidasAdministrativas', dataService.getSaidasAdministrativas.bind(dataService), dataService.setSaidasAdministrativas.bind(dataService), getLocal('saidasAdministrativas', [])],
                ['saidasAmbulancias', dataService.getSaidasAmbulancias.bind(dataService), dataService.setSaidasAmbulancias.bind(dataService), getLocal('saidasAmbulancias', [])],
                ['viaturasCadastradas', dataService.getViaturas.bind(dataService), function(v) { return dataService.saveViaturas(v); }, getLocal('viaturasCadastradas', [])],
                ['motoristasCadastrados', dataService.getMotoristas.bind(dataService), function(m) { return dataService.saveMotoristas(m); }, getLocal('motoristasCadastrados', [])]
            ];

            for (var i = 0; i < pairsDataService.length; i++) {
                await yieldToUI();
                var p = pairsDataService[i];
                var key = p[0], getFb = p[1], setFb = p[2], localArr = p[3];
                // Saídas: ler direto do Firestore (contorna cache curto do dataService e garante dados da nuvem após F5).
                var remoteBase;
                if ((key === 'saidasAdministrativas' || key === 'saidasAmbulancias') && window.firebaseSot && typeof window.firebaseSot.get === 'function') {
                    var gateOk = typeof window.firebaseSot.authGateOk !== 'function' || window.firebaseSot.authGateOk();
                    if (gateOk) {
                        try {
                            var directRemote = await window.firebaseSot.get(key);
                            if (Array.isArray(directRemote)) {
                                remoteBase = directRemote;
                            }
                        } catch (directErr) {
                            log('warn', 'sync leitura direta ' + key, directErr);
                        }
                    }
                }
                if (remoteBase === undefined) {
                    var fbArr = await getFb();
                    var freshRemote = await getFb();
                    remoteBase = Array.isArray(freshRemote) ? freshRemote : (Array.isArray(fbArr) ? fbArr : []);
                }

                var merged = null;
                if (key === 'saidasAdministrativas' || key === 'saidasAmbulancias') {
                    // Não ressuscitar itens que o remoto não possui.
                    // Mantém apenas itens locais que parecem ter sido criados depois do último sync.
                    var remoteIds = new Set();
                    remoteBase.forEach(function (item) {
                        var id = item && item.id;
                        if (id != null) remoteIds.add(String(id));
                    });

                    var allowedLocalExtras = [];
                    (Array.isArray(localArr) ? localArr : []).forEach(function (item) {
                        if (!item) return;
                        var id = item.id;
                        if (id == null) return;
                        var idStr = String(id);
                        if (remoteIds.has(idStr)) return; // já existe no remoto
                        var ts = getIdTimestampMs(idStr);
                        if (ts != null && ts > lastSyncMs) allowedLocalExtras.push(item);
                    });

                    merged = mergeArraysById(allowedLocalExtras, remoteBase, 'id');
                } else {
                    // Para as outras coleções, mantém a estratégia original (união).
                    merged = mergeArraysById(localArr, remoteBase, 'id');
                }

                setLocal(key, merged);
                await setFb(merged);
            }

            if (window.firebaseSot.get && window.firebaseSot.set) {
                await yieldToUI();
                var localVistorias = mergeArraysById(getLocal('vistoriasRealizadas', []), getLocal('vistorias', []), 'id');
                var fbVist = await window.firebaseSot.get('vistoriasRealizadas');
                if (!Array.isArray(fbVist)) fbVist = [];
                var mergedVist = mergeArraysById(localVistorias, fbVist, 'id');
                var freshVist = await window.firebaseSot.get('vistoriasRealizadas');
                if (Array.isArray(freshVist)) mergedVist = mergeArraysById(mergedVist, freshVist, 'id');
                setLocal('vistoriasRealizadas', mergedVist);
                setLocal('vistorias', mergedVist);
                await window.firebaseSot.set('vistoriasRealizadas', mergedVist);

                var directPairs = [
                    ['abastecimentos', getLocal('abastecimentos', [])],
                    ['avisos', getLocal('avisos', [])],
                    ['lembretes_ativos', getLocal('lembretes_ativos', [])],
                    ['motoristasVistoria', getLocal('motoristasVistoria', [])]
                ];
                for (var j = 0; j < directPairs.length; j++) {
                    await yieldToUI();
                    var dp = directPairs[j];
                    var fbKey = dp[0], localArr2 = dp[1];
                    var local = Array.isArray(localArr2) ? localArr2 : [];
                    var fbArr2 = await window.firebaseSot.get(fbKey);
                    if (!Array.isArray(fbArr2)) fbArr2 = [];
                    var merged2 = mergeArraysById(local, fbArr2, 'id');
                    var fresh2 = await window.firebaseSot.get(fbKey);
                    if (Array.isArray(fresh2)) merged2 = mergeArraysById(merged2, fresh2, 'id');
                    setLocal(fbKey, merged2);
                    await window.firebaseSot.set(fbKey, merged2);
                }

                await yieldToUI();
                var fbEscala = await window.firebaseSot.get('escalaData');
                var localEscala = getLocalEscalaObject();
                fbEscala = fbEscala && typeof fbEscala === 'object' ? fbEscala : {};
                var mergedEscala = Object.assign({}, fbEscala, localEscala);
                var freshEscala = await window.firebaseSot.get('escalaData');
                if (freshEscala && typeof freshEscala === 'object') mergedEscala = Object.assign({}, freshEscala, mergedEscala);
                setLocalEscalaFromObject(mergedEscala);
                try {
                    await window.firebaseSot.set('escalaData', mergedEscala);
                } catch (escalaErr) {
                    // Não abortar toda a sincronização se escalaData tiver formato incompatível (ex.: nested arrays).
                    log('warn', 'sync escalaData (ignorado)', escalaErr);
                }
            }

            if (window.firebaseSot.get && window.firebaseSot.set) {
                var escalaPaoKeys = [
                    { key: 'integrantesEscalaPao', idField: 'id' },
                    { key: 'feriadosEscalaPao', idField: 'data' },
                    { key: 'escalaPaoInsercoes', idField: 'data' }
                ];
                for (var ep = 0; ep < escalaPaoKeys.length; ep++) {
                    await yieldToUI();
                    var ek = escalaPaoKeys[ep];
                    var localEp = getLocal(ek.key, []);
                    var fbEp = await window.firebaseSot.get(ek.key);
                    if (!Array.isArray(localEp)) localEp = [];
                    if (!Array.isArray(fbEp)) fbEp = [];
                    var mergedEp = mergeArraysById(localEp, fbEp, ek.idField);
                    var freshEp = await window.firebaseSot.get(ek.key);
                    if (Array.isArray(freshEp)) mergedEp = mergeArraysById(mergedEp, freshEp, ek.idField);
                    setLocal(ek.key, mergedEp);
                    await window.firebaseSot.set(ek.key, mergedEp);
                }
                await yieldToUI();
                var localDias = getLocal('diasExcluidosEscalaPao', []);
                var fbDias = await window.firebaseSot.get('diasExcluidosEscalaPao');
                if (!Array.isArray(localDias)) localDias = [];
                if (!Array.isArray(fbDias)) fbDias = [];
                var mergedDias = Array.from(new Set([].concat(localDias, fbDias))).sort();
                var freshDias = await window.firebaseSot.get('diasExcluidosEscalaPao');
                if (Array.isArray(freshDias)) mergedDias = Array.from(new Set([].concat(mergedDias, freshDias))).sort();
                setLocal('diasExcluidosEscalaPao', mergedDias);
                await window.firebaseSot.set('diasExcluidosEscalaPao', mergedDias);
                await yieldToUI();
                var localPulados = getLocal('puladosEscalaPao', {});
                var fbPulados = await window.firebaseSot.get('puladosEscalaPao');
                if (!localPulados || typeof localPulados !== 'object') localPulados = {};
                if (!fbPulados || typeof fbPulados !== 'object') fbPulados = {};
                var mergedPulados = Object.assign({}, fbPulados, localPulados);
                var freshPulados = await window.firebaseSot.get('puladosEscalaPao');
                if (freshPulados && typeof freshPulados === 'object') mergedPulados = Object.assign({}, freshPulados, mergedPulados);
                setLocal('puladosEscalaPao', mergedPulados);
                await window.firebaseSot.set('puladosEscalaPao', mergedPulados);
                await yieldToUI();
                var localHist = getLocal('historicoEscalaPao', []);
                var fbHist = await window.firebaseSot.get('historicoEscalaPao');
                if (!Array.isArray(localHist)) localHist = [];
                if (!Array.isArray(fbHist)) fbHist = [];
                var histKey = function (o) { return (o && (o.data + '|' + (o.responsavel || '') + '|' + (o.proximaData || ''))); };
                var byKey = {};
                localHist.forEach(function (h) { var k = histKey(h); if (k) byKey[k] = h; });
                fbHist.forEach(function (h) { var k = histKey(h); if (k && !byKey[k]) byKey[k] = h; });
                var mergedHist = Object.values(byKey);
                var freshHist = await window.firebaseSot.get('historicoEscalaPao');
                if (Array.isArray(freshHist)) freshHist.forEach(function (h) { var k = histKey(h); if (k && !byKey[k]) byKey[k] = h; });
                mergedHist = Object.values(byKey);
                setLocal('historicoEscalaPao', mergedHist);
                await window.firebaseSot.set('historicoEscalaPao', mergedHist);
                await yieldToUI();
                var localUltimo = parseInt(getLocal('ultimoIndiceEscala', '0'), 10) || 0;
                var fbUltimo = await window.firebaseSot.get('ultimoIndiceEscala');
                var numFb = parseInt(fbUltimo, 10);
                if (isNaN(numFb)) numFb = 0;
                var mergedUltimo = Math.max(localUltimo, numFb);
                setLocal('ultimoIndiceEscala', String(mergedUltimo));
                await window.firebaseSot.set('ultimoIndiceEscala', mergedUltimo);
                var localRef = getLocal('escalaPaoDataReferencia', '');
                var fbRef = await window.firebaseSot.get('escalaPaoDataReferencia');
                var pickRef = function (a, b) {
                    if (!a || !b) return a || b || '';
                    var da = new Date(a), db = new Date(b);
                    return (da.getTime() >= db.getTime()) ? a : b;
                };
                var mergedRef = pickRef(localRef, fbRef);
                var freshRef = await window.firebaseSot.get('escalaPaoDataReferencia');
                mergedRef = pickRef(mergedRef, freshRef || '');
                if (mergedRef) setLocal('escalaPaoDataReferencia', mergedRef);
                if (mergedRef) await window.firebaseSot.set('escalaPaoDataReferencia', mergedRef);
            }

            var now = new Date().toISOString();
            persistLastSyncTimestamp(now);
            if (!silent && callbacks.onSuccess) callbacks.onSuccess();
            if (callbacks.afterSync) callbacks.afterSync();
            notifyRefresh();
            return true;
        } catch (err) {
            log('error', 'sync', err);
            if (callbacks.onError) callbacks.onError(err);
            return false;
        } finally {
            syncInFlight = false;
        }
    }

    async function runAutoSync() {
        if (!navigator.onLine) return;
        try {
            if (typeof dataService === 'undefined') return;
            await dataService.waitForAPICheck();
            if (!dataService.useFirebase) return;
            await sync(true, { afterSync: notifyRefresh });
        } catch (e) {
            log('warn', 'runAutoSync', e);
        }
    }

    window.SOTSync = {
        LAST_SYNC_KEY: SOT_LAST_SYNC_KEY,
        getLastSyncDisplay: getLastSyncDisplay,
        sync: sync,
        runAutoSync: runAutoSync,
        AUTO_SYNC_INTERVAL_MS: AUTO_SYNC_INTERVAL_MS
    };
})();
