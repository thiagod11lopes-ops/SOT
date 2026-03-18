/**
 * Sincronização bidirecional localStorage ↔ Firebase.
 * Regra: Firebase NUNCA perde dados. Sempre usamos UNIÃO (local + Firebase): o Firebase mantém o que tem e só recebe dados novos do localStorage. Se o localStorage for apagado, o sync repõe o local a partir do Firebase.
 */
(function() {
    'use strict';
    var SOT_LAST_SYNC_KEY = 'sot_last_sync_timestamp';
    var AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

    function mergeArraysById(local, remote, idField) {
        idField = idField || 'id';
        if (!Array.isArray(local)) local = [];
        if (!Array.isArray(remote)) remote = [];
        var byId = new Map();
        // Preferir o "remote" em conflitos (mesmo id).
        // Isso impede que uma versão antiga no localStorage sobrescreva o Firebase
        // quando ocorrer sincronização após atualizações no app.
        remote.forEach(function(item) {
            var id = item && item[idField];
            if (id != null) byId.set(String(id), item);
        });
        local.forEach(function(item) {
            var id = item && item[idField];
            if (id != null && !byId.has(String(id))) byId.set(String(id), item);
        });
        return Array.from(byId.values());
    }

    function getLocalEscalaObject() {
        var out = {};
        var re = /^\d{4}-\d{2}$/;
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && re.test(key)) {
                try {
                    var v = localStorage.getItem(key);
                    if (v) out[key] = JSON.parse(v);
                } catch (e) {}
            }
        }
        return out;
    }

    function setLocalEscalaFromObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(function(key) {
            localStorage.setItem(key, JSON.stringify(obj[key]));
        });
    }

    /**
     * Retorna o texto da última sincronização para exibição (ex.: "23/02/2026, 14:30" ou "nunca").
     */
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

    /**
     * Sincronização bidirecional: mescla dados do localStorage e do Firebase nos dois sentidos.
     * @param {boolean} silent - se true, não dispara onSuccess
     * @param {object} callbacks - opcional: { onSuccess, onError, afterSync }
     * @returns {Promise<boolean>}
     */
    async function sync(silent, callbacks) {
        callbacks = callbacks || {};
        if (typeof dataService === 'undefined') {
            if (callbacks.onError) callbacks.onError(new Error('Serviço de dados não carregado. Recarregue a página.'));
            return false;
        }
        await dataService.waitForAPICheck();
        if (!dataService.useFirebase || !window.firebaseSot || typeof window.firebaseSot.get !== 'function' || typeof window.firebaseSot.set !== 'function') {
            if (callbacks.onError) callbacks.onError(new Error('Firebase não está configurado.'));
            return false;
        }
        var get = function(key, def) {
            try {
                var v = localStorage.getItem(key);
                return v ? JSON.parse(v) : def;
            } catch (e) {
                return def;
            }
        };
        var setLocal = function(key, val) {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        };

        try {
            // União em todas as coleções: Firebase nunca perde dados; só recebe novos do local. Se o local estiver vazio, repõe a partir do Firebase.
            var pairsDataService = [
                ['saidasAdministrativas', dataService.getSaidasAdministrativas.bind(dataService), dataService.setSaidasAdministrativas.bind(dataService), get('saidasAdministrativas', [])],
                ['saidasAmbulancias', dataService.getSaidasAmbulancias.bind(dataService), dataService.setSaidasAmbulancias.bind(dataService), get('saidasAmbulancias', [])],
                ['viaturasCadastradas', dataService.getViaturas.bind(dataService), function(v) { return dataService.saveViaturas(v); }, get('viaturasCadastradas', [])],
                ['motoristasCadastrados', dataService.getMotoristas.bind(dataService), function(m) { return dataService.saveMotoristas(m); }, get('motoristasCadastrados', [])]
            ];
            for (var i = 0; i < pairsDataService.length; i++) {
                var p = pairsDataService[i];
                var key = p[0], getFb = p[1], setFb = p[2], localArr = p[3];
                var fbArr = await getFb();
                var merged = mergeArraysById(localArr, Array.isArray(fbArr) ? fbArr : [], 'id');
                setLocal(key, merged);
                await setFb(merged);
            }

            if (window.firebaseSot && window.firebaseSot.get && window.firebaseSot.set) {
                var localVistorias = mergeArraysById(get('vistoriasRealizadas', []), get('vistorias', []), 'id');
                var fbVist = await window.firebaseSot.get('vistoriasRealizadas');
                if (!Array.isArray(fbVist)) fbVist = [];
                var mergedVist = mergeArraysById(localVistorias, fbVist, 'id');
                setLocal('vistoriasRealizadas', mergedVist);
                setLocal('vistorias', mergedVist);
                await window.firebaseSot.set('vistoriasRealizadas', mergedVist);

                var directPairs = [
                    ['abastecimentos', get('abastecimentos', [])],
                    ['avisos', get('avisos', [])],
                    ['lembretes_ativos', get('lembretes_ativos', [])],
                    ['motoristasVistoria', get('motoristasVistoria', [])]
                ];
                for (var j = 0; j < directPairs.length; j++) {
                    var dp = directPairs[j];
                    var fbKey = dp[0], localArr2 = dp[1];
                    var local = Array.isArray(localArr2) ? localArr2 : [];
                    var fbArr2 = await window.firebaseSot.get(fbKey);
                    if (!Array.isArray(fbArr2)) fbArr2 = [];
                    var merged2 = mergeArraysById(local, fbArr2, 'id');
                    setLocal(fbKey, merged2);
                    await window.firebaseSot.set(fbKey, merged2);
                }

                // Escala: união de chaves (meses) — Firebase mantém o que tem; local pode ser reposto
                var fbEscala = await window.firebaseSot.get('escalaData');
                var localEscala = getLocalEscalaObject();
                fbEscala = fbEscala && typeof fbEscala === 'object' ? fbEscala : {};
                var mergedEscala = Object.assign({}, fbEscala, localEscala);
                setLocalEscalaFromObject(mergedEscala);
                await window.firebaseSot.set('escalaData', mergedEscala);
            }

            var now = new Date().toISOString();
            localStorage.setItem(SOT_LAST_SYNC_KEY, now);
            try {
                if (window.firebaseSot.set) await window.firebaseSot.set(SOT_LAST_SYNC_KEY, now);
            } catch (e) {}
            if (!silent && callbacks.onSuccess) callbacks.onSuccess();
            if (callbacks.afterSync) callbacks.afterSync();
            if (window.parent && window.parent.postMessage) window.parent.postMessage({ type: 'refresh_all_data' }, '*');
            return true;
        } catch (err) {
            console.error('Erro na sincronização:', err);
            if (callbacks.onError) callbacks.onError(err);
            return false;
        }
    }

    /**
     * Executa sincronização automática quando o sistema está online (para ser chamado pelo SOT5).
     */
    async function runAutoSync() {
        if (!navigator.onLine) return;
        try {
            if (typeof dataService === 'undefined') return;
            await dataService.waitForAPICheck();
            if (!dataService.useFirebase) return;
            await sync(true, {
                afterSync: function() {
                    if (window.parent && window.parent.postMessage) window.parent.postMessage({ type: 'refresh_all_data' }, '*');
                }
            });
        } catch (e) {
            console.warn('Auto-sync:', e);
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
