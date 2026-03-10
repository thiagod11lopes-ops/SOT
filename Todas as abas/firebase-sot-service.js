/**
 * Serviço Firebase para dados do SOT (Firestore).
 * Usado pelo data-service.js para ler/gravar saídas, viaturas, motoristas, etc.
 * Assim, qualquer computador ou celular vê os mesmos dados atualizados.
 *
 * Depende de: firebase-config.js (e dos scripts firebase-app e firebase-firestore).
 */
(function() {
    'use strict';

    const COL = 'sot_data';

    function db() {
        return typeof window.firebaseDb !== 'undefined' ? window.firebaseDb : null;
    }

    function firebaseApp() {
        return typeof firebase !== 'undefined' ? firebase : null;
    }

    /**
     * Verifica se o Firebase está disponível e configurado.
     */
    function isAvailable() {
        const d = db();
        if (!d) return false;
        try {
            return d.collection != null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Lê um documento da coleção sot_data.
     * Para listas: doc tem campo { items: [] }.
     * Para objetos (ex: escalaData): doc tem campo { data: {} }.
     */
    async function get(key) {
        const d = db();
        if (!d) return null;
        try {
            const ref = d.collection(COL).doc(String(key));
            const snap = await ref.get();
            if (!snap.exists) return null;
            const data = snap.data();
            if (data && Array.isArray(data.items)) return data.items;
            if (data && data.data !== undefined) return data.data;
            return data;
        } catch (e) {
            console.warn('[firebase-sot] get error:', key, e);
            return null;
        }
    }

    /**
     * Grava um documento. value pode ser array ou objeto.
     */
    async function set(key, value) {
        const d = db();
        const fb = firebaseApp();
        if (!d || !fb) {
            console.warn('[firebase-sot] Firebase não disponível para set');
            return false;
        }
        try {
            const ref = d.collection(COL).doc(String(key));
            const ts = fb.firestore && fb.firestore.FieldValue ? fb.firestore.FieldValue.serverTimestamp() : null;
            const payload = Array.isArray(value)
                ? (ts ? { items: value, updatedAt: ts } : { items: value })
                : (ts ? { data: value, updatedAt: ts } : { data: value });
            await ref.set(payload);
            return true;
        } catch (e) {
            console.warn('[firebase-sot] set error:', key, e);
            return false;
        }
    }

    /**
     * Lê uma configuração (chave/valor). Documentos de config: config_<chave> com campo value.
     */
    async function getConfig(chave) {
        const d = db();
        if (!d) return null;
        try {
            const ref = d.collection(COL).doc('config_' + String(chave));
            const snap = await ref.get();
            if (!snap.exists) return null;
            const data = snap.data();
            return data && data.value !== undefined ? data.value : null;
        } catch (e) {
            console.warn('[firebase-sot] getConfig error:', chave, e);
            return null;
        }
    }

    /**
     * Grava uma configuração.
     */
    async function setConfig(chave, valor) {
        const d = db();
        const fb = firebaseApp();
        if (!d || !fb) return false;
        try {
            const ref = d.collection(COL).doc('config_' + String(chave));
            const ts = fb.firestore && fb.firestore.FieldValue ? fb.firestore.FieldValue.serverTimestamp() : null;
            const payload = ts ? { value: valor, updatedAt: ts } : { value: valor };
            await ref.set(payload);
            return true;
        } catch (e) {
            console.warn('[firebase-sot] setConfig error:', chave, e);
            return false;
        }
    }

    window.firebaseSot = {
        isAvailable: isAvailable,
        get: get,
        set: set,
        getConfig: getConfig,
        setConfig: setConfig
    };
})();
