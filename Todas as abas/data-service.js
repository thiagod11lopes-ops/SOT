/**
 * Serviço de Dados Unificado
 * Com SOT_FORCE_FIREBASE_ONLY: Firestore é a fonte principal; localStorage só completa (união por id).
 * Em conflito de mesmo id, prevalece a nuvem. Gravações podem espelhar no LS.
 * Sem a flag: API quando disponível, senão Firebase + merge com local.
 */

(function() {
    'use strict';

    const SOT_PREFER_LOCAL_KEY = 'sot_prefer_local_storage';
    /** Se true: não usa API REST /api; leituras = Firestore (principal) + localStorage (complemento por id). */
    const SOT_FORCE_FIREBASE_ONLY = true;
    const FIREBASE_CACHE_TTL_MS = 5 * 1000; // 5 segundos para reduzir leituras repetidas
    const API_CHECK_INTERVAL_MS = 30000;
    const LOG_PREFIX = '[data-service]';

    /** Cache em memória para leituras Firebase: key -> { value, expiresAt } */
    const firebaseReadCache = new Map();
    /** Uma única Promise para a verificação da API (evita corrida) */
    let apiCheckPromise = null;

    /** Lê array do localStorage sempre (para merge; não respeita “só nuvem”). */
    function readLocalStorageArrayAlways(key) {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(key);
            if (raw == null || raw === '') return [];
            const v = JSON.parse(raw);
            return Array.isArray(v) ? v : [];
        } catch (e) {
            return [];
        }
    }

    /** id / _id / uuid / key — evita descartar toda a nuvem se o campo não for só `id`. */
    function getStableRecordId(item, idField) {
        if (!item || typeof item !== 'object') return null;
        idField = idField || 'id';
        var v = item[idField];
        if (v != null && v !== '') return String(v);
        if (item._id != null && item._id !== '') return String(item._id);
        if (item.uuid != null && item.uuid !== '') return String(item.uuid);
        if (item.key != null && item.key !== '') return String(item.key);
        return null;
    }

    /**
     * União: nuvem primeiro (principal em conflito de mesmo id); local só completa ids que a nuvem não tem.
     * Registros da nuvem sem id estável continuam na lista (antes eram descartados → listas vazias online).
     */
    function mergeArraysCloudPrimary(cloudArr, localArr, idField) {
        idField = idField || 'id';
        const remote = Array.isArray(cloudArr) ? cloudArr : [];
        const local = Array.isArray(localArr) ? localArr : [];
        const seenIds = new Set();
        const out = [];

        remote.forEach(function(item) {
            if (!item || typeof item !== 'object') return;
            var sid = getStableRecordId(item, idField);
            if (sid != null) {
                if (seenIds.has(sid)) return;
                seenIds.add(sid);
                out.push(item);
            } else {
                out.push(item);
            }
        });

        local.forEach(function(item) {
            if (!item || typeof item !== 'object') return;
            var sid = getStableRecordId(item, idField);
            if (sid != null) {
                if (seenIds.has(sid)) return;
                seenIds.add(sid);
                out.push(item);
            }
        });

        return out;
    }

    function readLocalStorageEscalaObject() {
        if (typeof localStorage === 'undefined') return {};
        try {
            const raw = localStorage.getItem('escalaData');
            if (!raw) return {};
            const v = JSON.parse(raw);
            return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
        } catch (e) {
            return {};
        }
    }

    /** Objetos: chaves só no local permanecem; chaves em ambos usam valor da nuvem. */
    function mergeObjectsCloudPrimary(cloudObj, localObj) {
        const local = localObj && typeof localObj === 'object' && !Array.isArray(localObj) ? localObj : {};
        const cloud = cloudObj && typeof cloudObj === 'object' && !Array.isArray(cloudObj) ? cloudObj : {};
        return Object.assign({}, local, cloud);
    }

    function log(level, message, detail) {
        try {
            const msg = detail != null ? message + ' ' + (typeof detail === 'object' ? (detail.message || String(detail)) : detail) : message;
            if (level === 'warn') console.warn(LOG_PREFIX, msg);
            else if (level === 'error') console.error(LOG_PREFIX, msg);
            else console.log(LOG_PREFIX, msg);
        } catch (e) {}
    }

    function getCached(key) {
        try {
            const entry = firebaseReadCache.get(key);
            if (!entry) return undefined;
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                firebaseReadCache.delete(key);
                return undefined;
            }
            return entry.value;
        } catch (e) {
            return undefined;
        }
    }

    function setCache(key, value) {
        try {
            firebaseReadCache.set(key, { value: value, expiresAt: Date.now() + FIREBASE_CACHE_TTL_MS });
        } catch (e) {}
    }

    function invalidateCache(key) {
        try {
            firebaseReadCache.delete(key);
        } catch (e) {}
    }

    function clearAllFirebaseReadCache() {
        try {
            firebaseReadCache.clear();
        } catch (e) {}
    }

    class DataService {
        constructor() {
            this.useAPI = false;
            this.apiAvailable = false;
            this.useFirebase = false;
            try {
                setTimeout(() => this.checkAPI(), 100);
            } catch (e) {
                log('error', 'constructor setTimeout', e);
            }
        }

        _preferLocalStorage() {
            try {
                if (SOT_FORCE_FIREBASE_ONLY) return false;
                return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SOT_PREFER_LOCAL_KEY) === 'true';
            } catch (e) {
                return false;
            }
        }

        setPreferLocalStorage(value) {
            try {
                if (typeof sessionStorage === 'undefined') return;
                if (SOT_FORCE_FIREBASE_ONLY) {
                    sessionStorage.removeItem(SOT_PREFER_LOCAL_KEY);
                    if (typeof localStorage !== 'undefined') localStorage.removeItem(SOT_PREFER_LOCAL_KEY);
                    return;
                }
                if (value) sessionStorage.setItem(SOT_PREFER_LOCAL_KEY, 'true');
                else sessionStorage.removeItem(SOT_PREFER_LOCAL_KEY);
                if (typeof localStorage !== 'undefined' && !value) localStorage.removeItem(SOT_PREFER_LOCAL_KEY);
            } catch (e) {
                log('warn', 'setPreferLocalStorage', e);
            }
        }

        async _ensureFirebaseAvailable(timeoutMs) {
            timeoutMs = timeoutMs || 4000;
            const startedAt = Date.now();
            while ((Date.now() - startedAt) < timeoutMs) {
                if (this._checkFirebase()) return true;
                await new Promise(function(resolve) { setTimeout(resolve, 120); });
            }
            return this._checkFirebase();
        }

        _checkFirebase() {
            try {
                this.useFirebase = !!(window.firebaseSot && typeof window.firebaseSot.isAvailable === 'function' && window.firebaseSot.isAvailable());
                return this.useFirebase;
            } catch (e) {
                this.useFirebase = false;
                return false;
            }
        }

        /**
         * Com SOT_FORCE_FIREBASE_ONLY, não usar backend REST (/api), mesmo se /health responder OK —
         * evita listas vazias quando o Firestore tem dados mas os endpoints de saídas não estão populados.
         */
        _useRestApi() {
            if (SOT_FORCE_FIREBASE_ONLY) return false;
            return !!(this.useAPI && this.apiAvailable);
        }

        /** @deprecated use readLocalStorageArrayAlways + mergeArraysCloudPrimary nos getters */
        _readLocalStorageArray(key) {
            const a = readLocalStorageArrayAlways(key);
            return a.length ? a : null;
        }

        /** Limpa cache em memória das leituras Firebase (ex.: após importar JSON). */
        clearFirebaseReadCache() {
            clearAllFirebaseReadCache();
        }

        async _getFromFirebase(key) {
            const cached = getCached(key);
            // Não usar cache de null: antes da Auth ficar pronta o get falha e null ficava 5s na cache —
            // o sync e as telas liam [] e podiam sobrescrever o Firebase.
            if (cached !== undefined && cached !== null) return cached;
            if (!this.useFirebase || !window.firebaseSot || typeof window.firebaseSot.get !== 'function') return null;
            try {
                const value = await window.firebaseSot.get(key);
                if (value !== null && value !== undefined) {
                    setCache(key, value);
                }
                return value;
            } catch (e) {
                log('error', '_getFromFirebase key=' + key, e);
                return null;
            }
        }

        async _setToFirebase(key, value) {
            invalidateCache(key);
            if (!this.useFirebase || !window.firebaseSot || typeof window.firebaseSot.set !== 'function') return false;
            try {
                const ok = await window.firebaseSot.set(key, value);
                if (ok && typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    } catch (le) {
                        log('warn', 'localStorage.setItem após Firebase set', le);
                    }
                }
                return ok;
            } catch (e) {
                log('error', '_setToFirebase key=' + key, e);
                return false;
            }
        }

        async checkAPI() {
            if (apiCheckPromise) return apiCheckPromise;
            apiCheckPromise = (async () => {
                try {
                    if (SOT_FORCE_FIREBASE_ONLY) {
                        this.apiAvailable = false;
                        this.useAPI = false;
                        return false;
                    }
                    if (typeof api === 'undefined') {
                        log('warn', 'api-service.js não carregado');
                        this.apiAvailable = false;
                        this.useAPI = false;
                        return false;
                    }
                    this.apiAvailable = await api.healthCheck();
                    this.useAPI = this.apiAvailable;
                    if (this.apiAvailable) log('log', 'API disponível (backend)');
                    else log('warn', 'API não disponível - usando localStorage/Firebase');
                    return this.apiAvailable;
                } catch (error) {
                    log('warn', 'checkAPI erro', error);
                    this.apiAvailable = false;
                    this.useAPI = false;
                    return false;
                }
            })();
            return apiCheckPromise;
        }

        async waitForAPICheck() {
            try {
                if (window.__sotFirestoreBoot) {
                    try {
                        await window.__sotFirestoreBoot;
                    } catch (bootErr) {
                        log('warn', 'Boot Firestore modular', bootErr);
                    }
                }
                if (!apiCheckPromise) apiCheckPromise = this.checkAPI();
                await apiCheckPromise;
                await this._ensureFirebaseAvailable(SOT_FORCE_FIREBASE_ONLY ? 7000 : 4000);
                if (this.useFirebase) log('log', 'Firebase SOT disponível');
                else if (SOT_FORCE_FIREBASE_ONLY) log('warn', 'Firebase indisponível no modo somente-nuvem');
                return apiCheckPromise;
            } catch (e) {
                log('error', 'waitForAPICheck', e);
                throw e;
            }
        }

        /** Com SOT_FORCE_FIREBASE_ONLY não lê LS aqui (merge feito nos getters dedicados). */
        getFromLocalStorage(key, defaultValue) {
            if (defaultValue === undefined) defaultValue = null;
            if (SOT_FORCE_FIREBASE_ONLY) return defaultValue;
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                log('warn', 'getFromLocalStorage key=' + key, e);
                return defaultValue;
            }
        }

        // ---------- Viaturas ----------
        async getViaturas() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('viaturasCadastradas');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getViaturas();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getViaturas API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('viaturasCadastradas');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('viaturasCadastradas', []);
            return this.getFromLocalStorage('viaturasCadastradas', []);
        }

        async saveViaturas(viaturas) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    for (const viatura of viaturas) {
                        if (viatura.id) await api.updateViatura(viatura.id, viatura);
                        else await api.createViatura(viatura);
                    }
                    try { localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas)); } catch (e) {}
                    return true;
                } catch (e) {
                    log('warn', 'saveViaturas API', e);
                }
            }
            await this._setToFirebase('viaturasCadastradas', viaturas);
            try { localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas)); } catch (e) {}
            return true;
        }

        // ---------- Motoristas ----------
        async getMotoristas() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('motoristasCadastrados');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getMotoristas();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getMotoristas API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('motoristasCadastrados');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('motoristasCadastrados', []);
            return this.getFromLocalStorage('motoristasCadastrados', []);
        }

        async saveMotoristas(motoristas) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    for (const m of motoristas) {
                        if (m.id) await api.updateMotorista(m.id, m);
                        else await api.createMotorista(m);
                    }
                    try { localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas)); } catch (e) {}
                    return true;
                } catch (e) {
                    log('warn', 'saveMotoristas API', e);
                }
            }
            await this._setToFirebase('motoristasCadastrados', motoristas);
            try { localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas)); } catch (e) {}
            return true;
        }

        // ---------- Saídas administrativas ----------
        async getSaidasAdministrativas() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('saidasAdministrativas');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getSaidasAdministrativas();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getSaidasAdministrativas API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('saidasAdministrativas');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (!navigator.onLine) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('saidasAdministrativas', []);
            return this.getFromLocalStorage('saidasAdministrativas', []);
        }

        async saveSaidaAdministrativa(saida) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    const result = await api.createSaidaAdministrativa(saida);
                    const saidas = await this.getSaidasAdministrativas();
                    saidas.push({ ...saida, id: (result && result.data && result.data.id) || saida.id });
                    await this._setToFirebase('saidasAdministrativas', saidas);
                    try { localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas)); } catch (e) {}
                    return result.data || saida;
                } catch (e) {
                    log('warn', 'saveSaidaAdministrativa API', e);
                }
            }
            const saidas = await this.getSaidasAdministrativas();
            saidas.push(saida);
            await this._setToFirebase('saidasAdministrativas', saidas);
            try { localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas)); } catch (e) {}
            return saida;
        }

        async setSaidasAdministrativas(lista) {
            await this._setToFirebase('saidasAdministrativas', lista);
            try { localStorage.setItem('saidasAdministrativas', JSON.stringify(lista)); } catch (e) {}
            return true;
        }

        // ---------- Saídas ambulâncias ----------
        async getSaidasAmbulancias() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('saidasAmbulancias');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getSaidasAmbulancias();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getSaidasAmbulancias API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('saidasAmbulancias');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (!navigator.onLine) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('saidasAmbulancias', []);
            return this.getFromLocalStorage('saidasAmbulancias', []);
        }

        async setSaidasAmbulancias(lista) {
            await this._setToFirebase('saidasAmbulancias', lista);
            try { localStorage.setItem('saidasAmbulancias', JSON.stringify(lista)); } catch (e) {}
            return true;
        }

        // ---------- Vistorias ----------
        async getVistorias() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('vistoriasRealizadas');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getVistorias();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getVistorias API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('vistoriasRealizadas');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('vistoriasRealizadas', []);
            return this.getFromLocalStorage('vistoriasRealizadas', []);
        }

        async saveVistoria(vistoria) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    const result = await api.createVistoria(vistoria);
                    const vistorias = await this.getVistorias();
                    vistorias.push({ ...vistoria, id: (result && result.data && result.data.id) || vistoria.id });
                    await this._setToFirebase('vistoriasRealizadas', vistorias);
                    try { localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias)); } catch (e) {}
                    return result.data || vistoria;
                } catch (e) {
                    log('warn', 'saveVistoria API', e);
                }
            }
            const vistorias = await this.getVistorias();
            vistorias.push(vistoria);
            await this._setToFirebase('vistoriasRealizadas', vistorias);
            try { localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias)); } catch (e) {}
            return vistoria;
        }

        // ---------- Abastecimentos ----------
        async getAbastecimentos() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('abastecimentos');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getAbastecimentos();
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getAbastecimentos API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('abastecimentos');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('abastecimentos', []);
            return this.getFromLocalStorage('abastecimentos', []);
        }

        async saveAbastecimento(abastecimento) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    const result = await api.createAbastecimento(abastecimento);
                    const abastecimentos = await this.getAbastecimentos();
                    abastecimentos.push({ ...abastecimento, id: (result && result.data && result.data.id) || abastecimento.id });
                    await this._setToFirebase('abastecimentos', abastecimentos);
                    try { localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos)); } catch (e) {}
                    return result.data || abastecimento;
                } catch (e) {
                    log('warn', 'saveAbastecimento API', e);
                }
            }
            const abastecimentos = await this.getAbastecimentos();
            abastecimentos.push(abastecimento);
            await this._setToFirebase('abastecimentos', abastecimentos);
            try { localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos)); } catch (e) {}
            return abastecimento;
        }

        // ---------- Escala ----------
        async getEscala() {
            await this.waitForAPICheck();
            const localObj = readLocalStorageEscalaObject();
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getEscala();
                    if (apiData && typeof apiData === 'object' && !Array.isArray(apiData)) {
                        return mergeObjectsCloudPrimary(apiData, localObj);
                    }
                } catch (e) {
                    log('warn', 'getEscala API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('escalaData');
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    return mergeObjectsCloudPrimary(data, localObj);
                }
            }
            if (Object.keys(localObj).length) return mergeObjectsCloudPrimary({}, localObj);
            if (this._preferLocalStorage()) return this.getFromLocalStorage('escalaData', {});
            return this.getFromLocalStorage('escalaData', {});
        }

        async saveEscalaItem(item) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    await api.saveEscala(item);
                } catch (e) {
                    log('warn', 'saveEscalaItem API', e);
                }
            }
            const escala = await this.getEscala();
            const key = (item.ano || '') + '-' + (item.mes || '') + '-' + (item.dia || '') + '-' + (item.motorista_id || '');
            escala[key] = item;
            await this._setToFirebase('escalaData', escala);
            try { localStorage.setItem('escalaData', JSON.stringify(escala)); } catch (e) {}
            return item;
        }

        // ---------- Avisos ----------
        async getAvisos() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('avisos');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getAvisos({ ativo: 1 });
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getAvisos API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('avisos');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('avisos', []);
            return this.getFromLocalStorage('avisos', []);
        }

        async saveAviso(aviso) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    const result = await api.createAviso(aviso);
                    const avisos = await this.getAvisos();
                    avisos.push({ ...aviso, id: (result && result.data && result.data.id) || aviso.id });
                    await this._setToFirebase('avisos', avisos);
                    try { localStorage.setItem('avisos', JSON.stringify(avisos)); } catch (e) {}
                    return result.data || aviso;
                } catch (e) {
                    log('warn', 'saveAviso API', e);
                }
            }
            const avisos = await this.getAvisos();
            avisos.push(aviso);
            await this._setToFirebase('avisos', avisos);
            try { localStorage.setItem('avisos', JSON.stringify(avisos)); } catch (e) {}
            return aviso;
        }

        // ---------- Lembretes ----------
        async getLembretes() {
            await this.waitForAPICheck();
            const local = readLocalStorageArrayAlways('lembretes_ativos');
            if (this._useRestApi()) {
                try {
                    const apiData = await api.getLembretes({ ativo: 1, concluido: 0 });
                    return mergeArraysCloudPrimary(Array.isArray(apiData) ? apiData : [], local, 'id');
                } catch (e) {
                    log('warn', 'getLembretes API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (this.useFirebase) {
                const data = await this._getFromFirebase('lembretes_ativos');
                if (Array.isArray(data)) return mergeArraysCloudPrimary(data, local, 'id');
            }
            if (local.length) return local.slice();
            if (this._preferLocalStorage()) return this.getFromLocalStorage('lembretes_ativos', []);
            return this.getFromLocalStorage('lembretes_ativos', []);
        }

        // ---------- Configurações ----------
        async getConfiguracao(chave) {
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    const configs = await api.getConfiguracao();
                    return configs && configs[chave] && configs[chave].valor != null ? configs[chave].valor : null;
                } catch (e) {
                    log('warn', 'getConfiguracao API', e);
                    this.apiAvailable = false;
                    this.useAPI = false;
                }
            }
            if (!SOT_FORCE_FIREBASE_ONLY && this._preferLocalStorage() && typeof localStorage !== 'undefined') {
                try { return localStorage.getItem(chave); } catch (e) { return null; }
            }
            if (this.useFirebase && window.firebaseSot && typeof window.firebaseSot.getConfig === 'function') {
                try {
                    const v = await window.firebaseSot.getConfig(chave);
                    if (v !== null && v !== undefined) return v;
                } catch (e) {
                    log('warn', 'getConfiguracao Firebase', e);
                }
            }
            if (SOT_FORCE_FIREBASE_ONLY) return null;
            try { return localStorage.getItem(chave); } catch (e) { return null; }
        }

        async saveConfiguracao(chave, valor, tipo) {
            tipo = tipo || 'string';
            await this.waitForAPICheck();
            if (this._useRestApi()) {
                try {
                    await api.saveConfiguracao(chave, valor, tipo);
                } catch (e) {
                    log('warn', 'saveConfiguracao API', e);
                }
            }
            if (this.useFirebase && window.firebaseSot && typeof window.firebaseSot.setConfig === 'function') {
                try {
                    await window.firebaseSot.setConfig(chave, valor);
                } catch (e) {
                    log('warn', 'saveConfiguracao Firebase', e);
                }
            }
            try {
                localStorage.setItem(chave, valor);
            } catch (e) {
                log('warn', 'saveConfiguracao localStorage', e);
            }
            return true;
        }

        // ---------- Sincronização para API ----------
        async syncToAPI() {
            if (!this.apiAvailable) {
                log('warn', 'syncToAPI: API não disponível');
                return;
            }
            log('log', 'Sincronizando localStorage para API...');
            try {
                const viaturas = await this.getViaturas();
                for (const v of viaturas) {
                    try {
                        if (v.id) await api.updateViatura(v.id, v);
                        else await api.createViatura(v);
                    } catch (e) {
                        log('warn', 'syncToAPI viatura', e);
                    }
                }
                const motoristas = await this.getMotoristas();
                for (const m of motoristas) {
                    try {
                        if (m.id) await api.updateMotorista(m.id, m);
                        else await api.createMotorista(m);
                    } catch (e) {
                        log('warn', 'syncToAPI motorista', e);
                    }
                }
                log('log', 'Sincronização concluída');
            } catch (e) {
                log('error', 'syncToAPI', e);
            }
        }
    }

    const dataService = new DataService();

    let apiCheckIntervalId = null;
    try {
        apiCheckIntervalId = setInterval(function() {
            dataService.checkAPI();
        }, API_CHECK_INTERVAL_MS);
    } catch (e) {
        log('warn', 'setInterval checkAPI', e);
    }

    window.DataService = DataService;
    window.dataService = dataService;

    try {
        window.sotDataMerge = {
            mergeArraysCloudPrimary: mergeArraysCloudPrimary,
            getStableRecordId: getStableRecordId,
            readLocalStorageArrayAlways: readLocalStorageArrayAlways,
            mergeObjectsCloudPrimary: mergeObjectsCloudPrimary,
            readLocalStorageEscalaObject: readLocalStorageEscalaObject
        };
    } catch (e) {}

    try {
        window.addEventListener('sot-firebase-auth-changed', function() {
            try {
                firebaseReadCache.clear();
            } catch (e) {}
            try {
                dataService._checkFirebase();
            } catch (e2) {}
        });
    } catch (e) {}
})();
