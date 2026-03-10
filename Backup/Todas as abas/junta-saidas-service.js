/**
 * Serviço de Junção Inteligente de Saídas
 * Detecta saídas próximas geograficamente e sugere junção automática
 * Baseado em proximidade de bairros e cidades (até 10km)
 */

class JuntaSaidasService {
    constructor() {
        this.distanciaMaxima = 10; // 10 quilômetros
        this.coordenadasBairros = new Map();
        this.cacheDistancias = new Map();
        this.origemFixa = {
            cidade: 'Rio de Janeiro',
            bairro: 'Lins de Vasconcelos',
            lat: -22.8833,
            lng: -43.3339
        };
        this.initializeCoordenadas();
    }

    /**
     * Inicializa coordenadas de bairros conhecidos (Rio de Janeiro)
     * Usa API de geocoding como fallback
     */
    initializeCoordenadas() {
        // Coordenadas aproximadas de bairros do Rio de Janeiro
        const bairrosRJ = {
            'Rio de Janeiro': {
                'Saúde': { lat: -22.9028, lng: -43.2075 },
                'Centro': { lat: -22.9068, lng: -43.1729 },
                'Lapa': { lat: -22.9136, lng: -43.1836 },
                'Glória': { lat: -22.9242, lng: -43.1742 },
                'Flamengo': { lat: -22.9328, lng: -43.1753 },
                'Botafogo': { lat: -22.9495, lng: -43.1838 },
                'Copacabana': { lat: -22.9711, lng: -43.1822 },
                'Ipanema': { lat: -22.9833, lng: -43.2036 },
                'Leblon': { lat: -22.9822, lng: -43.2228 },
                'Tijuca': { lat: -22.9258, lng: -43.2331 },
                'Vila Isabel': { lat: -22.9239, lng: -43.2450 },
                'Meier': { lat: -22.9042, lng: -43.2825 },
                'Méier': { lat: -22.9042, lng: -43.2825 },
                'Madureira': { lat: -22.8708, lng: -43.3417 },
                'Bangu': { lat: -22.8814, lng: -43.4686 },
                'Barra da Tijuca': { lat: -23.0064, lng: -43.3631 },
                'Jacarepaguá': { lat: -22.9953, lng: -43.3603 },
                'Recreio': { lat: -23.0289, lng: -43.4653 },
                'Santa Teresa': { lat: -22.9208, lng: -43.1858 },
                'Catete': { lat: -22.9281, lng: -43.1786 },
                'Laranjeiras': { lat: -22.9339, lng: -43.1822 },
                'Cosme Velho': { lat: -22.9486, lng: -43.1944 },
                'Urca': { lat: -22.9475, lng: -43.1667 },
                'Maracanã': { lat: -22.9125, lng: -43.2306 },
                'Rio Comprido': { lat: -22.9314, lng: -43.2094 },
                'Cidade Nova': { lat: -22.9064, lng: -43.1881 },
                'Cidade Velha': { lat: -22.9028, lng: -43.1728 },
                'Praça Mauá': { lat: -22.8956, lng: -43.1844 },
                'Santo Cristo': { lat: -22.9006, lng: -43.1889 },
                'Gamboa': { lat: -22.9061, lng: -43.1875 },
                'Caju': { lat: -22.8906, lng: -43.1922 },
                'Benfica': { lat: -22.9136, lng: -43.2325 },
                'São Cristóvão': { lat: -22.9069, lng: -43.2278 },
                'Mangueira': { lat: -22.9092, lng: -43.2278 },
                'Vasco da Gama': { lat: -22.8981, lng: -43.2342 },
                'Méier': { lat: -22.9042, lng: -43.2825 },
                'Engenho de Dentro': { lat: -22.9047, lng: -43.2775 },
                'Piedade': { lat: -22.8894, lng: -43.2922 },
                'Quintino': { lat: -22.8836, lng: -43.2811 },
                'Cachambi': { lat: -22.8789, lng: -43.2753 },
                'Tomás Coelho': { lat: -22.8725, lng: -43.2711 },
                'Engenho Novo': { lat: -22.8614, lng: -43.2644 },
                'Inhaúma': { lat: -22.8739, lng: -43.2614 },
                'Del Castilho': { lat: -22.8886, lng: -43.2600 },
                'Maria da Graça': { lat: -22.8889, lng: -43.2481 },
                'Pilares': { lat: -22.8686, lng: -43.2472 },
                'Abolição': { lat: -22.8650, lng: -43.2428 },
                'Encantado': { lat: -22.8753, lng: -43.2428 },
                'Riachuelo': { lat: -22.8814, lng: -43.2336 },
                'São Francisco Xavier': { lat: -22.8931, lng: -43.2397 },
                'Vila Isabel': { lat: -22.9239, lng: -43.2450 },
                'Andaraí': { lat: -22.9281, lng: -43.2414 },
                'Grajaú': { lat: -22.9461, lng: -43.2458 },
                'Alto da Boa Vista': { lat: -22.9633, lng: -43.2486 },
                'Gávea': { lat: -22.9786, lng: -43.2289 },
                'São Conrado': { lat: -23.0011, lng: -43.2467 },
                'Rocinha': { lat: -22.9886, lng: -43.2475 },
                'Vidigal': { lat: -22.9897, lng: -43.2247 },
                'Leme': { lat: -22.9664, lng: -43.1706 },
                'Arpoador': { lat: -22.9872, lng: -43.1908 },
                'Bairro Peixoto': { lat: -22.9806, lng: -43.1953 },
                'Humaitá': { lat: -22.9564, lng: -43.1922 },
                'Catumbi': { lat: -22.9147, lng: -43.2000 },
                'Pequena África': { lat: -22.8989, lng: -43.1919 },
                'Cidade Nova': { lat: -22.9064, lng: -43.1881 },
                'Paquetá': { lat: -22.7631, lng: -43.1039 },
                'Ilha do Governador': { lat: -22.8139, lng: -43.2089 },
                'Ramos': { lat: -22.8642, lng: -43.2544 },
                'Olaria': { lat: -22.8647, lng: -43.2656 },
                'Penha': { lat: -22.8575, lng: -43.2750 },
                'Brás de Pina': { lat: -22.8494, lng: -43.2789 },
                'Vigário Geral': { lat: -22.8389, lng: -43.2878 },
                'Parada de Lucas': { lat: -22.8322, lng: -43.2869 },
                'Bonsucesso': { lat: -22.8631, lng: -43.2517 },
                'Manguinhos': { lat: -22.8686, lng: -43.2397 },
                'Complexo do Alemão': { lat: -22.8739, lng: -43.2597 },
                'Maré': { lat: -22.8656, lng: -43.2403 },
                'Jacarezinho': { lat: -22.8797, lng: -43.2642 },
                'Cidade de Deus': { lat: -22.9964, lng: -43.3606 },
                'Realengo': { lat: -22.8800, lng: -43.4125 },
                'Bangu': { lat: -22.8814, lng: -43.4686 },
                'Padre Miguel': { lat: -22.8689, lng: -43.4522 },
                'Bangu': { lat: -22.8814, lng: -43.4686 },
                'Guaratiba': { lat: -23.0406, lng: -43.5569 },
                'Sepetiba': { lat: -22.9561, lng: -43.7111 },
                'Santa Cruz': { lat: -22.9236, lng: -43.6858 },
                'Paciência': { lat: -22.9356, lng: -43.6594 },
                'Cosmos': { lat: -22.9056, lng: -43.6236 },
                'Inhoaíba': { lat: -22.8947, lng: -43.6147 },
                'Campo Grande': { lat: -22.9019, lng: -43.5600 },
                'Senador Camará': { lat: -22.8972, lng: -43.5308 },
                'Santíssimo': { lat: -22.8886, lng: -43.5081 },
                'Bangu': { lat: -22.8814, lng: -43.4686 },
                'Gericinó': { lat: -22.8825, lng: -43.4403 },
                'Magalhães Bastos': { lat: -22.8850, lng: -43.4181 },
                'Vila Militar': { lat: -22.8819, lng: -43.4125 },
                'Deodoro': { lat: -22.8772, lng: -43.4031 },
                'Vila Valqueire': { lat: -22.8925, lng: -43.4011 },
                'Taquara': { lat: -22.9206, lng: -43.3867 },
                'Pechincha': { lat: -22.9308, lng: -43.3783 },
                'Curicica': { lat: -22.9489, lng: -43.3736 },
                'Tanque': { lat: -22.9589, lng: -43.3767 },
                'Gardênia Azul': { lat: -22.9694, lng: -43.3781 },
                'Anil': { lat: -22.9781, lng: -43.3781 },
                'Cidade Alta': { lat: -22.9881, lng: -43.3825 },
                'Pechincha': { lat: -22.9308, lng: -43.3783 },
                'Freguesia': { lat: -22.9400, lng: -43.3697 },
                'Jardim Sulacap': { lat: -22.9081, lng: -43.3922 },
                'Campo dos Afonsos': { lat: -22.8939, lng: -43.3956 },
                'Praça Seca': { lat: -22.9017, lng: -43.4031 },
                'Vila Kosmos': { lat: -22.8789, lng: -43.4097 },
                'Cascadura': { lat: -22.8850, lng: -43.4181 },
                'Oswaldo Cruz': { lat: -22.8803, lng: -43.4194 },
                'Madureira': { lat: -22.8708, lng: -43.3417 },
                'Irajá': { lat: -22.8608, lng: -43.3200 },
                'Colégio': { lat: -22.8611, lng: -43.3156 },
                'Cordovil': { lat: -22.8522, lng: -43.3153 },
                'Pavuna': { lat: -22.8286, lng: -43.3389 },
                'Acari': { lat: -22.8419, lng: -43.3331 },
                'Coelho Neto': { lat: -22.8589, lng: -43.3108 },
                'Honório Gurgel': { lat: -22.8650, lng: -43.3031 },
                'Bento Ribeiro': { lat: -22.8781, lng: -43.3136 },
                'Marechal Hermes': { lat: -22.8814, lng: -43.3042 },
                'Vicente de Carvalho': { lat: -22.8919, lng: -43.3042 },
                'Vila Isabel': { lat: -22.9239, lng: -43.2450 },
                'Engenheiro Leal': { lat: -22.8869, lng: -43.3167 },
                'Cavalcanti': { lat: -22.8750, lng: -43.3228 },
                'Engenho da Rainha': { lat: -22.8853, lng: -43.3322 },
                'Lins de Vasconcelos': { lat: -22.8833, lng: -43.3339 },
                'Água Santa': { lat: -22.8914, lng: -43.3461 },
                'Encantado': { lat: -22.8753, lng: -43.2428 },
                'Lins de Vasconcelos': { lat: -22.8833, lng: -43.3339 },
                'Todos os Santos': { lat: -22.8700, lng: -43.3581 },
                'Engenho de Dentro': { lat: -22.9047, lng: -43.2775 },
                'Piedade': { lat: -22.8894, lng: -43.2922 },
                'Quintino': { lat: -22.8836, lng: -43.2811 },
                'Cachambi': { lat: -22.8789, lng: -43.2753 },
                'Higienópolis': { lat: -22.8675, lng: -43.2700 },
                'Méier': { lat: -22.9042, lng: -43.2825 },
                'Engenho Novo': { lat: -22.8614, lng: -43.2644 },
                'Jacaré': { lat: -22.8689, lng: -43.2669 },
                'Jacarezinho': { lat: -22.8797, lng: -43.2642 },
                'Riachuelo': { lat: -22.8814, lng: -43.2336 },
                'Encantado': { lat: -22.8753, lng: -43.2428 },
                'São Francisco Xavier': { lat: -22.8931, lng: -43.2397 },
                'Tijuca': { lat: -22.9258, lng: -43.2331 },
                'Alto da Boa Vista': { lat: -22.9633, lng: -43.2486 },
                'Praça da Bandeira': { lat: -22.9100, lng: -43.2103 },
                'São Cristóvão': { lat: -22.9069, lng: -43.2278 },
                'Benfica': { lat: -22.9136, lng: -43.2325 },
                'Caju': { lat: -22.8906, lng: -43.1922 },
                'Catumbi': { lat: -22.9147, lng: -43.2000 },
                'Rio Comprido': { lat: -22.9314, lng: -43.2094 },
                'Santa Teresa': { lat: -22.9208, lng: -43.1858 },
                'Lapa': { lat: -22.9136, lng: -43.1836 },
                'Glória': { lat: -22.9242, lng: -43.1742 },
                'Catete': { lat: -22.9281, lng: -43.1786 },
                'Laranjeiras': { lat: -22.9339, lng: -43.1822 },
                'Cosme Velho': { lat: -22.9486, lng: -43.1944 },
                'Botafogo': { lat: -22.9495, lng: -43.1838 },
                'Urca': { lat: -22.9475, lng: -43.1667 },
                'Leme': { lat: -22.9664, lng: -43.1706 },
                'Copacabana': { lat: -22.9711, lng: -43.1822 },
                'Arpoador': { lat: -22.9872, lng: -43.1908 },
                'Ipanema': { lat: -22.9833, lng: -43.2036 },
                'Leblon': { lat: -22.9822, lng: -43.2228 },
                'Gávea': { lat: -22.9786, lng: -43.2289 },
                'Vidigal': { lat: -22.9897, lng: -43.2247 },
                'Rocinha': { lat: -22.9886, lng: -43.2475 },
                'São Conrado': { lat: -23.0011, lng: -43.2467 },
                'Barra da Tijuca': { lat: -23.0064, lng: -43.3631 },
                'Recreio dos Bandeirantes': { lat: -23.0289, lng: -43.4653 },
                'Recreio': { lat: -23.0289, lng: -43.4653 },
                'Vargem Grande': { lat: -23.0631, lng: -43.4953 },
                'Vargem Pequena': { lat: -23.0514, lng: -43.5044 },
                'Camorim': { lat: -23.0156, lng: -43.4392 },
                'Joá': { lat: -22.9925, lng: -43.2575 },
                'Itanhangá': { lat: -23.0019, lng: -43.3425 },
                'Grumarí': { lat: -23.0444, lng: -43.5178 },
                'Pepino': { lat: -23.0375, lng: -43.5131 },
                'Prainha': { lat: -23.0481, lng: -43.5189 },
                'Grumari': { lat: -23.0444, lng: -43.5178 }
            }
        };

        // Armazenar coordenadas no mapa
        for (const [cidade, bairros] of Object.entries(bairrosRJ)) {
            for (const [bairro, coords] of Object.entries(bairros)) {
                const key = `${cidade}|${bairro}`.toLowerCase();
                this.coordenadasBairros.set(key, coords);
            }
        }
    }

