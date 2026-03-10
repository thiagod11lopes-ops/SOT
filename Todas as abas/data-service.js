/**
 * Serviço de Dados Unificado
 * Usa backend (API) quando disponível, fallback para localStorage
 * Facilita migração gradual do sistema
 */

const SOT_PREFER_LOCAL_KEY = 'sot_prefer_local_storage';

class DataService {
    constructor() {
        this.useAPI = false;
        this.apiAvailable = false;
        this.apiCheckPromise = null;
        this.useFirebase = false;
        setTimeout(() => this.checkAPI(), 100);
    }

    /** Se true, as leituras priorizam o localStorage deste computador em vez do Firebase (útil ao acessar pelo GitHub) */
    _preferLocalStorage() {
        return typeof localStorage !== 'undefined' && localStorage.getItem(SOT_PREFER_LOCAL_KEY) === 'true';
    }

    /** Ativa ou desativa o uso prioritário dos dados do armazenamento local (deste computador) */
    setPreferLocalStorage(value) {
        if (typeof localStorage === 'undefined') return;
        if (value) localStorage.setItem(SOT_PREFER_LOCAL_KEY, 'true');
        else localStorage.removeItem(SOT_PREFER_LOCAL_KEY);
    }

    _checkFirebase() {
        this.useFirebase = !!(window.firebaseSot && typeof window.firebaseSot.isAvailable === 'function' && window.firebaseSot.isAvailable());
        return this.useFirebase;
    }

    async _getFromFirebase(key) {
        if (!this.useFirebase || !window.firebaseSot || !window.firebaseSot.get) return null;
        try {
            return await window.firebaseSot.get(key);
        } catch (e) {
            return null;
        }
    }

