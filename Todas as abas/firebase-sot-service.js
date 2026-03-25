/**
 * Serviço Firebase para dados do SOT (Firestore).
 * Usado pelo data-service.js para ler/gravar saídas, viaturas, motoristas, etc.
 * Inclui cache com TTL e coalescência de requisições concorrentes.
 *
 * C3 — Modo offline SOT (localStorage sot_offline_mode === 'true'):
 * get, set, getConfig e setConfig não acedem à rede; set/setConfig resolvem com false.
 * É a única fonte de verdade para “nuvem desligada por política”. A UI deve usar
 * firebaseSot.isOfflineMode() antes de chamar set quando quiser evitar trabalho inútil;
 * não há segundo critério paralelo (ex.: outro flag global) para o mesmo efeito.
 *
 * Segurança: regras Firestore (ex.: firestore.rules no repositório) são a última linha de
 * defesa. authGateOk / modo offline aqui são UX e economia de rede, não substitutos de regras.
 *
 * Depende de: firebase-config.js (e dos scripts firebase-app e firebase-firestore).
 */
(function() {
    'use strict';

    const COL = 'sot_data';
    const CACHE_TTL_MS = 60 * 1000; // 1 minuto: reduz leituras repetidas ao Firestore
    const LOG_PREFIX = '[firebase-sot]';

    function isSotOfflineModeActive() {
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem('sot_offline_mode') === 'true';
        } catch (e) {
            return false;
        }
    }
    /** Item 13 Quadro: evitar serializar objetos grandes na consola. */
    const LOG_DETAIL_MAX_LEN = 320;

    /**
     * Opção A (produção): não acessar sot_data sem Firebase Auth quando as regras exigem request.auth.
     * Defina window.SOT_FIRESTORE_REQUIRE_AUTH = false só para depuração local.
     */
    function authGateAllowsFirestore() {
        if (window.SOT_FIRESTORE_REQUIRE_AUTH === false) return true;
        try {
            if (window.top && window.top._sot_google_signed_in) return true;
        } catch (e) {}
        if (window._sot_google_signed_in) return true;
        try {
            var fb = firebaseApp();
            if (fb && fb.auth && typeof fb.auth === 'function' && fb.auth().currentUser) return true;
        } catch (e2) {}
        return false;
    }

    /** Cache em memória: key -> { value, expiresAt } */
    const cache = new Map();
    /** Requisições em voo: key -> Promise, para coalescência */
    const inFlightGets = new Map();
    const inFlightSets = new Map();

    function formatLogDetail(detail) {
        if (detail == null) return '';
        var t = typeof detail;
        if (t === 'string') {
            return detail.length > LOG_DETAIL_MAX_LEN ? detail.slice(0, LOG_DETAIL_MAX_LEN) + '…' : detail;
        }
        if (t === 'number' || t === 'boolean') return String(detail);
        if (detail instanceof Error) {
            var em = detail.message || String(detail);
            return em.length > LOG_DETAIL_MAX_LEN ? em.slice(0, LOG_DETAIL_MAX_LEN) + '…' : em;
        }
        if (t === 'object') {
            var code = detail.code != null ? String(detail.code) : '';
            var msg = detail.message != null ? String(detail.message) : '';
            if (code || msg) {
                var pair = (code ? code : '') + (code && msg ? ' ' : '') + (msg || '');
                return pair.length > LOG_DETAIL_MAX_LEN ? pair.slice(0, LOG_DETAIL_MAX_LEN) + '…' : pair;
            }
            try {
                var j = JSON.stringify(detail);
                if (j.length > LOG_DETAIL_MAX_LEN) return j.slice(0, LOG_DETAIL_MAX_LEN) + '…';
                return j;
            } catch (e) {
                return '[Object]';
            }
        }
        var s = String(detail);
        return s.length > LOG_DETAIL_MAX_LEN ? s.slice(0, LOG_DETAIL_MAX_LEN) + '…' : s;
    }

    function log(level, message, detail) {
        try {
            var extra = formatLogDetail(detail);
            var msg = extra ? message + ' ' + extra : message;
            if (level === 'warn') console.warn(LOG_PREFIX, msg);
            else if (level === 'error') console.error(LOG_PREFIX, msg);
            else console.debug(LOG_PREFIX, msg);
        } catch (e) {}
    }

    function db() {
        try {
            return typeof window.firebaseDb !== 'undefined' ? window.firebaseDb : null;
        } catch (e) {
            return null;
        }
    }

    function firebaseApp() {
        try {
            return typeof firebase !== 'undefined' ? firebase : null;
        } catch (e) {
            return null;
        }
    }

    /** Firestore não aceita arrays aninhados (ex.: escalaData). */
    function valueNeedsJsonBlob(value) {
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) {
            if (value.some(function(item) { return Array.isArray(item); })) return true;
            return value.some(function(item) {
                return item !== null && typeof item === 'object' && valueNeedsJsonBlob(item);
            });
        }
        if (typeof value === 'object') {
            for (var k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k) && valueNeedsJsonBlob(value[k])) return true;
            }
        }
        return false;
    }

    /** Fase 7: geração optimista (saidasAdministrativas / saidasAmbulancias). */
    var docGenByKey = new Map();
    var SOT_F7_GENERATION_KEYS = { saidasAdministrativas: true, saidasAmbulancias: true };

    function readSotDocGenerationFromData(data) {
        if (!data || typeof data !== 'object') return 0;
        var g = data.sotDocGeneration;
        if (typeof g === 'number' && !isNaN(g) && g >= 0) return Math.floor(g);
        return 0;
    }

    function rememberDocGenerationForKey(keyStr, data) {
        if (!SOT_F7_GENERATION_KEYS[keyStr]) return;
        docGenByKey.set(keyStr, readSotDocGenerationFromData(data));
    }

    function buildPayloadWithSotDocGen(value, ts, nextGen) {
        var payload;
        if (valueNeedsJsonBlob(value)) {
            payload = ts
                ? { _sotJsonV1: true, body: JSON.stringify(value), updatedAt: ts, sotDocGeneration: nextGen }
                : { _sotJsonV1: true, body: JSON.stringify(value), sotDocGeneration: nextGen };
        } else if (Array.isArray(value)) {
            payload = ts ? { items: value, updatedAt: ts, sotDocGeneration: nextGen } : { items: value, sotDocGeneration: nextGen };
        } else {
            payload = ts ? { data: value, updatedAt: ts, sotDocGeneration: nextGen } : { data: value, sotDocGeneration: nextGen };
        }
        return payload;
    }

    /** Remove entrada do cache (chamado após set para manter consistência). */
    function invalidateCache(key) {
        try {
            var ks = String(key);
            cache.delete(ks);
            docGenByKey.delete(ks);
        } catch (e) {}
    }

    /** Retorna valor do cache se válido; caso contrário null. */
    function getCached(key) {
        try {
            const entry = cache.get(String(key));
            if (!entry) return null;
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                cache.delete(String(key));
                return null;
            }
            return entry.value;
        } catch (e) {
            return null;
        }
    }

    /** Armazena no cache com TTL. */
    function setCache(key, value) {
        try {
            cache.set(String(key), {
                value: value,
                expiresAt: Date.now() + CACHE_TTL_MS
            });
        } catch (e) {}
    }

    /**
     * Verifica se o Firebase está disponível e configurado.
     */
    function isAvailable() {
        const d = db();
        if (!d) return false;
        try {
            return typeof d.collection === 'function';
        } catch (e) {
            log('warn', 'isAvailable error', e && e.message);
            return false;
        }
    }

    /**
     * Lê um documento da coleção sot_data.
     * Para listas: doc tem campo { items: [] }.
     * Para objetos (ex: escalaData): doc tem campo { data: {} }.
     * Usa cache com TTL e coalescência para requisições simultâneas da mesma chave.
     */
    async function get(key) {
        const keyStr = String(key);
        if (isSotOfflineModeActive()) {
            log('log', 'get bloqueado (modo offline)', keyStr);
            return null;
        }
        if (!authGateAllowsFirestore()) {
            log('warn', 'get: login Google necessário (regras Firestore)', keyStr);
            return null;
        }
        const cached = getCached(keyStr);
        if (cached !== null) return cached;

        let promise = inFlightGets.get(keyStr);
        if (promise) {
            try {
                return await promise;
            } finally {
                inFlightGets.delete(keyStr);
            }
        }

        promise = (async function() {
            const d = db();
            if (!d) {
                log('warn', 'get: Firebase db não disponível', keyStr);
                return null;
            }
            try {
                const ref = d.collection(COL).doc(keyStr);
                const snap = await ref.get();
                if (!snap.exists) {
                    setCache(keyStr, null);
                    if (SOT_F7_GENERATION_KEYS[keyStr]) docGenByKey.set(keyStr, 0);
                    return null;
                }
                const data = snap.data();
                rememberDocGenerationForKey(keyStr, data);
                let value = null;
                if (data && data._sotJsonV1 === true && typeof data.body === 'string') {
                    try {
                        value = JSON.parse(data.body);
                    } catch (parseErr) {
                        log('error', 'get JSON parse key=' + keyStr, parseErr && parseErr.message);
                        value = null;
                    }
                } else if (data && Array.isArray(data.items)) value = data.items;
                else if (data && data.data !== undefined) value = data.data;
                else value = data;
                setCache(keyStr, value);
                return value;
            } catch (e) {
                log('error', 'get error key=' + keyStr, e && e.message);
                return null;
            }
        })();

        inFlightGets.set(keyStr, promise);
        try {
            return await promise;
        } finally {
            inFlightGets.delete(keyStr);
        }
    }

    /**
     * Ouve `sot_data/saidasAdministrativas` em tempo real (compat). Atualiza cache como `get`; chama callback após cada snapshot.
     * @returns {function} unsubscribe
     */
    function watchSaidasAdministrativas(callback) {
        var keyStr = 'saidasAdministrativas';
        if (isSotOfflineModeActive()) {
            return function() {};
        }
        if (!authGateAllowsFirestore()) {
            return function() {};
        }
        var d = db();
        if (!d) {
            return function() {};
        }
        try {
            var ref = d.collection(COL).doc(keyStr);
            return ref.onSnapshot(
                function(snap) {
                    if (isSotOfflineModeActive()) return;
                    try {
                        var value = null;
                        if (snap.exists) {
                            var data = snap.data();
                            rememberDocGenerationForKey(keyStr, data);
                            if (data && data._sotJsonV1 === true && typeof data.body === 'string') {
                                try {
                                    value = JSON.parse(data.body);
                                } catch (parseErr) {
                                    log('error', 'watch JSON parse key=' + keyStr, parseErr && parseErr.message);
                                    value = null;
                                }
                            } else if (data && Array.isArray(data.items)) value = data.items;
                            else if (data && data.data !== undefined) value = data.data;
                            else value = data;
                        } else {
                            if (SOT_F7_GENERATION_KEYS[keyStr]) docGenByKey.set(keyStr, 0);
                        }
                        setCache(keyStr, value);
                    } catch (e) {
                        log('warn', 'watchSaidasAdministrativas parse', e && e.message);
                    }
                    try {
                        if (typeof callback === 'function') callback();
                    } catch (e2) {}
                },
                function(err) {
                    log('warn', 'watchSaidasAdministrativas listener', err && err.message);
                }
            );
        } catch (e) {
            return function() {};
        }
    }

    /**
     * Grava um documento na coleção sot_data. value pode ser array ou objeto.
     * Invalida o cache da chave e coalesce escritas concorrentes na mesma chave.
     *
     * Em modo offline (localStorage sot_offline_mode === 'true'): não acessa o Firestore;
     * retorna false de imediato (noop de rede), igual a get/getConfig. O data-service.js
     * grava só em localStorage nesse caso quando usa _setToFirebase.
     *
     * @returns {Promise<boolean>} true se persistiu no Firestore; false se modo offline,
     *   sem auth Google, Firebase indisponível ou erro de escrita/regras.
     */
    async function set(key, value, options) {
        const keyStr = String(key);
        if (isSotOfflineModeActive()) {
            log('log', 'set bloqueado (modo offline)', keyStr);
            return false;
        }
        try {
            cache.delete(keyStr);
        } catch (eDel) {}

        let promise = inFlightSets.get(keyStr);
        if (promise) {
            try {
                return await promise;
            } catch (e) {
                return false;
            }
        }

        promise = (async function() {
            if (!authGateAllowsFirestore()) {
                log('warn', 'set: login Google necessário (regras Firestore)', keyStr);
                return false;
            }
            const d = db();
            const fb = firebaseApp();
            if (!d || !fb) {
                log('warn', 'set: Firebase não disponível');
                return false;
            }
            try {
                const ref = d.collection(COL).doc(keyStr);
                const ts = fb.firestore && fb.firestore.FieldValue ? fb.firestore.FieldValue.serverTimestamp() : null;
                var expectGen =
                    options && typeof options.expectSotDocGeneration === 'number' && !isNaN(options.expectSotDocGeneration)
                        ? Math.floor(options.expectSotDocGeneration)
                        : null;

                if (SOT_F7_GENERATION_KEYS[keyStr] && typeof d.runTransaction === 'function') {
                    var nextGenF7 = 0;
                    await d.runTransaction(function(transaction) {
                        return transaction.get(ref).then(function(snap) {
                            var prevGen = 0;
                            if (snap.exists) {
                                prevGen = readSotDocGenerationFromData(snap.data());
                            }
                            if (expectGen !== null && prevGen !== expectGen) {
                                throw new Error('SOT_F7_GEN_MISMATCH:' + prevGen);
                            }
                            nextGenF7 = prevGen + 1;
                            var payloadTx = buildPayloadWithSotDocGen(value, ts, nextGenF7);
                            transaction.set(ref, payloadTx);
                        });
                    });
                    docGenByKey.set(keyStr, nextGenF7);
                    setCache(keyStr, value);
                    return true;
                }

                var payload;
                if (valueNeedsJsonBlob(value)) {
                    payload = ts
                        ? { _sotJsonV1: true, body: JSON.stringify(value), updatedAt: ts }
                        : { _sotJsonV1: true, body: JSON.stringify(value) };
                } else if (Array.isArray(value)) {
                    payload = ts ? { items: value, updatedAt: ts } : { items: value };
                } else {
                    payload = ts ? { data: value, updatedAt: ts } : { data: value };
                }
                await ref.set(payload);
                setCache(keyStr, value);
                return true;
            } catch (e) {
                var msg = e && e.message ? String(e.message) : String(e);
                if (msg.indexOf('SOT_F7_GEN_MISMATCH') === 0) {
                    docGenByKey.delete(keyStr);
                    log('warn', 'set Fase 7 generation mismatch key=' + keyStr, msg);
                } else {
                    log('error', 'set error key=' + keyStr, e && e.message);
                }
                return false;
            } finally {
                inFlightSets.delete(keyStr);
            }
        })();

        inFlightSets.set(keyStr, promise);
        try {
            return await promise;
        } finally {
            inFlightSets.delete(keyStr);
        }
    }

    /**
     * Lê uma configuração (chave/valor). Documentos de config: config_<chave> com campo value.
     */
    async function getConfig(chave) {
        if (isSotOfflineModeActive()) {
            log('log', 'getConfig bloqueado (modo offline)', chave);
            return null;
        }
        if (!authGateAllowsFirestore()) {
            log('warn', 'getConfig: login Google necessário');
            return null;
        }
        const d = db();
        if (!d) {
            log('warn', 'getConfig: Firebase db não disponível');
            return null;
        }
        try {
            const ref = d.collection(COL).doc('config_' + String(chave));
            const snap = await ref.get();
            if (!snap.exists) return null;
            const data = snap.data();
            return data && data.value !== undefined ? data.value : null;
        } catch (e) {
            log('error', 'getConfig error chave=' + chave, e && e.message);
            return null;
        }
    }

    /**
     * Grava uma configuração.
     */
    async function setConfig(chave, valor) {
        if (isSotOfflineModeActive()) {
            log('log', 'setConfig bloqueado (modo offline)', chave);
            return false;
        }
        if (!authGateAllowsFirestore()) {
            log('warn', 'setConfig: login Google necessário');
            return false;
        }
        const d = db();
        const fb = firebaseApp();
        if (!d || !fb) {
            log('warn', 'setConfig: Firebase não disponível');
            return false;
        }
        try {
            const ref = d.collection(COL).doc('config_' + String(chave));
            const ts = fb.firestore && fb.firestore.FieldValue ? fb.firestore.FieldValue.serverTimestamp() : null;
            const payload = ts ? { value: valor, updatedAt: ts } : { value: valor };
            await ref.set(payload);
            return true;
        } catch (e) {
            log('error', 'setConfig error chave=' + chave, e && e.message);
            return false;
        }
    }

    /** Invalida todo o cache (útil após operações em lote). */
    function invalidateAllCache() {
        try {
            cache.clear();
            docGenByKey.clear();
        } catch (e) {}
    }

    function getLastSotDocGeneration(key) {
        var k = String(key || '');
        if (!SOT_F7_GENERATION_KEYS[k]) return null;
        if (!docGenByKey.has(k)) return null;
        return docGenByKey.get(k);
    }

    window.firebaseSot = {
        isAvailable: isAvailable,
        authGateOk: authGateAllowsFirestore,
        /** C3: true quando gravações/leituras Firestore via este serviço estão desativadas (modo offline SOT). */
        isOfflineMode: isSotOfflineModeActive,
        get: get,
        set: set,
        getConfig: getConfig,
        setConfig: setConfig,
        /** Fase 7: geração optimista (saidasAdministrativas / saidasAmbulancias). */
        getLastSotDocGeneration: getLastSotDocGeneration,
        /** Invalida uma chave (ex.: após outra aba avisar via BroadcastChannel). */
        invalidateCache: invalidateCache,
        invalidateAllCache: invalidateAllCache,
        /** Tempo real: documento mestre de saídas administrativas (alinhado ao módulo firebase-sot-firestore.mjs). */
        watchSaidasAdministrativas: watchSaidasAdministrativas
    };
})();