    /**
     * Obtém coordenadas de um bairro
     * Tenta usar cache primeiro, depois busca via geocoding se necessário
     */
    async getCoordenadas(cidade, bairro) {
        const key = `${cidade}|${bairro}`.toLowerCase().trim();
        console.log(`🗺️ Buscando coordenadas para: ${cidade} | ${bairro} (chave: ${key})`);
        
        // Verificar cache local
        if (this.coordenadasBairros.has(key)) {
            const coords = this.coordenadasBairros.get(key);
            console.log(`✅ Coordenadas encontradas no cache:`, coords);
            return coords;
        }

        // Tentar variações da chave (com/sem acentos, espaços, etc)
        const variacoes = [
            key,
            key.replace(/\s+/g, ''),
            key.replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c'),
            `${cidade.toLowerCase().trim()}|${bairro.toLowerCase().trim()}`
        ];

        for (const variacao of variacoes) {
            if (this.coordenadasBairros.has(variacao)) {
                const coords = this.coordenadasBairros.get(variacao);
                console.log(`✅ Coordenadas encontradas no cache (variação: ${variacao}):`, coords);
                // Também armazenar com a chave original
                this.coordenadasBairros.set(key, coords);
                return coords;
            }
        }

        console.log(`⚠️ Coordenadas não encontradas no cache para: ${key}`);

        // Tentar buscar via API de geocoding (OpenStreetMap Nominatim)
        try {
            const query = encodeURIComponent(`${bairro}, ${cidade}, Brasil`);
            console.log(`🌐 Buscando coordenadas via API para: ${query}`);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
                headers: {
                    'User-Agent': 'SOT-Sistema' // Necessário para Nominatim
                }
            });
            
