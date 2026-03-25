/**
 * Modo online/offline SOT (localStorage sot_offline_mode) — mesma lógica que existia em Configurações.
 * Usado em Cadastro de Saídas, Saídas Administrativas, Saídas de Ambulâncias e importações em Config.
 */
(function (global) {
    'use strict';

    function notify(msg, type) {
        type = type || 'info';
        try {
            if (typeof global.showGerenciamentoMessage === 'function') {
                global.showGerenciamentoMessage(msg, type);
                return;
            }
        } catch (e) {}
        try {
            if (typeof global.showProcessMessage === 'function') {
                global.showProcessMessage(msg, type);
                return;
            }
        } catch (e2) {}
        try {
            if (typeof global.showAmbNotice === 'function') {
                global.showAmbNotice(msg, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
                return;
            }
        } catch (e3) {}
        try {
            alert(msg);
        } catch (e4) {}
    }

    function dispatchModeChanged() {
        try {
            global.dispatchEvent(new CustomEvent('sot-connection-mode-changed'));
        } catch (e) {}
    }

    function audit(event, payload) {
        try {
            if (typeof global.recordUsuarioAudit === 'function') {
                global.recordUsuarioAudit(event, payload);
            }
        } catch (e) {}
    }

    function sotConfigFirebaseCloudWritesDisabled() {
        try {
            return !!(global.firebaseSot && typeof global.firebaseSot.isOfflineMode === 'function' && global.firebaseSot.isOfflineMode());
        } catch (e) {
            return false;
        }
    }

    function waitForParentBackupFlush(timeoutMs) {
        var timeout = typeof timeoutMs === 'number' ? timeoutMs : 10000;
        return new Promise(function (resolve) {
            if (global.parent === global) {
                resolve({ ok: true, standalone: true });
                return;
            }
            var requestId = 'sot_bak_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
            var settled = false;
            function finish(result) {
                if (settled) return;
                settled = true;
                global.removeEventListener('message', onMsg);
                clearTimeout(timer);
                resolve(result);
            }
            function onMsg(ev) {
                if (ev.data && ev.data.type === 'sot_prepare_backup_done' && ev.data.requestId === requestId) {
                    finish({ ok: true, standalone: false });
                }
            }
            var timer = setTimeout(function () {
                finish({ ok: false, standalone: false, timedOut: true });
            }, timeout);
            global.addEventListener('message', onMsg);
            try {
                global.parent.postMessage({ type: 'sot_prepare_backup', requestId: requestId }, '*');
            } catch (e) {
                finish({ ok: false, standalone: false, error: String(e) });
            }
        });
    }

    function readVtrOficinaIndexedDBAll() {
        return new Promise(function (resolve, reject) {
            var DB_NAME = 'SOT_VTR_Oficina';
            var STORE = 'registros';
            var req = indexedDB.open(DB_NAME, 1);
            req.onerror = function () {
                reject(req.error);
            };
            req.onupgradeneeded = function (ev) {
                var db = ev.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.close();
                    resolve([]);
                    return;
                }
                var tx = db.transaction([STORE], 'readonly');
                var st = tx.objectStore(STORE);
                var gr = st.getAll();
                gr.onerror = function () {
                    db.close();
                    reject(gr.error);
                };
                gr.onsuccess = function () {
                    db.close();
                    resolve(Array.isArray(gr.result) ? gr.result : []);
                };
            };
        });
    }

    function consolidateLocalVtrOficinaIntoStorage(idbRows) {
        if (!global.sotDataMerge || typeof global.sotDataMerge.mergeArraysCloudPrimary !== 'function') return 0;
        var m = global.sotDataMerge.mergeArraysCloudPrimary;
        var fromLs = [];
        try {
            var raw = localStorage.getItem('vtr_oficina_registros');
            if (raw) fromLs = JSON.parse(raw);
        } catch (e) {
            fromLs = [];
        }
        if (!Array.isArray(fromLs)) fromLs = [];
        var idb = Array.isArray(idbRows) ? idbRows : [];
        var pool = m(idb, fromLs, 'id');
        try {
            localStorage.setItem('vtr_oficina_registros', JSON.stringify(pool));
        } catch (e2) {
            console.warn('consolidateLocalVtrOficinaIntoStorage', e2);
        }
        return pool.length;
    }

    function normalizeVistoriasLocalStorageForMerge() {
        if (!global.sotDataMerge || typeof global.sotDataMerge.mergeArraysCloudPrimary !== 'function') return;
        var m = global.sotDataMerge.mergeArraysCloudPrimary;
        var a = [];
        var b = [];
        try {
            a = JSON.parse(localStorage.getItem('vistoriasRealizadas') || '[]');
        } catch (e) {
            a = [];
        }
        try {
            b = JSON.parse(localStorage.getItem('vistorias') || '[]');
        } catch (e2) {
            b = [];
        }
        if (!Array.isArray(a)) a = [];
        if (!Array.isArray(b)) b = [];
        var union = m(a, b, 'id');
        try {
            localStorage.setItem('vistoriasRealizadas', JSON.stringify(union));
            localStorage.setItem('vistorias', JSON.stringify(union));
        } catch (e3) {}
    }

    function syncVtrOficinaIndexedDB(importedData) {
        function idbErrToMessage(prefix, domErr) {
            var parts = [prefix];
            if (domErr && domErr.name) parts.push(domErr.name);
            if (domErr && domErr.message) parts.push(domErr.message);
            if (parts.length === 1) parts.push('motivo desconhecido');
            return parts.join(': ');
        }
        return new Promise(function (resolve, reject) {
            var DB_NAME = 'SOT_VTR_Oficina';
            var STORE = 'registros';
            var list = [];
            if (Object.prototype.hasOwnProperty.call(importedData, 'vtr_oficina_registros')) {
                var raw = importedData.vtr_oficina_registros;
                if (raw == null) {
                    list = [];
                } else if (typeof raw === 'string') {
                    try {
                        var p = JSON.parse(raw);
                        list = Array.isArray(p) ? p : [];
                    } catch (_) {
                        list = [];
                    }
                } else if (Array.isArray(raw)) {
                    list = raw;
                } else {
                    list = [];
                }
            }
            var req = indexedDB.open(DB_NAME, 1);
            req.onerror = function () {
                reject(new Error(idbErrToMessage('Falha ao abrir IndexedDB (VTR Oficina)', req.error)));
            };
            req.onupgradeneeded = function (ev) {
                var db = ev.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = function () {
                var db = req.result;
                var tx = db.transaction([STORE], 'readwrite');
                var store = tx.objectStore(STORE);
                var clearReq = store.clear();
                clearReq.onerror = function () {
                    try {
                        db.close();
                    } catch (e) {}
                    reject(new Error(idbErrToMessage('Falha ao limpar registos VTR Oficina no IndexedDB', clearReq.error)));
                };
                clearReq.onsuccess = function () {
                    list.forEach(function (reg) {
                        if (reg && typeof reg === 'object') store.put(reg);
                    });
                };
                tx.oncomplete = function () {
                    db.close();
                    resolve(list.length);
                };
                tx.onabort = function () {
                    try {
                        db.close();
                    } catch (e) {}
                    reject(new Error('Transação IndexedDB (VTR Oficina) foi abortada.'));
                };
                tx.onerror = function () {
                    try {
                        db.close();
                    } catch (e) {}
                    reject(new Error(idbErrToMessage('Falha na transação IndexedDB (VTR Oficina)', tx.error)));
                };
            };
        });
    }

    async function syncOfflineReturnMergeToCloud() {
        var fs = global.firebaseSot;
        if (!fs || typeof fs.get !== 'function' || typeof fs.set !== 'function') {
            throw new Error('Firebase SOT indisponível.');
        }
        if (typeof fs.isOfflineMode === 'function' && fs.isOfflineMode()) {
            throw new Error('Modo offline SOT ativo: mesclagem com a nuvem não está disponível.');
        }
        if (!global.sotDataMerge || typeof global.sotDataMerge.mergeArraysCloudPrimary !== 'function') {
            throw new Error('Utilitário de mesclagem (sotDataMerge) não disponível.');
        }
        var m = global.sotDataMerge.mergeArraysCloudPrimary;

        async function mergeArr(key, idField) {
            idField = idField || 'id';
            var local = [];
            try {
                var raw = localStorage.getItem(key);
                if (raw != null && raw !== '') local = JSON.parse(raw);
            } catch (e) {
                local = [];
            }
            if (!Array.isArray(local)) local = [];
            var remote = [];
            try {
                var r = await fs.get(key);
                remote = Array.isArray(r) ? r : [];
            } catch (e2) {
                remote = [];
            }
            var merged = m(remote, local, idField);
            await fs.set(key, merged);
            localStorage.setItem(key, JSON.stringify(merged));
            return merged.length;
        }

        normalizeVistoriasLocalStorageForMerge();

        var arrayPairs = [
            ['saidasAdministrativas', 'id'],
            ['saidasAmbulancias', 'id'],
            ['viaturasCadastradas', 'id'],
            ['motoristasCadastrados', 'id'],
            ['vistoriasRealizadas', 'id'],
            ['abastecimentos', 'id'],
            ['avisos', 'id'],
            ['lembretes_ativos', 'id'],
            ['motoristasVistoria', 'id'],
            ['integrantesEscalaPao', 'id'],
            ['feriadosEscalaPao', 'data'],
            ['escalaPaoInsercoes', 'data'],
            ['historicoEscalaPao', 'id']
        ];
        for (var i = 0; i < arrayPairs.length; i++) {
            await mergeArr(arrayPairs[i][0], arrayPairs[i][1]);
        }

        var localDias = [];
        var remoteDias = [];
        try {
            localDias = JSON.parse(localStorage.getItem('diasExcluidosEscalaPao') || '[]');
        } catch (e) {
            localDias = [];
        }
        try {
            var rd = await fs.get('diasExcluidosEscalaPao');
            remoteDias = Array.isArray(rd) ? rd : [];
        } catch (e2) {
            remoteDias = [];
        }
        if (!Array.isArray(localDias)) localDias = [];
        var diasMerged = Array.from(new Set([].concat(remoteDias, localDias))).sort();
        await fs.set('diasExcluidosEscalaPao', diasMerged);
        localStorage.setItem('diasExcluidosEscalaPao', JSON.stringify(diasMerged));

        var localP = {};
        var remoteP = {};
        try {
            localP = JSON.parse(localStorage.getItem('puladosEscalaPao') || '{}');
        } catch (e) {
            localP = {};
        }
        try {
            var rp = await fs.get('puladosEscalaPao');
            if (rp && typeof rp === 'object' && !Array.isArray(rp)) remoteP = rp;
        } catch (e2) {
            remoteP = {};
        }
        var puladosMerged = Object.assign({}, remoteP, localP);
        await fs.set('puladosEscalaPao', puladosMerged);
        localStorage.setItem('puladosEscalaPao', JSON.stringify(puladosMerged));

        var localE = {};
        var remoteE = {};
        try {
            var rawE = localStorage.getItem('escalaData');
            if (rawE) localE = JSON.parse(rawE);
        } catch (e) {
            localE = {};
        }
        if (!localE || typeof localE !== 'object' || Array.isArray(localE)) localE = {};
        try {
            var re = await fs.get('escalaData');
            if (re && typeof re === 'object' && !Array.isArray(re)) remoteE = re;
        } catch (e2) {
            remoteE = {};
        }
        var escalaMerged = Object.assign({}, remoteE, localE);
        await fs.set('escalaData', escalaMerged);
        localStorage.setItem('escalaData', JSON.stringify(escalaMerged));
        Object.keys(escalaMerged).forEach(function (mk) {
            if (/^\d{4}-\d{2}$/.test(mk)) {
                try {
                    localStorage.setItem(mk, JSON.stringify(escalaMerged[mk]));
                } catch (e) {}
            }
        });

        var lu = null;
        var ru = null;
        try {
            lu = JSON.parse(localStorage.getItem('ultimoIndiceEscala') || 'null');
        } catch (e) {
            lu = null;
        }
        try {
            ru = await fs.get('ultimoIndiceEscala');
        } catch (e2) {
            ru = null;
        }
        var nu = Math.max(parseInt(lu, 10) || 0, parseInt(ru, 10) || 0);
        await fs.set('ultimoIndiceEscala', nu);
        localStorage.setItem('ultimoIndiceEscala', JSON.stringify(nu));

        var lref = '';
        var rref = '';
        try {
            lref = String(localStorage.getItem('escalaPaoDataReferencia') || '');
        } catch (e) {
            lref = '';
        }
        try {
            var rr = await fs.get('escalaPaoDataReferencia');
            rref = rr != null ? String(rr) : '';
        } catch (e2) {
            rref = '';
        }
        var pickNewer = function (a, b) {
            if (!a) return b || '';
            if (!b) return a || '';
            var da = new Date(a);
            var db = new Date(b);
            if (isNaN(da.getTime())) return b || a;
            if (isNaN(db.getTime())) return a || b;
            return db.getTime() >= da.getTime() ? b : a;
        };
        var refMerged = pickNewer(rref, lref);
        if (refMerged) {
            await fs.set('escalaPaoDataReferencia', refMerged);
            localStorage.setItem('escalaPaoDataReferencia', refMerged);
        }

        var objectKeys = ['equipamentosSuprimentos', 'equipamentosMovements', 'equipamentosTabOrder', 'cadastroItensPersonalizados'];
        for (var j = 0; j < objectKeys.length; j++) {
            var ok = objectKeys[j];
            var lo = null;
            var ro = null;
            try {
                var rawO = localStorage.getItem(ok);
                if (rawO) lo = JSON.parse(rawO);
            } catch (e) {
                lo = null;
            }
            try {
                ro = await fs.get(ok);
            } catch (e2) {
                ro = null;
            }
            if (lo == null && ro == null) continue;
            var lObj = lo && typeof lo === 'object' && !Array.isArray(lo) ? lo : {};
            var rObj = ro && typeof ro === 'object' && !Array.isArray(ro) ? ro : {};
            var obMerged = Object.assign({}, rObj, lObj);
            await fs.set(ok, obMerged);
            localStorage.setItem(ok, JSON.stringify(obMerged));
        }

        await mergeArr('vtr_oficina_registros', 'id');

        if (typeof global.dataService !== 'undefined' && typeof global.dataService.clearFirebaseReadCache === 'function') {
            global.dataService.clearFirebaseReadCache();
        }
        if (typeof fs.invalidateAllCache === 'function') fs.invalidateAllCache();
    }

    function updateChip(chipTextId) {
        if (!chipTextId) return;
        var el = document.getElementById(chipTextId);
        if (!el) return;
        var off = false;
        try {
            off = localStorage.getItem('sot_offline_mode') === 'true';
        } catch (e) {}
        el.textContent = off ? 'Offline SOT (só local)' : 'Online SOT (Firebase)';
    }

    function activateOfflineMode(opts) {
        opts = opts || {};
        if (typeof global.dataService === 'undefined') {
            notify('Serviço de dados não carregado. Recarregue a página.', 'error');
            return;
        }
        try {
            if (global.SOTOfflineMode && typeof global.SOTOfflineMode.setPersistedOffline === 'function') {
                global.SOTOfflineMode.setPersistedOffline(true);
            } else {
                localStorage.setItem('sot_offline_mode', 'true');
                if (global.SOTOfflineMode && typeof global.SOTOfflineMode.refreshFlag === 'function') {
                    global.SOTOfflineMode.refreshFlag();
                }
            }
        } catch (e) {
            notify('Não foi possível ativar o modo offline.', 'error');
            return;
        }
        try {
            global.dataService.setPreferLocalStorage(true);
        } catch (e2) {}
        updateChip(opts.chipTextId);
        dispatchModeChanged();
        notify(
            'Modo offline ativo: apenas dados locais. Firebase bloqueado. A recarregar…',
            'success'
        );
        audit('sot_modo_offline_ativado', { source: opts.auditSource || 'sot-connection-mode.js' });
        setTimeout(function () {
            try {
                if (global.parent && global.parent.postMessage) global.parent.postMessage({ type: 'reload_required' }, '*');
            } catch (e) {}
        }, 900);
    }

    async function activateOnlineMode(opts) {
        opts = opts || {};
        var onlineBtn = opts.onlineBtnId ? document.getElementById(opts.onlineBtnId) : null;
        var originalHtml = onlineBtn ? onlineBtn.innerHTML : '';

        if (typeof global.dataService === 'undefined') {
            notify('Serviço de dados não carregado. Recarregue a página.', 'error');
            return;
        }
        if (!navigator.onLine) {
            notify('Sem internet. Conecte-se para carregar os dados do Firebase.', 'error');
            return;
        }

        if (onlineBtn) {
            onlineBtn.disabled = true;
            onlineBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando…';
        }
        try {
            if (!global.sotDataMerge || typeof global.sotDataMerge.mergeArraysCloudPrimary !== 'function') {
                throw new Error('Módulo de mesclagem não disponível. Recarregue a página.');
            }

            if (global.parent !== global) {
                var flushResult = await waitForParentBackupFlush(12000);
                if (!flushResult.ok && !flushResult.standalone) {
                    console.warn('Modo online: flush das abas atrasou ou falhou.', flushResult);
                }
            }

            var idbVtrRows = await readVtrOficinaIndexedDBAll();
            consolidateLocalVtrOficinaIntoStorage(idbVtrRows);
            normalizeVistoriasLocalStorageForMerge();

            try {
                if (global.SOTOfflineMode && typeof global.SOTOfflineMode.setPersistedOffline === 'function') {
                    global.SOTOfflineMode.setPersistedOffline(false);
                } else {
                    localStorage.setItem('sot_offline_mode', 'false');
                }
            } catch (e) {}

            global.dataService.setPreferLocalStorage(false);
            if (global.firebaseSot && typeof global.firebaseSot.invalidateAllCache === 'function') {
                global.firebaseSot.invalidateAllCache();
            }
            await global.dataService.waitForAPICheck();
            if (typeof global.dataService.waitForGoogleAuthReady === 'function') {
                await global.dataService.waitForGoogleAuthReady(20000);
            }

            await syncOfflineReturnMergeToCloud();

            try {
                var rawVtr = localStorage.getItem('vtr_oficina_registros');
                var parsedVtr = rawVtr ? JSON.parse(rawVtr) : [];
                await syncVtrOficinaIndexedDB({
                    vtr_oficina_registros: Array.isArray(parsedVtr) ? parsedVtr : []
                });
            } catch (vtrSyncErr) {
                console.warn('Espelhar VTR Oficina no IndexedDB após retorno online:', vtrSyncErr);
            }

            try {
                var nowIso = new Date().toISOString();
                localStorage.setItem('sot_last_sync_timestamp', nowIso);
                if (global.firebaseSot && typeof global.firebaseSot.set === 'function' && !sotConfigFirebaseCloudWritesDisabled()) {
                    await global.firebaseSot.set('sot_last_sync_timestamp', nowIso);
                }
            } catch (tsErr) {
                console.warn('Timestamp de sincronização:', tsErr);
            }

            if (global.SOTSync && typeof global.SOTSync.persistOfflineModeToCloud === 'function') {
                global.SOTSync.persistOfflineModeToCloud();
            }

            updateChip(opts.chipTextId);
            dispatchModeChanged();

            audit('sot_modo_online_merge_firebase', { source: opts.auditSource || 'sot-connection-mode.js' });
            notify('Modo online: dados fundidos com o Firebase. A atualizar abas…', 'success');
            setTimeout(function () {
                try {
                    if (global.parent && global.parent.postMessage) {
                        global.parent.postMessage({ type: 'refresh_all_data' }, '*');
                    }
                } catch (e) {}
            }, 350);
        } catch (e) {
            console.error('Falha ao carregar dados do Firebase para local:', e);
            notify('Erro ao carregar dados da nuvem. Verifique conexão/permissões.', 'error');
        } finally {
            if (onlineBtn) {
                onlineBtn.disabled = false;
                onlineBtn.innerHTML = originalHtml;
            }
        }
    }

    function install(opts) {
        opts = opts || {};
        var offId = opts.offlineBtnId;
        var onId = opts.onlineBtnId;
        var chipId = opts.chipTextId;
        var offBtn = offId ? document.getElementById(offId) : null;
        var onBtn = onId ? document.getElementById(onId) : null;

        function refresh() {
            updateChip(chipId);
        }
        refresh();
        global.addEventListener('storage', function (ev) {
            if (ev && ev.key === 'sot_offline_mode') refresh();
        });
        global.addEventListener('sot-connection-mode-changed', function () {
            refresh();
        });

        if (offBtn) {
            offBtn.addEventListener('click', function () {
                activateOfflineMode(opts);
            });
        }
        if (onBtn) {
            onBtn.addEventListener('click', function () {
                activateOnlineMode(opts);
            });
        }
    }

    global.SOTConnectionMode = {
        waitForParentBackupFlush: waitForParentBackupFlush,
        readVtrOficinaIndexedDBAll: readVtrOficinaIndexedDBAll,
        consolidateLocalVtrOficinaIntoStorage: consolidateLocalVtrOficinaIntoStorage,
        normalizeVistoriasLocalStorageForMerge: normalizeVistoriasLocalStorageForMerge,
        syncVtrOficinaIndexedDB: syncVtrOficinaIndexedDB,
        syncOfflineReturnMergeToCloud: syncOfflineReturnMergeToCloud,
        activateOfflineMode: activateOfflineMode,
        activateOnlineMode: activateOnlineMode,
        install: install,
        updateChip: updateChip
    };
})(typeof window !== 'undefined' ? window : self);
