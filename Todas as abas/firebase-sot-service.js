/**
 * Serviço Firebase para dados do SOT (Firestore).
 * Usado pelo data-service.js para ler/gravar saídas, viaturas, motoristas, etc.
 * Inclui cache com TTL e coalescência de requisições concorrentes.
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

    /** Remove entrada do cache (chamado após set para manter consistência). */
    function invalidateCache(key) {
        try {
            cache.delete(String(key));
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
                    return null;
                }
                const data = snap.data();
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
     * Grava um documento. value pode ser array ou objeto.
     * Invalida o cache da chave e coalesce escritas concorrentes na mesma chave.
     */
    async function set(key, value) {
        const keyStr = String(key);
        invalidateCache(keyStr);

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
                return true;
            } catch (e) {
                log('error', 'set error key=' + keyStr, e && e.message);
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
        } catch (e) {}
    }

    window.firebaseSot = {
        isAvailable: isAvailable,
        authGateOk: authGateAllowsFirestore,
        get: get,
        set: set,
        getConfig: getConfig,
        setConfig: setConfig,
        /** Invalida uma chave (ex.: após outra aba avisar via BroadcastChannel). */
        invalidateCache: invalidateCache,
        invalidateAllCache: invalidateAllCache
    };
})();
