/**
 * Serviço de Dados Unificado
 * Usa backend (API) quando disponível, fallback para localStorage
 * Facilita migração gradual do sistema
 */

class DataService {
    constructor() {
        this.useAPI = false;
        this.apiAvailable = false;
        this.apiCheckPromise = null;
        // Aguardar um pouco para garantir que api-service.js foi carregado
        setTimeout(() => this.checkAPI(), 100);
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
        return await this.apiCheckPromise;
    }

    /**
     * Obter viaturas
     */
    async getViaturas() {
        // Garantir que a verificação da API foi feita
        await this.waitForAPICheck();
        
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getViaturas();
            } catch (error) {
                console.warn('Erro ao buscar viaturas da API, usando localStorage:', error);
                // Se a API falhar, desabilitar uso da API temporariamente
                this.apiAvailable = false;
                this.useAPI = false;
                return this.getFromLocalStorage('viaturasCadastradas', []);
            }
        }
        return this.getFromLocalStorage('viaturasCadastradas', []);
    }

    /**
     * Salvar viaturas
     */
    async saveViaturas(viaturas) {
        if (this.useAPI && this.apiAvailable) {
            try {
                // Sincronizar todas as viaturas com a API
                for (const viatura of viaturas) {
                    if (viatura.id) {
                        await api.updateViatura(viatura.id, viatura);
                    } else {
                        await api.createViatura(viatura);
                    }
                }
                // Também salvar no localStorage como backup
                localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas));
                return true;
            } catch (error) {
                console.warn('Erro ao salvar viaturas na API, usando localStorage:', error);
                localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas));
                return true;
            }
        }
        localStorage.setItem('viaturasCadastradas', JSON.stringify(viaturas));
        return true;
    }

    /**
     * Obter motoristas
     */
    async getMotoristas() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getMotoristas();
            } catch (error) {
                console.warn('Erro ao buscar motoristas da API, usando localStorage:', error);
                return this.getFromLocalStorage('motoristasCadastrados', []);
            }
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
                    if (motorista.id) {
                        await api.updateMotorista(motorista.id, motorista);
                    } else {
                        await api.createMotorista(motorista);
                    }
                }
                localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas));
                return true;
            } catch (error) {
                console.warn('Erro ao salvar motoristas na API, usando localStorage:', error);
                localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas));
                return true;
            }
        }
        localStorage.setItem('motoristasCadastrados', JSON.stringify(motoristas));
        return true;
    }

    /**
     * Obter saídas administrativas
     */
    async getSaidasAdministrativas() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getSaidasAdministrativas();
            } catch (error) {
                return this.getFromLocalStorage('saidasAdministrativas', []);
            }
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
                // Também atualizar localStorage
                const saidas = this.getFromLocalStorage('saidasAdministrativas', []);
                saidas.push({ ...saida, id: result.data?.id || saida.id });
                localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas));
                return result.data || saida;
            } catch (error) {
                console.warn('Erro ao salvar na API, usando localStorage:', error);
                const saidas = this.getFromLocalStorage('saidasAdministrativas', []);
                saidas.push(saida);
                localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas));
                return saida;
            }
        }
        const saidas = this.getFromLocalStorage('saidasAdministrativas', []);
        saidas.push(saida);
        localStorage.setItem('saidasAdministrativas', JSON.stringify(saidas));
        return saida;
    }

    /**
     * Obter vistorias
     */
    async getVistorias() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getVistorias();
            } catch (error) {
                return this.getFromLocalStorage('vistoriasRealizadas', []);
            }
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
                const vistorias = this.getFromLocalStorage('vistoriasRealizadas', []);
                vistorias.push({ ...vistoria, id: result.data?.id || vistoria.id });
                localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias));
                return result.data || vistoria;
            } catch (error) {
                const vistorias = this.getFromLocalStorage('vistoriasRealizadas', []);
                vistorias.push(vistoria);
                localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias));
                return vistoria;
            }
        }
        const vistorias = this.getFromLocalStorage('vistoriasRealizadas', []);
        vistorias.push(vistoria);
        localStorage.setItem('vistoriasRealizadas', JSON.stringify(vistorias));
        return vistoria;
    }

    /**
     * Obter abastecimentos
     */
    async getAbastecimentos() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getAbastecimentos();
            } catch (error) {
                return this.getFromLocalStorage('abastecimentos', []);
            }
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
                const abastecimentos = this.getFromLocalStorage('abastecimentos', []);
                abastecimentos.push({ ...abastecimento, id: result.data?.id || abastecimento.id });
                localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
                return result.data || abastecimento;
            } catch (error) {
                const abastecimentos = this.getFromLocalStorage('abastecimentos', []);
                abastecimentos.push(abastecimento);
                localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
                return abastecimento;
            }
        }
        const abastecimentos = this.getFromLocalStorage('abastecimentos', []);
        abastecimentos.push(abastecimento);
        localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
        return abastecimento;
    }

    /**
     * Obter escala
     */
    async getEscala() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getEscala();
            } catch (error) {
                return this.getFromLocalStorage('escalaData', {});
            }
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
                const escala = this.getFromLocalStorage('escalaData', {});
                const key = `${item.ano}-${item.mes}-${item.dia}-${item.motorista_id}`;
                escala[key] = item;
                localStorage.setItem('escalaData', JSON.stringify(escala));
                return item;
            } catch (error) {
                const escala = this.getFromLocalStorage('escalaData', {});
                const key = `${item.ano}-${item.mes}-${item.dia}-${item.motorista_id}`;
                escala[key] = item;
                localStorage.setItem('escalaData', JSON.stringify(escala));
                return item;
            }
        }
        const escala = this.getFromLocalStorage('escalaData', {});
        const key = `${item.ano}-${item.mes}-${item.dia}-${item.motorista_id}`;
        escala[key] = item;
        localStorage.setItem('escalaData', JSON.stringify(escala));
        return item;
    }

    /**
     * Obter avisos
     */
    async getAvisos() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getAvisos({ ativo: 1 });
            } catch (error) {
                return this.getFromLocalStorage('avisos', []);
            }
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
                const avisos = this.getFromLocalStorage('avisos', []);
                avisos.push({ ...aviso, id: result.data?.id || aviso.id });
                localStorage.setItem('avisos', JSON.stringify(avisos));
                return result.data || aviso;
            } catch (error) {
                const avisos = this.getFromLocalStorage('avisos', []);
                avisos.push(aviso);
                localStorage.setItem('avisos', JSON.stringify(avisos));
                return aviso;
            }
        }
        const avisos = this.getFromLocalStorage('avisos', []);
        avisos.push(aviso);
        localStorage.setItem('avisos', JSON.stringify(avisos));
        return aviso;
    }

    /**
     * Obter lembretes
     */
    async getLembretes() {
        if (this.useAPI && this.apiAvailable) {
            try {
                return await api.getLembretes({ ativo: 1, concluido: 0 });
            } catch (error) {
                return this.getFromLocalStorage('lembretes_ativos', []);
            }
        }
        return this.getFromLocalStorage('lembretes_ativos', []);
    }

    /**
     * Obter configurações
     */
    async getConfiguracao(chave) {
        if (this.useAPI && this.apiAvailable) {
            try {
                const configs = await api.getConfiguracao();
                return configs[chave]?.valor || null;
            } catch (error) {
                return localStorage.getItem(chave);
            }
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
                localStorage.setItem(chave, valor);
                return true;
            } catch (error) {
                localStorage.setItem(chave, valor);
                return true;
            }
        }
        localStorage.setItem(chave, valor);
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