    async _setToFirebase(key, value) {
        if (!this.useFirebase || !window.firebaseSot || !window.firebaseSot.set) return false;
        try {
            const ok = await window.firebaseSot.set(key, value);
            if (ok && typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
            return ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Verifica se a API está disponível
     */
    async checkAPI() {
        try {
            // Verificar se api-service.js foi carregado
            if (typeof api === 'undefined') {
                console.warn('⚠️ api-service.js não foi carregado. Verifique se o script está incluído antes do data-service.js');
                this.apiAvailable = false;
                this.useAPI = false;
                return false;
            }

            // Tentar fazer uma requisição real ao backend
            this.apiAvailable = await api.healthCheck();
            this.useAPI = this.apiAvailable;
            
            if (this.apiAvailable) {
                console.log('✅ API disponível - usando backend (http://localhost:3000)');
            } else {
                console.warn('⚠️ API não disponível - usando localStorage');
                console.warn('   Para usar o backend, certifique-se de que o servidor está rodando:');
                console.warn('   cd C:\\Users\\anamr\\backend && npm start');
            }
            
            return this.apiAvailable;
        } catch (error) {
            console.warn('⚠️ API não disponível - usando localStorage');
            console.warn('   Erro:', error.message);
            console.warn('   Para usar o backend, certifique-se de que o servidor está rodando:');
            console.warn('   cd C:\\Users\\anamr\\backend && npm start');
            this.apiAvailable = false;
            this.useAPI = false;
            return false;
        }
    }

    /**
     * Aguarda a verificação da API ser concluída
     */
    async waitForAPICheck() {
        if (!this.apiCheckPromise) {
            this.apiCheckPromise = this.checkAPI();
        }
        await this.apiCheckPromise;
        this._checkFirebase();
        if (this.useFirebase) console.log('✅ Firebase SOT disponível - dados sincronizados na nuvem');
        return this.apiCheckPromise;
    }

    /**
     * Obter viaturas
     */
    async getViaturas() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getViaturas();
            } catch (error) {
                console.warn('Erro ao buscar viaturas da API:', error);
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('viaturasCadastradas', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('viaturasCadastradas');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('viaturasCadastradas', []);
    }

    /**
     * Salvar viaturas
     */
    async saveViaturas(viaturas) {
        if (this.useAPI && this.apiAvailable) {
            try {
                for (const viatura of viaturas) {
                    if (viatura.id) await api.updateViatura(viatura.id, viatura);
                    else await api.createViatura(viatura);
                }
                localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas));
                return true;
            } catch (error) {
                console.warn('Erro ao salvar viaturas na API:', error);
            }
        }
        if (this.useFirebase) await this._setToFirebase('viaturasCadastradas', viaturas);
        else localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas));
        return true;
    }

    /**
     * Obter motoristas
     */
    async getMotoristas() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getMotoristas();
            } catch (error) {
                console.warn('Erro ao buscar motoristas da API:', error);
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('motoristasCadastrados', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('motoristasCadastrados');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('motoristasCadastrados', []);
    }

    /**
     * Salvar motoristas
     */
    async saveMotoristas(motoristas) {
        if (this.useAPI && this.apiAvailable) {
            try {
                for (const motorista of motoristas) {
                    if (motorista.id) await api.updateMotorista(motorista.id, motorista);
                    else await api.createMotorista(motorista);
                }
                localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas));
                return true;
            } catch (error) {
                console.warn('Erro ao salvar motoristas na API:', error);
            }
        }
        if (this.useFirebase) await this._setToFirebase('motoristasCadastrados', motoristas);
        else localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas));
        return true;
    }

    /**
     * Obter saídas administrativas
     */
    async getSaidasAdministrativas() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getSaidasAdministrativas();
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('saidasAdministrativas', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('saidasAdministrativas');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('saidasAdministrativas', []);
    }

    /**
     * Salvar saída administrativa
     */
    async saveSaidaAdministrativa(saida) {
        if (this.useAPI && this.apiAvailable) {
            try {
                const result = await api.createSaidaAdministrativa(saida);
                const saidas = await this.getSaidasAdministrativas();
                saidas.push({ ...saida, id: result.data?.id || saida.id });
                if (this.useFirebase) await this._setToFirebase('saidasAdministrativas', saidas);
                else localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas));
                return result.data || saida;
            } catch (error) {
                console.warn('Erro ao salvar na API:', error);
            }
        }
        const saidas = await this.getSaidasAdministrativas();
        saidas.push(saida);
        if (this.useFirebase) await this._setToFirebase('saidasAdministrativas', saidas);
        else localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas));
        return saida;
    }

    /**
     * Substituir lista completa de saídas administrativas (para edição/exclusão em lote e sync Firebase)
     */
    async setSaidasAdministrativas(lista) {
        if (this.useFirebase) await this._setToFirebase('saidasAdministrativas', lista);
        localStorage.setItem('saidasAdministrativas', JSON.stringify(lista));
        return true;
    }

    /**
     * Obter saídas de ambulâncias (também em Firebase quando configurado)
     */
    async getSaidasAmbulancias() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getSaidasAmbulancias();
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('saidasAmbulancias', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('saidasAmbulancias');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('saidasAmbulancias', []);
    }

    /**
     * Salvar lista completa de saídas de ambulâncias (para sincronizar com Firebase)
     */
    async setSaidasAmbulancias(lista) {
        if (this.useFirebase) await this._setToFirebase('saidasAmbulancias', lista);
        localStorage.setItem('saidasAmbulancias', JSON.stringify(lista));
        return true;
    }

    /**
     * Obter vistorias
     */
    async getVistorias() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getVistorias();
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('vistoriasRealizadas', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('vistoriasRealizadas');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('vistoriasRealizadas', []);
    }

    /**
     * Salvar vistoria
     */
    async saveVistoria(vistoria) {
        if (this.useAPI && this.apiAvailable) {
            try {
                const result = await api.createVistoria(vistoria);
                const vistorias = await this.getVistorias();
                vistorias.push({ ...vistoria, id: result.data?.id || vistoria.id });
                if (this.useFirebase) await this._setToFirebase('vistoriasRealizadas', vistorias);
                else localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias));
                return result.data || vistoria;
            } catch (error) {
                console.warn('Erro ao salvar vistoria na API:', error);
            }
        }
        const vistorias = await this.getVistorias();
        vistorias.push(vistoria);
        if (this.useFirebase) await this._setToFirebase('vistoriasRealizadas', vistorias);
        else localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias));
        return vistoria;
    }

    /**
     * Obter abastecimentos
     */
    async getAbastecimentos() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getAbastecimentos();
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('abastecimentos', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('abastecimentos');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('abastecimentos', []);
    }

    /**
     * Salvar abastecimento
     */
    async saveAbastecimento(abastecimento) {
        if (this.useAPI && this.apiAvailable) {
            try {
                const result = await api.createAbastecimento(abastecimento);
                const abastecimentos = await this.getAbastecimentos();
                abastecimentos.push({ ...abastecimento, id: result.data?.id || abastecimento.id });
                if (this.useFirebase) await this._setToFirebase('abastecimentos', abastecimentos);
                else localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
                return result.data || abastecimento;
            } catch (error) {
                console.warn('Erro ao salvar abastecimento na API:', error);
            }
        }
        const abastecimentos = await this.getAbastecimentos();
        abastecimentos.push(abastecimento);
        if (this.useFirebase) await this._setToFirebase('abastecimentos', abastecimentos);
        else localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
        return abastecimento;
    }

    /**
     * Obter escala
     */
    async getEscala() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getEscala();
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('escalaData', {});
        if (this.useFirebase) {
            const data = await this._getFromFirebase('escalaData');
            if (data && typeof data === 'object') return data;
        }
        return this.getFromLocalStorage('escalaData', {});
    }

    /**
     * Salvar item da escala
     */
    async saveEscalaItem(item) {
        if (this.useAPI && this.apiAvailable) {
            try {
                await api.saveEscala(item);
            } catch (error) {
                console.warn('Erro ao salvar escala na API:', error);
            }
        }
        const escala = await this.getEscala();
        const key = `${item.ano}-${item.mes}-${item.dia}-${item.motorista_id}`;
        escala[key] = item;
        if (this.useFirebase) await this._setToFirebase('escalaData', escala);
        else localStorage.setItem('escalaData', JSON.stringify(escala));
        return item;
    }

    /**
     * Obter avisos
     */
    async getAvisos() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getAvisos({ ativo: 1 });
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('avisos', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('avisos');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('avisos', []);
    }

    /**
     * Salvar aviso
     */
    async saveAviso(aviso) {
        if (this.useAPI && this.apiAvailable) {
            try {
                const result = await api.createAviso(aviso);
                const avisos = await this.getAvisos();
                avisos.push({ ...aviso, id: result.data?.id || aviso.id });
                if (this.useFirebase) await this._setToFirebase('avisos', avisos);
                else localStorage.setItem('avisos', JSON.stringify(avisos));
                return result.data || aviso;
            } catch (error) {
                console.warn('Erro ao salvar aviso na API:', error);
            }
        }
        const avisos = await this.getAvisos();
        avisos.push(aviso);
        if (this.useFirebase) await this._setToFirebase('avisos', avisos);
        else localStorage.setItem('avisos', JSON.stringify(avisos));
        return aviso;
    }

    /**
     * Obter lembretes
     */
    async getLembretes() {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getLembretes({ ativo: 1, concluido: 0 });
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage()) return this.getFromLocalStorage('lembretes_ativos', []);
        if (this.useFirebase) {
            const data = await this._getFromFirebase('lembretes_ativos');
            if (Array.isArray(data)) return data;
        }
        return this.getFromLocalStorage('lembretes_ativos', []);
    }

    /**
     * Obter configurações
     */
    async getConfiguracao(chave) {
        await this.waitForAPICheck();
        if (this.useAPI && this.apiAvailable) {
            try {
                const configs = await api.getConfiguracao();
                return configs[chave]?.valor || null;
            } catch (error) {
                this.apiAvailable = false;
                this.useAPI = false;
            }
        }
        if (this._preferLocalStorage() && typeof localStorage !== 'undefined') return localStorage.getItem(chave);
        if (this.useFirebase && window.firebaseSot && window.firebaseSot.getConfig) {
            try {
                const v = await window.firebaseSot.getConfig(chave);
                if (v !== null && v !== undefined) return v;
            } catch (e) {}
        }
        return localStorage.getItem(chave);
    }

    /**
     * Salvar configuração
     */
    async saveConfiguracao(chave, valor, tipo = 'string') {
        if (this.useAPI && this.apiAvailable) {
            try {
                await api.saveConfiguracao(chave, valor, tipo);
            } catch (error) {
                console.warn('Erro ao salvar config na API:', error);
            }
        }
        if (this.useFirebase && window.firebaseSot && window.firebaseSot.setConfig) {
            try {
                await window.firebaseSot.setConfig(chave, valor);
            } catch (e) {}
        }
        try {
            localStorage.setItem(chave, valor);
        } catch (e) {}
        return true;
    }

    /**
     * Helper para obter do localStorage
     */
    getFromLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * Sincronizar dados do localStorage para API
     */
    async syncToAPI() {
        if (!this.apiAvailable) {
            console.warn('API não disponível para sincronização');
            return;
        }

        console.log('🔄 Sincronizando dados do localStorage para API...');

        try {
            // Sincronizar viaturas
            const viaturas = this.getFromLocalStorage('viaturasCadastradas', []);
            for (const viatura of viaturas) {
                try {
                    if (viatura.id) {
                        await api.updateViatura(viatura.id, viatura);
                    } else {
                        await api.createViatura(viatura);
                    }
                } catch (error) {
                    console.warn('Erro ao sincronizar viatura:', viatura, error);
                }
            }

            // Sincronizar motoristas
            const motoristas = this.getFromLocalStorage('motoristasCadastrados', []);
            for (const motorista of motoristas) {
                try {
                    if (motorista.id) {
                        await api.updateMotorista(motorista.id, motorista);
                    } else {
                        await api.createMotorista(motorista);
                    }
                } catch (error) {
                    console.warn('Erro ao sincronizar motorista:', motorista, error);
                }
            }

            console.log('✅ Sincronização concluída');
        } catch (error) {
            console.error('Erro na sincronização:', error);
        }
    }
}

// Criar instância global
const dataService = new DataService();

// Expor para uso global
window.DataService = DataService;
window.dataService = dataService;

// Verificar API periodicamente
setInterval(() => {
    dataService.checkAPI();
}, 30000); // A cada 30 segundos