            const data = await response.json();
            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                console.log(`✅ Coordenadas encontradas via API:`, coords);
                // Armazenar no cache para próximas buscas
                this.coordenadasBairros.set(key, coords);
                return coords;
            } else {
                console.log(`⚠️ Nenhum resultado da API para: ${query}`);
            }
        } catch (error) {
            console.warn('❌ Erro ao buscar coordenadas via API:', error);
        }

        // Se não encontrou, retornar null
        console.log(`❌ Coordenadas não encontradas para: ${cidade} | ${bairro}`);
        return null;
    }

    /**
     * Calcula distância em quilômetros entre duas coordenadas (fórmula de Haversine)
     */
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raio da Terra em quilômetros
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;
        
        return distancia;
    }

    /**
     * Converte graus para radianos
     */
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Verifica se dois destinos estão próximos o suficiente para junção
     */
    async saoProximos(cidade1, bairro1, cidade2, bairro2) {
        console.log(`🔍 Verificando proximidade: ${bairro1}, ${cidade1} ↔ ${bairro2}, ${cidade2}`);
        
        // Se cidades diferentes, não são próximos (exceto se muito perto da fronteira)
        const cidade1Normalizada = cidade1.toLowerCase().trim();
        const cidade2Normalizada = cidade2.toLowerCase().trim();
        
        if (cidade1Normalizada !== cidade2Normalizada) {
            console.log(`❌ Cidades diferentes: ${cidade1Normalizada} !== ${cidade2Normalizada}`);
            return { proximos: false, distancia: null };
        }

        console.log(`✅ Cidades iguais: ${cidade1Normalizada}`);

        // Obter coordenadas
        const coords1 = await this.getCoordenadas(cidade1, bairro1);
        const coords2 = await this.getCoordenadas(cidade2, bairro2);

        if (!coords1 || !coords2) {
            console.log(`⚠️ Coordenadas não encontradas. Usando similaridade de nomes.`);
            // Se não conseguiu coordenadas, considera próximo se bairro similar
            const similaridade = this.calcularSimilaridade(bairro1, bairro2);
            console.log(`📊 Similaridade entre "${bairro1}" e "${bairro2}": ${similaridade}`);
            const proximos = similaridade > 0.8;
            console.log(`${proximos ? '✅' : '❌'} Considerados próximos por similaridade: ${proximos}`);
            return { proximos, distancia: null, similaridade };
        }

        // Calcular distância
        const distancia = this.calcularDistancia(
            coords1.lat, coords1.lng,
            coords2.lat, coords2.lng
        );

        console.log(`📏 Distância calculada: ${distancia} km (limite: ${this.distanciaMaxima} km)`);
        const proximos = distancia <= this.distanciaMaxima;
        console.log(`${proximos ? '✅' : '❌'} Destinos ${proximos ? 'são' : 'não são'} próximos`);

        return {
            proximos,
            distancia: Math.round(distancia * 10) / 10, // Arredondar para 1 casa decimal
            coords1,
            coords2
        };
    }

    /**
     * Calcula similaridade entre strings (Levenshtein)
     */
    calcularSimilaridade(str1, str2) {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1.0;
        if (s1.includes(s2) || s2.includes(s1)) return 0.9;
        
        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0) return 1.0;
        
        const distancia = this.levenshteinDistance(s1, s2);
        return 1 - (distancia / maxLen);
    }

    /**
     * Calcula distância de Levenshtein entre duas strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[len2][len1];
    }

    /**
     * Verifica se uma saída está no caminho de outra
     * Considerando que a viatura sempre sai de Lins de Vasconcelos, RJ
     * Verifica se os destinos estão no mesmo trajeto a partir da origem fixa
     */
    async estaNoCaminho(cidade1, bairro1, cidade2, bairro2) {
        // Se não estão na mesma cidade, verificar se estão no mesmo caminho a partir da origem
        const origem = this.origemFixa;
        
        // Obter coordenadas dos destinos
        const coords1 = await this.getCoordenadas(cidade1, bairro1);
        const coords2 = await this.getCoordenadas(cidade2, bairro2);
        
        if (!coords1 || !coords2) {
            // Se não tem coordenadas, verifica proximidade simples
            if (cidade1.toLowerCase().trim() === cidade2.toLowerCase().trim()) {
                const info = await this.saoProximos(cidade1, bairro1, cidade2, bairro2);
                return info.proximos;
            }
            return false;
        }

        // Calcular distâncias da origem até cada destino
        const distOrigemDestino1 = this.calcularDistancia(
            origem.lat, origem.lng,
            coords1.lat, coords1.lng
        );
        
        const distOrigemDestino2 = this.calcularDistancia(
            origem.lat, origem.lng,
            coords2.lat, coords2.lng
        );

        // Calcular distância entre os dois destinos
        const distEntreDestinos = this.calcularDistancia(
            coords1.lat, coords1.lng,
            coords2.lat, coords2.lng
        );

        // Verificar se estão no mesmo caminho:
        // 1. Se a distância entre destinos é pequena (até 20km)
        // 2. OU se um destino está "no caminho" do outro (distância total menor que a soma direta)
        const distTotal = distOrigemDestino1 + distOrigemDestino2;
        const distDireta = distEntreDestinos;
        const distMaximaCaminho = Math.max(distOrigemDestino1, distOrigemDestino2) * 1.2; // 20% de tolerância

        // Se estão próximos entre si (até 20km), estão no mesmo caminho
        if (distEntreDestinos <= 20) {
            return {
                noCaminho: true,
                distancia: Math.round(distEntreDestinos * 10) / 10,
                razao: 'Destinos próximos'
            };
        }

        // Se a soma das distâncias da origem é similar à distância direta entre destinos,
        // significa que estão no mesmo "caminho geral" a partir da origem
        if (distTotal <= distMaximaCaminho) {
            return {
                noCaminho: true,
                distancia: Math.round(distEntreDestinos * 10) / 10,
                razao: 'Mesmo trajeto a partir da origem'
            };
        }

        return { noCaminho: false, distancia: null };
    }

    /**
     * Verifica se duas datas são do mesmo dia ou dia consecutivo
     */
    saoDiasProximos(data1, data2) {
        if (!data1 || !data2) return { proximos: false, diferenca: null };

        const date1 = this.parseData(data1);
        const date2 = this.parseData(data2);

        if (!date1 || !date2) return { proximos: false, diferenca: null };

        // Calcular diferença em dias
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            proximos: diffDays <= 1, // Mesmo dia ou dia seguinte/anterior
            diferenca: diffDays,
            mesmasDia: diffDays === 0,
            diaSeguinte: diffDays === 1
        };
    }

    /**
     * Parse data de vários formatos
     */
    parseData(data) {
        if (!data) return null;

        if (data instanceof Date) {
            return new Date(data.getFullYear(), data.getMonth(), data.getDate());
        }

        if (typeof data === 'string') {
            // Formato YYYY-MM-DD ou DD/MM/YYYY
            if (data.includes('/')) {
                const partes = data.split('/');
                if (partes.length === 3) {
                    // Tentar formatos: DD/MM/YYYY ou YYYY/MM/DD
                    const parte1 = parseInt(partes[0]);
                    const parte2 = parseInt(partes[1]);
                    const parte3 = parseInt(partes[2]);
                    
                    // Se a primeira parte é > 31, provavelmente é YYYY/MM/DD
                    if (parte1 > 31) {
                        return new Date(parte1, parte2 - 1, parte3);
                    } else {
                        // Caso contrário, assume DD/MM/YYYY
                        return new Date(parte3, parte2 - 1, parte1);
                    }
                }
            } else if (data.includes('-')) {
                // Formato YYYY-MM-DD ou DD-MM-YYYY
                const partes = data.split('-');
                if (partes.length === 3) {
                    const parte1 = parseInt(partes[0]);
                    const parte2 = parseInt(partes[1]);
                    const parte3 = parseInt(partes[2]);
                    
                    // Se a primeira parte é > 31, provavelmente é YYYY-MM-DD
                    if (parte1 > 31) {
                        return new Date(parte1, parte2 - 1, parte3);
                    } else {
                        // Caso contrário, assume DD-MM-YYYY
                        return new Date(parte3, parte2 - 1, parte1);
                    }
                }
                // Se não tem partes separadas por -, tentar split por T (ISO format)
                return new Date(data.split('T')[0]);
            }
        }

        if (typeof data === 'object' && data.data) {
            return this.parseData(data.data);
        }

        if (typeof data === 'object' && data.ano && data.mes && data.dia) {
            return new Date(parseInt(data.ano), parseInt(data.mes) - 1, parseInt(data.dia));
        }

        return null;
    }

    /**
     * Verifica se há saídas que podem ser juntadas
     * Agora verifica apenas por proximidade geográfica, sem restrição de motorista/viatura
     * Também verifica saídas de dias próximos e mesmo caminho
     * Retorna array de sugestões de junção
     */
    async verificarJuntasPossiveis(saidas, filtroMotorista = null, filtroViatura = null) {
        const sugestoes = [];

        // Se não especificado, verificar todas as saídas
        let saidasFiltradas = saidas;

        // Filtrar apenas se especificado
        if (filtroMotorista !== null || filtroViatura !== null) {
            saidasFiltradas = saidas.filter(saida => {
                const matchMotorista = filtroMotorista === null || saida.motorista_id === filtroMotorista;
                const matchViatura = filtroViatura === null || saida.viatura_id === filtroViatura;
                return matchMotorista && matchViatura;
            });
        }

        // Comparar cada saída com as outras
        for (let i = 0; i < saidasFiltradas.length; i++) {
            for (let j = i + 1; j < saidasFiltradas.length; j++) {
                const saida1 = saidasFiltradas[i];
                const saida2 = saidasFiltradas[j];

                // Extrair cidade e bairro das saídas
                const cidade1 = (saida1.cidade || saida1.endereco_cidade || '').trim();
                const bairro1 = (saida1.bairro || saida1.endereco_bairro || '').trim();
                const cidade2 = (saida2.cidade || saida2.endereco_cidade || '').trim();
                const bairro2 = (saida2.bairro || saida2.endereco_bairro || '').trim();

                console.log(`🔍 Comparando saídas:`, {
                    saida1: { cidade: cidade1, bairro: bairro1, id: saida1.id || saida1.temp_id },
                    saida2: { cidade: cidade2, bairro: bairro2, id: saida2.id || saida2.temp_id }
                });

                if (!cidade1 || !bairro1 || !cidade2 || !bairro2) {
                    console.log(`⚠️ Campos incompletos - pulando comparação`);
                    continue;
                }

                // Verificar proximidade geográfica
                const infoProximidade = await this.saoProximos(cidade1, bairro1, cidade2, bairro2);
                
                // Verificar se estão no mesmo caminho (considerando origem fixa)
                const infoCaminho = await this.estaNoCaminho(cidade1, bairro1, cidade2, bairro2);
                
                // Verificar se são dias próximos
                const infoDias = this.saoDiasProximos(
                    saida1.data || saida1.data_saida || saida1.dataCadastro,
                    saida2.data || saida2.data_saida || saida2.dataCadastro
                );

                // Debug: Log para identificar problemas
                console.log('🔍 Verificando junção:', {
                    saida1: { cidade: cidade1, bairro: bairro1, data: saida1.data || saida1.data_saida || saida1.dataCadastro },
                    saida2: { cidade: cidade2, bairro: bairro2, data: saida2.data || saida2.data_saida || saida2.dataCadastro },
                    infoProximidade,
                    infoCaminho,
                    infoDias
                });

                // Critérios para sugerir junção:
                // 1. Mesmo endereço exato - sempre sugerir se dias próximos
                // 2. Destinos próximos (até 10km) - sugerir independente de dias
                // 3. Mesmo caminho (até 20km) - sugerir independente de dias
                // 4. Destinos muito próximos (até 5km) - sempre sugerir

                let deveSugerir = false;
                const motivos = [];
                let distancia = null;

                // Mesmo endereço exato
                if (cidade1.toLowerCase().trim() === cidade2.toLowerCase().trim() &&
                    bairro1.toLowerCase().trim() === bairro2.toLowerCase().trim()) {
                    deveSugerir = true;
                    motivos.push('Mesmo endereço');
                    if (infoDias.proximos) {
                        motivos.push(infoDias.mesmasDia ? 'Mesmo dia' : 'Dias próximos');
                    } else if (infoDias.diferenca !== null) {
                        motivos.push(`Diferença de ${infoDias.diferenca} dia(s)`);
                    }
                }
                // Destinos próximos (até 10km) - AGORA SUGERE MESMO COM DIAS DIFERENTES
                else if (infoProximidade.proximos) {
                    distancia = infoProximidade.distancia;
                    deveSugerir = true;
                    motivos.push(`Destinos próximos (${distancia} km)`);
                    if (infoDias.proximos) {
                        motivos.push(infoDias.mesmasDia ? 'Mesmo dia' : 'Dias próximos');
                    } else if (infoDias.diferenca !== null && infoDias.diferenca <= 7) {
                        // Aceitar até 7 dias de diferença se estiverem próximos
                        motivos.push(`Diferença de ${infoDias.diferenca} dia(s)`);
                    }
                }
                // Mesmo caminho (até 20km) - AGORA SUGERE MESMO COM DIAS DIFERENTES
                else if (infoCaminho.noCaminho) {
                    distancia = infoCaminho.distancia;
                    deveSugerir = true;
                    motivos.push(`Mesmo caminho a partir da origem (${infoCaminho.razao})`);
                    motivos.push(`Distância: ${distancia} km`);
                    if (infoDias.proximos) {
                        motivos.push(infoDias.mesmasDia ? 'Mesmo dia' : 'Dias próximos');
                    } else if (infoDias.diferenca !== null && infoDias.diferenca <= 7) {
                        motivos.push(`Diferença de ${infoDias.diferenca} dia(s)`);
                    }
                }
                // Destinos muito próximos (até 5km) - sempre sugerir
                else if (infoProximidade.proximos && infoProximidade.distancia <= 5) {
                    distancia = infoProximidade.distancia;
                    deveSugerir = true;
                    motivos.push(`Destinos muito próximos (${distancia} km)`);
                    if (infoDias.proximos) {
                        motivos.push(infoDias.mesmasDia ? 'Mesmo dia' : `Dias próximos (${infoDias.diferenca} dia${infoDias.diferenca > 1 ? 's' : ''})`);
                    } else if (infoDias.diferenca !== null) {
                        motivos.push(`Diferença de ${infoDias.diferenca} dia(s)`);
                    }
                }

                if (deveSugerir) {
                    sugestoes.push({
                        saida1: saida1,
                        saida2: saida2,
                        distancia: distancia || infoProximidade.distancia || infoCaminho.distancia,
                        cidade: cidade1,
                        bairros: [bairro1, bairro2],
                        motivos: motivos,
                        diasProximos: infoDias.proximos,
                        diferencaDias: infoDias.diferenca,
                        mesmoCaminho: infoCaminho.noCaminho || false,
                        tipo: infoProximidade.proximos ? 'proximidade' : (infoCaminho.noCaminho ? 'caminho' : 'endereco')
                    });
                }
            }
        }

        // Ordenar sugestões por relevância (menor distância primeiro, depois mesmo dia)
        sugestoes.sort((a, b) => {
            // Primeiro: mesmo dia
            if (a.diasProximos && a.diferencaDias === 0 && b.diferencaDias !== 0) return -1;
            if (b.diasProximos && b.diferencaDias === 0 && a.diferencaDias !== 0) return 1;
            // Segundo: menor distância
            if (a.distancia && b.distancia) {
                return a.distancia - b.distancia;
            }
            return 0;
        });

        return sugestoes;
    }

    /**
     * Exibe modal de seleção de horário para junção
     */
    async exibirModalHorario(sugestao) {
        return new Promise((resolve) => {
            const horario1 = this.formatarHorario(sugestao.saida1.horario || sugestao.saida1.hora || sugestao.saida1.saida);
            const horario2 = this.formatarHorario(sugestao.saida2.horario || sugestao.saida2.hora || sugestao.saida2.saida);
            
            // Usar o horário mais cedo como padrão
            const parseHorario = (h) => {
                if (!h) return 0;
                if (typeof h === 'string' && h.includes(':')) {
                    const [hora, minuto] = h.split(':');
                    return parseInt(hora || 0) * 60 + parseInt(minuto || 0);
                }
                return 0;
            };
            
            const minutos1 = parseHorario(horario1);
            const minutos2 = parseHorario(horario2);
            const horarioPadrao = minutos1 <= minutos2 ? horario1 : horario2;
            
            const modal = document.createElement('div');
            modal.className = 'modal-juntar-horario';
            modal.innerHTML = `
                <div class="modal-juntar-overlay"></div>
                <div class="modal-juntar-content modal-juntar-horario-content">
                    <div class="modal-juntar-header">
                        <h3><i class="fas fa-clock"></i> Selecionar Horário da Saída Juntada</h3>
                        <button class="modal-juntar-close">&times;</button>
                    </div>
                    <div class="modal-juntar-body">
                        <p class="modal-juntar-descricao">
                            Selecione o horário que será usado para a saída juntada:
                        </p>
                        
                        <div class="horario-options">
                            <div class="horario-option">
                                <label>
                                    <input type="radio" name="horarioJuntado" value="${horario1}" ${horario1 === horarioPadrao ? 'checked' : ''}>
                                    <span class="horario-label">Saída 1: ${horario1} (${sugestao.bairros[0]})</span>
                                </label>
                            </div>
                            
                            <div class="horario-option">
                                <label>
                                    <input type="radio" name="horarioJuntado" value="${horario2}" ${horario2 === horarioPadrao ? 'checked' : ''}>
                                    <span class="horario-label">Saída 2: ${horario2} (${sugestao.bairros[1]})</span>
                                </label>
                            </div>
                            
                            <div class="horario-option">
                                <label>
                                    <input type="radio" name="horarioJuntado" value="custom" id="horarioCustom">
                                    <span class="horario-label">Outro horário:</span>
                                </label>
                                <input type="time" id="horarioCustomInput" class="horario-custom-input" value="${horarioPadrao}" style="margin-top: 8px; padding: 8px; width: 100%; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-juntar-footer">
                        <button class="btn-juntar-nao" data-acao="cancelar">Cancelar</button>
                        <button class="btn-juntar-sim" data-acao="confirmar">Confirmar</button>
                    </div>
                </div>
            `;

            // Adicionar estilos se ainda não foram adicionados
            if (!document.getElementById('modal-juntar-horario-styles')) {
                const styles = document.createElement('style');
                styles.id = 'modal-juntar-horario-styles';
                styles.textContent = `
                    .modal-juntar-horario {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-juntar-horario-content {
                        max-width: 400px;
                    }
                    
                    .horario-options {
                        margin: 15px 0;
                    }
                    
                    .horario-option {
                        margin-bottom: 15px;
                        padding: 12px;
                        background: #f8f9fa;
                        border-radius: 6px;
                        border: 2px solid #e0e0e0;
                        transition: border-color 0.2s;
                    }
                    
                    .horario-option:has(input:checked) {
                        border-color: #4a69bd;
                        background: #e3f2fd;
                    }
                    
                    .horario-option label {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    
                    .horario-option input[type="radio"] {
                        width: 18px;
                        height: 18px;
                        cursor: pointer;
                    }
                    
                    .horario-label {
                        flex: 1;
                        color: #555;
                    }
                    
                    .horario-custom-input {
                        display: block;
                        margin-top: 8px;
                    }
                    
                    .horario-option:has(#horarioCustom:not(:checked)) .horario-custom-input {
                        opacity: 0.5;
                        pointer-events: none;
                    }
                `;
                document.head.appendChild(styles);
            }

            // Adicionar event listeners
            const btnConfirmar = modal.querySelector('[data-acao="confirmar"]');
            const btnCancelar = modal.querySelector('[data-acao="cancelar"]');
            const btnClose = modal.querySelector('.modal-juntar-close');
            const horarioCustomRadio = modal.querySelector('#horarioCustom');
            const horarioCustomInput = modal.querySelector('#horarioCustomInput');

            horarioCustomRadio.addEventListener('change', () => {
                horarioCustomInput.disabled = !horarioCustomRadio.checked;
                if (horarioCustomRadio.checked) {
                    horarioCustomInput.focus();
                }
            });

            const fechar = (horario = null) => {
                document.body.removeChild(modal);
                resolve(horario);
            };

            btnConfirmar.addEventListener('click', () => {
                const selected = modal.querySelector('input[name="horarioJuntado"]:checked');
                if (selected) {
                    let horario = selected.value;
                    if (selected.value === 'custom') {
                        horario = horarioCustomInput.value;
                        if (!horario) {
                            alert('Por favor, selecione um horário personalizado.');
                            return;
                        }
                    }
                    fechar(horario);
                }
            });

            const fecharComReabertura = () => {
                document.body.removeChild(modal);
                resolve(null);
            };

            btnCancelar.addEventListener('click', fecharComReabertura);
            btnClose.addEventListener('click', fecharComReabertura);
            modal.querySelector('.modal-juntar-overlay').addEventListener('click', fecharComReabertura);

            document.body.appendChild(modal);
            horarioCustomInput.disabled = !horarioCustomRadio.checked;
        });
    }

    /**
     * Exibe modal de sugestão de junção
     */
    async exibirModalJuntar(sugestao) {
        return new Promise((resolve) => {
            // Criar modal
            const modal = document.createElement('div');
            modal.className = 'modal-juntar-saidas';
            modal.innerHTML = `
                <div class="modal-juntar-overlay"></div>
                <div class="modal-juntar-content">
                    <div class="modal-juntar-header">
                        <h3><i class="fas fa-map-marked-alt"></i> Sugestão de Junção de Saídas</h3>
                        <button class="modal-juntar-close">&times;</button>
                    </div>
                    <div class="modal-juntar-body">
                        <p class="modal-juntar-descricao">
                            Detectamos que existem saídas próximas geograficamente que podem ser juntadas:
                        </p>
                        
                        <div class="modal-juntar-saidas-info">
                            <div class="saida-info">
                                <h4>Saída 1</h4>
                                <p><strong>Destino:</strong> ${sugestao.bairros[0]}, ${sugestao.cidade}</p>
                                <p><strong>Data:</strong> ${this.formatarData(sugestao.saida1.data || sugestao.saida1.data_saida || sugestao.saida1.dataCadastro)}</p>
                                <p><strong>Horário:</strong> ${this.formatarHorario(sugestao.saida1.horario || sugestao.saida1.hora)}</p>
                                ${sugestao.saida1.motorista_id ? `<p><strong>Motorista ID:</strong> ${sugestao.saida1.motorista_id}</p>` : ''}
                                ${sugestao.saida1.viatura_id ? `<p><strong>Viatura ID:</strong> ${sugestao.saida1.viatura_id}</p>` : ''}
                                ${sugestao.saida1.motivo ? `<p><strong>Motivo:</strong> ${sugestao.saida1.motivo}</p>` : ''}
                            </div>
                            
                            <div class="saida-separador">
                                <i class="fas fa-arrows-alt-h"></i>
                                ${sugestao.distancia ? `<span>${sugestao.distancia} km</span>` : ''}
                                ${sugestao.diasProximos ? `<span class="dia-badge">${sugestao.diferencaDias === 0 ? 'Mesmo dia' : 'Dia seguinte'}</span>` : ''}
                            </div>
                            
                            <div class="saida-info">
                                <h4>Saída 2</h4>
                                <p><strong>Destino:</strong> ${sugestao.bairros[1]}, ${sugestao.cidade}</p>
                                <p><strong>Data:</strong> ${this.formatarData(sugestao.saida2.data || sugestao.saida2.data_saida || sugestao.saida2.dataCadastro)}</p>
                                <p><strong>Horário:</strong> ${this.formatarHorario(sugestao.saida2.horario || sugestao.saida2.hora)}</p>
                                ${sugestao.saida2.motorista_id ? `<p><strong>Motorista ID:</strong> ${sugestao.saida2.motorista_id}</p>` : ''}
                                ${sugestao.saida2.viatura_id ? `<p><strong>Viatura ID:</strong> ${sugestao.saida2.viatura_id}</p>` : ''}
                                ${sugestao.saida2.motivo ? `<p><strong>Motivo:</strong> ${sugestao.saida2.motivo}</p>` : ''}
                            </div>
                        </div>

                        <div class="modal-juntar-motivos">
                            <h4><i class="fas fa-info-circle"></i> Por que juntar?</h4>
                            <ul>
                                ${sugestao.motivos.map(motivo => `<li>${motivo}</li>`).join('')}
                            </ul>
                        </div>

                        <div class="modal-juntar-beneficios">
                            <p><i class="fas fa-check-circle"></i> Otimização de rota e economia de combustível</p>
                        </div>
                    </div>
                    <div class="modal-juntar-footer">
                        <button class="btn-juntar-nao" data-acao="nao">Não Juntar</button>
                        <button class="btn-juntar-sim" data-acao="sim">Juntar Saídas</button>
                    </div>
                </div>
            `;

            // Adicionar estilos se ainda não foram adicionados
            if (!document.getElementById('modal-juntar-styles')) {
                const styles = document.createElement('style');
                styles.id = 'modal-juntar-styles';
                styles.textContent = `
                    .modal-juntar-saidas {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-juntar-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }

                    .modal-juntar-content {
                        position: relative;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                        max-width: 450px;
                        width: 85%;
                        max-height: 85vh;
                        overflow-y: auto;
                        z-index: 10001;
                        animation: modalSlideIn 0.3s ease-out;
                    }

                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-50px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .modal-juntar-header {
                        padding: 12px 18px;
                        border-bottom: 2px solid #e0e0e0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(135deg, #4a69bd 0%, #6c5ce7 100%);
                        color: white;
                        border-radius: 8px 8px 0 0;
                    }

                    .modal-juntar-header h3 {
                        margin: 0;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .modal-juntar-close {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 28px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background 0.2s;
                    }

                    .modal-juntar-close:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .modal-juntar-body {
                        padding: 15px 18px;
                    }

                    .modal-juntar-descricao {
                        margin-bottom: 12px;
                        color: #555;
                        line-height: 1.5;
                        font-size: 13px;
                    }

                    .modal-juntar-saidas-info {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 15px;
                        padding: 12px;
                        background: #f8f9fa;
                        border-radius: 6px;
                    }

                    .saida-info {
                        flex: 1;
                        padding: 10px;
                        background: white;
                        border-radius: 4px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }

                    .saida-info h4 {
                        margin: 0 0 6px 0;
                        color: #4a69bd;
                        font-size: 14px;
                    }

                    .saida-info p {
                        margin: 3px 0;
                        font-size: 12px;
                        color: #666;
                    }

                    .saida-separador {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        color: #4a69bd;
                        font-weight: bold;
                    }

                    .saida-separador i {
                        font-size: 18px;
                    }

                    .saida-separador span {
                        font-size: 11px;
                        background: #4a69bd;
                        color: white;
                        padding: 3px 6px;
                        border-radius: 10px;
                    }

                    .dia-badge {
                        font-size: 10px;
                        background: #28a745;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 8px;
                        margin-top: 3px;
                        display: inline-block;
                    }

                    .modal-juntar-motivos {
                        margin-bottom: 12px;
                        padding: 10px 12px;
                        background: #e3f2fd;
                        border-left: 3px solid #4a69bd;
                        border-radius: 4px;
                    }

                    .modal-juntar-motivos h4 {
                        margin: 0 0 6px 0;
                        color: #4a69bd;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .modal-juntar-motivos ul {
                        margin: 0;
                        padding-left: 18px;
                    }

                    .modal-juntar-motivos li {
                        margin: 3px 0;
                        color: #555;
                        font-size: 12px;
                    }

                    .modal-juntar-beneficios {
                        padding: 8px 12px;
                        background: #e8f5e9;
                        border-left: 3px solid #28a745;
                        border-radius: 4px;
                        margin-bottom: 12px;
                    }

                    .modal-juntar-beneficios p {
                        margin: 0;
                        color: #2e7d32;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .modal-juntar-footer {
                        padding: 12px 18px;
                        border-top: 2px solid #e0e0e0;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }

                    .btn-juntar-nao,
                    .btn-juntar-sim {
                        padding: 8px 20px;
                        border: none;
                        border-radius: 5px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .btn-juntar-nao {
                        background: #e0e0e0;
                        color: #555;
                    }

                    .btn-juntar-nao:hover {
                        background: #d0d0d0;
                    }

                    .btn-juntar-sim {
                        background: #28a745;
                        color: white;
                    }

                    .btn-juntar-sim:hover {
                        background: #218838;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    }
                `;
                document.head.appendChild(styles);
            }

            // Adicionar event listeners
            const btnSim = modal.querySelector('.btn-juntar-sim');
            const btnNao = modal.querySelector('.btn-juntar-nao');
            const btnClose = modal.querySelector('.modal-juntar-close');

            const fecharModal = (acao, horario = null) => {
                document.body.removeChild(modal);
                resolve({ aceitar: acao === 'sim', horario: horario });
            };

            btnSim.addEventListener('click', async () => {
                // Fechar o modal de sugestão primeiro
                document.body.removeChild(modal);
                
                // Aguardar um pouco para garantir que o modal foi removido
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Abrir modal de seleção de horário
                const horario = await this.exibirModalHorario(sugestao);
                if (horario) {
                    resolve({ aceitar: true, horario: horario });
                } else {
                    // Se cancelou, reabrir o modal de junção
                    const resultadoReabertura = await this.exibirModalJuntar(sugestao);
                    resolve(resultadoReabertura);
                }
            });
            btnNao.addEventListener('click', () => fecharModal('nao'));
            btnClose.addEventListener('click', () => fecharModal('nao'));

            // Fechar ao clicar no overlay
            modal.querySelector('.modal-juntar-overlay').addEventListener('click', () => fecharModal('nao'));

            // Adicionar ao DOM
            document.body.appendChild(modal);
        });
    }

    /**
     * Formata horário para exibição
     */
    formatarHorario(horario) {
        if (!horario) return 'Não informado';
        if (typeof horario === 'string') return horario;
        if (typeof horario === 'object' && horario.hora) {
            return `${horario.hora}:${String(horario.minuto || 0).padStart(2, '0')}`;
        }
        return String(horario);
    }

    /**
     * Formata data para exibição
     */
    formatarData(data) {
        if (!data) return 'Não informado';
        
        const date = this.parseData(data);
        if (!date) return String(data);
        
        // Formato DD/MM/YYYY
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        
        return `${dia}/${mes}/${ano}`;
    }

    /**
     * Formata lista de itens com vírgulas e "e" antes do último
     */
    formatarListaComE(itens) {
        if (!itens || itens.length === 0) return '';
        if (itens.length === 1) return itens[0];
        if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
        
        const todosExcetoUltimo = itens.slice(0, -1);
        const ultimo = itens[itens.length - 1];
        return `${todosExcetoUltimo.join(', ')} e ${ultimo}`;
    }

    /**
     * Separa uma lista formatada (com vírgulas e "e") em um array de itens individuais
     * Entende formatos como "A, B e C" ou "A e B" ou "A, B, C"
     */
    separarListaFormatada(listaFormatada) {
        if (!listaFormatada || typeof listaFormatada !== 'string') {
            // Se não for string, pode ser um array já separado
            if (Array.isArray(listaFormatada)) {
                return listaFormatada.filter(item => item && item.trim());
            }
            return listaFormatada ? [String(listaFormatada)] : [];
        }

        // Remover espaços extras
        let texto = listaFormatada.trim();
        if (!texto) return [];

        // Se a lista formatada tem " e " (separador de último item)
        if (texto.includes(' e ')) {
            // Dividir por " e " para separar o último item
            const partes = texto.split(' e ');
            
            if (partes.length === 2) {
                // Formato: "A, B e C" ou "A e B"
                const antesDoE = partes[0].trim();
                const depoisDoE = partes[1].trim();
                
                // Separar os itens antes do "e" por vírgula
                const itensAntesDoE = antesDoE.split(',').map(item => item.trim()).filter(item => item);
                const itens = [...itensAntesDoE, depoisDoE];
                return itens.filter(item => item);
            } else if (partes.length > 2) {
                // Caso raro: múltiplos " e " (pode ocorrer em nomes de setores)
                // Neste caso, tratar de forma mais simples
                return texto.split(',').map(item => item.replace(/\s+e\s+/g, ' e ').trim()).filter(item => item);
            }
        }

        // Se não tem " e ", separar apenas por vírgulas
        if (texto.includes(',')) {
            return texto.split(',').map(item => item.trim()).filter(item => item);
        }

        // Se não tem separadores, retornar como único item
        return [texto];
    }

    /**
     * Junta duas saídas em uma
     */
    juntarSaidas(saida1, saida2, horarioJuntado = null) {
        // Determinar qual saída tem horário mais cedo
        const horario1 = this.parseHorario(saida1.horario || saida1.hora || saida1.saida);
        const horario2 = this.parseHorario(saida2.horario || saida2.hora || saida2.saida);
        
        const saidaPrincipal = horario1 <= horario2 ? saida1 : saida2;
        const saidaSecundaria = horario1 <= horario2 ? saida2 : saida1;

        // Usar horário selecionado ou o mais cedo como padrão
        const horarioFinal = horarioJuntado || (horario1 <= horario2 ? 
            (saida1.horario || saida1.hora || saida1.saida) : 
            (saida2.horario || saida2.hora || saida2.saida));

        // Obter destinos - separar se já estiverem formatados
        const destino1Str = saidaPrincipal.destino || `${saidaPrincipal.cidade || ''} - ${saidaPrincipal.bairro || ''}`.trim();
        const destino2Str = saidaSecundaria.destino || `${saidaSecundaria.cidade || ''} - ${saidaSecundaria.bairro || ''}`.trim();
        
        // Se a saída já foi juntada, usar destinos_multiplos se disponível
        let destinos1 = [];
        if (saidaPrincipal.juntada && saidaPrincipal.destinos_multiplos) {
            destinos1 = saidaPrincipal.destinos_multiplos.map(d => d.destino || `${d.cidade || ''} - ${d.bairro || ''}`.trim()).filter(d => d);
        } else {
            destinos1 = this.separarListaFormatada(destino1Str);
        }
        
        let destinos2 = [];
        if (saidaSecundaria.juntada && saidaSecundaria.destinos_multiplos) {
            destinos2 = saidaSecundaria.destinos_multiplos.map(d => d.destino || `${d.cidade || ''} - ${d.bairro || ''}`.trim()).filter(d => d);
        } else {
            destinos2 = this.separarListaFormatada(destino2Str);
        }
        
        // Combinar todos os destinos únicos
        const destinos = [...new Set([...destinos1, ...destinos2])].filter(d => d);

        // Obter setores - separar se já estiverem formatados
        const setor1Str = saidaPrincipal.setor || '';
        const setor2Str = saidaSecundaria.setor || '';
        
        // Se a saída já foi juntada, usar setores_multiplos se disponível
        let setores1 = [];
        if (saidaPrincipal.juntada && saidaPrincipal.setores_multiplos) {
            setores1 = Array.isArray(saidaPrincipal.setores_multiplos) 
                ? saidaPrincipal.setores_multiplos.filter(s => s)
                : this.separarListaFormatada(String(saidaPrincipal.setores_multiplos));
        } else {
            setores1 = this.separarListaFormatada(setor1Str);
        }
        
        let setores2 = [];
        if (saidaSecundaria.juntada && saidaSecundaria.setores_multiplos) {
            setores2 = Array.isArray(saidaSecundaria.setores_multiplos)
                ? saidaSecundaria.setores_multiplos.filter(s => s)
                : this.separarListaFormatada(String(saidaSecundaria.setores_multiplos));
        } else {
            setores2 = this.separarListaFormatada(setor2Str);
        }
        
        // Combinar todos os setores únicos (mantendo ordem)
        const setores = [];
        const setoresSet = new Set();
        [...setores1, ...setores2].forEach(setor => {
            const setorTrim = String(setor).trim();
            if (setorTrim && !setoresSet.has(setorTrim)) {
                setores.push(setorTrim);
                setoresSet.add(setorTrim);
            }
        });

        // Criar destinos_multiplos com todos os destinos individuais
        const destinosMultiplos = [];
        
        // Adicionar destinos da saída principal
        if (saidaPrincipal.juntada && saidaPrincipal.destinos_multiplos) {
            destinosMultiplos.push(...saidaPrincipal.destinos_multiplos);
        } else {
            destinosMultiplos.push({
                bairro: saidaPrincipal.bairro || saidaPrincipal.endereco_bairro,
                cidade: saidaPrincipal.cidade || saidaPrincipal.endereco_cidade,
                destino: destinos1[0] || destino1Str,
                horario: saidaPrincipal.horario || saidaPrincipal.hora || saidaPrincipal.saida
            });
        }
        
        // Adicionar destinos da saída secundária
        if (saidaSecundaria.juntada && saidaSecundaria.destinos_multiplos) {
            destinosMultiplos.push(...saidaSecundaria.destinos_multiplos);
        } else {
            destinosMultiplos.push({
                bairro: saidaSecundaria.bairro || saidaSecundaria.endereco_bairro,
                cidade: saidaSecundaria.cidade || saidaSecundaria.endereco_cidade,
                destino: destinos2[0] || destino2Str,
                horario: saidaSecundaria.horario || saidaSecundaria.hora || saidaSecundaria.saida
            });
        }

        // Criar nova saída combinada
        const saidaJunta = {
            ...saidaPrincipal,
            id: `saida_juntada_${Date.now()}_${Math.random()}`,
            // Campos combinados
            destino: this.formatarListaComE(destinos),
            setor: this.formatarListaComE(setores),
            saida: horarioFinal,
            horario: horarioFinal,
            hora: horarioFinal,
            // Informações de junção - sempre arrays individuais
            destinos_multiplos: destinosMultiplos,
            setores_multiplos: setores, // Array de setores individuais
            juntada: true,
            saidas_originais: [
                ...(saida1.juntada && saida1.saidas_originais ? saida1.saidas_originais : [saida1.id || saida1.temp_id]),
                ...(saida2.juntada && saida2.saidas_originais ? saida2.saidas_originais : [saida2.id || saida2.temp_id])
            ],
            motivo_adicional: saidaSecundaria.objetivo || saidaSecundaria.motivo || saidaSecundaria.observacao || '',
            observacao: `Saída juntada automaticamente: ${saidaPrincipal.objetivo || saidaPrincipal.motivo || ''} e ${saidaSecundaria.objetivo || saidaSecundaria.motivo || ''}`.trim()
        };

        return saidaJunta;
    }

    /**
     * Converte horário para minutos do dia para comparação
     */
    parseHorario(horario) {
        if (!horario) return 0;
        if (typeof horario === 'number') return horario;
        if (typeof horario === 'string') {
            const partes = horario.split(':');
            if (partes.length === 2) {
                return parseInt(partes[0]) * 60 + parseInt(partes[1]);
            }
        }
        if (typeof horario === 'object' && horario.hora) {
            return (horario.hora || 0) * 60 + (horario.minuto || 0);
        }
        return 0;
    }

    /**
     * Monitora novas saídas e verifica possibilidades de junção
     * Agora verifica todas as saídas independente de motorista/viatura
     * Verifica proximidade geográfica, dias próximos e mesmo caminho
     */
    async verificarAposCadastro(novaSaida, todasSaidas, motoristaId = null, viaturaId = null) {
        console.log('🔍 verificarAposCadastro chamado:', {
            novaSaida,
            totalSaidas: todasSaidas.length
        });

        // Incluir a nova saída na lista para verificação
        const todasSaidasComNova = [...todasSaidas];
        
        // Se a nova saída não está na lista, adicioná-la
        const jaExiste = todasSaidas.some(s => 
            (s.id && s.id === novaSaida.id) || 
            (s.temp_id && s.temp_id === novaSaida.temp_id)
        );
        
        if (!jaExiste) {
            todasSaidasComNova.push(novaSaida);
            console.log('✅ Nova saída adicionada à lista para verificação');
        } else {
            console.log('⚠️ Nova saída já estava na lista');
        }

        // Verificar todas as possibilidades (sem filtro de motorista/viatura)
        console.log('🔍 Verificando juntas possíveis...');
        const sugestoes = await this.verificarJuntasPossiveis(todasSaidasComNova, null, null);
        console.log(`📋 Encontradas ${sugestoes.length} sugestões de junção`);

        if (sugestoes.length > 0) {
            // Filtrar apenas sugestões que envolvem a nova saída
            const novaId = novaSaida.id || novaSaida.temp_id;
            console.log('🔍 Filtrando sugestões para nova saída ID:', novaId);
            
            const sugestoesRelevantes = sugestoes.filter(sugestao => {
                const id1 = sugestao.saida1.id || sugestao.saida1.temp_id;
                const id2 = sugestao.saida2.id || sugestao.saida2.temp_id;
                
                const envolve = id1 === novaId || id2 === novaId;
                if (envolve) {
                    console.log('✅ Sugestão relevante encontrada:', {
                        saida1: { id: id1, destino: `${sugestao.bairros[0]}, ${sugestao.cidade}` },
                        saida2: { id: id2, destino: `${sugestao.bairros[1]}, ${sugestao.cidade}` },
                        distancia: sugestao.distancia,
                        motivos: sugestao.motivos
                    });
                }
                
                return envolve;
            });

            console.log(`📋 ${sugestoesRelevantes.length} sugestões relevantes encontradas`);

            if (sugestoesRelevantes.length > 0) {
                // Pegar a primeira sugestão mais relevante
                const sugestao = sugestoesRelevantes[0];
                console.log('📋 Exibindo modal para sugestão:', sugestao);
                
                const resultado = await this.exibirModalJuntar(sugestao);
                return { aceitar: resultado.aceitar, horario: resultado.horario, sugestao };
            } else {
                console.log('⚠️ Nenhuma sugestão relevante encontrada para a nova saída');
            }
        } else {
            console.log('⚠️ Nenhuma sugestão de junção encontrada');
        }

        return { aceitar: false, horario: null, sugestao: null };
    }
}

// Criar instância global
const juntaSaidasService = new JuntaSaidasService();

// Expor para uso global
window.JuntaSaidasService = JuntaSaidasService;
window.juntaSaidasService = juntaSaidasService;

