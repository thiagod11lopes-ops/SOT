/**
 * Serviço API para Sistema SOT
 * Substitui o uso de localStorage por chamadas ao backend
 */

const API_BASE_URL = window.location.origin + '/api';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 segundos
    }

    /**
     * Faz uma requisição HTTP
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Erro ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('Erro na requisição API:', error);
            throw error;
        }
    }

    /**
     * GET - Obter dados
     */
    async get(endpoint, useCache = false) {
        const cacheKey = `GET:${endpoint}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const result = await this.request(endpoint, { method: 'GET' });
        
        if (useCache && result.success) {
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * POST - Criar dados
     */
    async post(endpoint, data) {
        this.clearCache(endpoint); // Limpar cache relacionado
        return await this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT - Atualizar dados
     */
    async put(endpoint, data) {
        this.clearCache(endpoint); // Limpar cache relacionado
        return await this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE - Deletar dados
     */
    async delete(endpoint) {
        this.clearCache(endpoint); // Limpar cache relacionado
        return await this.request(endpoint, {
            method: 'DELETE'
        });
    }

    /**
     * Limpar cache relacionado a um endpoint
     */
    clearCache(endpoint) {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.includes(endpoint.split('/')[0])) {
                this.cache.delete(key);
            }
        });
    }

    // ==================== VIATURAS ====================
    async getViaturas() {
        const result = await this.get('/viaturas', true);
        return result.success ? result.data : [];
    }

    async getViatura(id) {
        const result = await this.get(`/viaturas/${id}`);
        return result.success ? result.data : null;
    }

    async createViatura(viatura) {
        return await this.post('/viaturas', viatura);
    }

    async updateViatura(id, viatura) {
        return await this.put(`/viaturas/${id}`, viatura);
    }

    async deleteViatura(id) {
        return await this.delete(`/viaturas/${id}`);
    }

    // ==================== MOTORISTAS ====================
    async getMotoristas() {
        const result = await this.get('/motoristas', true);
        return result.success ? result.data : [];
    }

    async getMotorista(id) {
        const result = await this.get(`/motoristas/${id}`);
        return result.success ? result.data : null;
    }

    async createMotorista(motorista) {
        return await this.post('/motoristas', motorista);
    }

    async updateMotorista(id, motorista) {
        return await this.put(`/motoristas/${id}`, motorista);
    }

    async deleteMotorista(id) {
        return await this.delete(`/motoristas/${id}`);
    }

    // ==================== SAÍDAS ADMINISTRATIVAS ====================
    async getSaidasAdministrativas(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/saidas-administrativas?${params}` : '/saidas-administrativas';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async getSaidaAdministrativa(id) {
        const result = await this.get(`/saidas-administrativas/${id}`);
        return result.success ? result.data : null;
    }

    async createSaidaAdministrativa(saida) {
        return await this.post('/saidas-administrativas', saida);
    }

    async updateSaidaAdministrativa(id, saida) {
        return await this.put(`/saidas-administrativas/${id}`, saida);
    }

    async deleteSaidaAdministrativa(id) {
        return await this.delete(`/saidas-administrativas/${id}`);
    }

    // ==================== SAÍDAS DE AMBULÂNCIAS ====================
    async getSaidasAmbulancias(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/saidas-ambulancias?${params}` : '/saidas-ambulancias';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async createSaidaAmbulancia(saida) {
        return await this.post('/saidas-ambulancias', saida);
    }

    async updateSaidaAmbulancia(id, saida) {
        return await this.put(`/saidas-ambulancias/${id}`, saida);
    }

    async deleteSaidaAmbulancia(id) {
        return await this.delete(`/saidas-ambulancias/${id}`);
    }

    // ==================== VISTORIAS ====================
    async getVistorias(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/vistorias?${params}` : '/vistorias';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async getVistoria(id) {
        const result = await this.get(`/vistorias/${id}`);
        return result.success ? result.data : null;
    }

    async createVistoria(vistoria) {
        return await this.post('/vistorias', vistoria);
    }

    async updateVistoria(id, vistoria) {
        return await this.put(`/vistorias/${id}`, vistoria);
    }

    async deleteVistoria(id) {
        return await this.delete(`/vistorias/${id}`);
    }

    // ==================== ABASTECIMENTOS ====================
    async getAbastecimentos(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/abastecimentos?${params}` : '/abastecimentos';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async createAbastecimento(abastecimento) {
        return await this.post('/abastecimentos', abastecimento);
    }

    async updateAbastecimento(id, abastecimento) {
        return await this.put(`/abastecimentos/${id}`, abastecimento);
    }

    async deleteAbastecimento(id) {
        return await this.delete(`/abastecimentos/${id}`);
    }

    // ==================== ESCALA ====================
    async getEscala(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/escala?${params}` : '/escala';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async saveEscala(item) {
        return await this.post('/escala', item);
    }

    async deleteEscala(id) {
        return await this.delete(`/escala/${id}`);
    }

    // ==================== AVISOS ====================
    async getAvisos(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/avisos?${params}` : '/avisos';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async createAviso(aviso) {
        return await this.post('/avisos', aviso);
    }

    async updateAviso(id, aviso) {
        return await this.put(`/avisos/${id}`, aviso);
    }

    async deleteAviso(id) {
        return await this.delete(`/avisos/${id}`);
    }

    // ==================== LEMBRETES ====================
    async getLembretes(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/lembretes?${params}` : '/lembretes';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async createLembrete(lembrete) {
        return await this.post('/lembretes', lembrete);
    }

    async updateLembrete(id, lembrete) {
        return await this.put(`/lembretes/${id}`, lembrete);
    }

    async deleteLembrete(id) {
        return await this.delete(`/lembretes/${id}`);
    }

    // ==================== EQUIPAMENTOS ====================
    async getEquipamentos() {
        const result = await this.get('/equipamentos', true);
        return result.success ? result.data : [];
    }

    async createEquipamento(equipamento) {
        return await this.post('/equipamentos', equipamento);
    }

    async updateEquipamento(id, equipamento) {
        return await this.put(`/equipamentos/${id}`, equipamento);
    }

    async deleteEquipamento(id) {
        return await this.delete(`/equipamentos/${id}`);
    }

    async getMovimentacoes(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/equipamentos/movimentacoes?${params}` : '/equipamentos/movimentacoes';
        const result = await this.get(endpoint, true);
        return result.success ? result.data : [];
    }

    async createMovimentacao(movimentacao) {
        return await this.post('/equipamentos/movimentacoes', movimentacao);
    }

    // ==================== CONFIGURAÇÕES ====================
    async getConfiguracao() {
        const result = await this.get('/configuracao/settings');
        return result.success ? result.settings : {};
    }

    async saveConfiguracao(chave, valor, tipo = 'string') {
        return await this.post('/configuracao/settings', { chave, valor, tipo });
    }

    async getPassword() {
        return await this.get('/configuracao/password');
    }

    async updatePassword(oldPassword, newPassword) {
        return await this.post('/configuracao/password', { oldPassword, newPassword });
    }

    async getDataPath() {
        const result = await this.get('/configuracao/data-path');
        return result.success ? result.dataPath : null;
    }

    async setDataPath(path) {
        return await this.post('/configuracao/data-path', { dataPath: path });
    }

    // ==================== BACKUP ====================
    async createBackup() {
        return await this.post('/backup/create');
    }

    async listBackups() {
        const result = await this.get('/backup/list');
        return result.success ? result.backups : [];
    }

    async restoreBackup(backupPath, mode = 'merge') {
        return await this.post('/backup/restore', { backupPath, mode });
    }

    async exportBackup() {
        const result = await this.get('/backup/export');
        return result;
    }

    // ==================== ESTATÍSTICAS ====================
    async getEstatisticasGerais() {
        const result = await this.get('/estatisticas/geral');
        return result.success ? result.data : {};
    }

    async getEstatisticasPeriodo(inicio, fim, tipo) {
        const result = await this.get(`/estatisticas/periodo?inicio=${inicio}&fim=${fim}&tipo=${tipo}`);
        return result.success ? result.data : {};
    }

    async getEstatisticasViaturas() {
        const result = await this.get('/estatisticas/viaturas');
        return result.success ? result.data : [];
    }

    async getEstatisticasAbastecimentos(mes, ano) {
        const params = new URLSearchParams({ mes, ano }).toString();
        const result = await this.get(`/estatisticas/abastecimentos?${params}`);
        return result.success ? result.data : [];
    }

    // ==================== HEALTH CHECK ====================
    async healthCheck() {
        try {
            const result = await this.get('/health');
            return result.status === 'OK';
        } catch (error) {
            return false;
        }
    }
}

// Criar instância global
const api = new APIService();

// Expor para uso global
window.APIService = APIService;
window.api = api;

