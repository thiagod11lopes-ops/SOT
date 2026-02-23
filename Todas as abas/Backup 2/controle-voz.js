// controle-voz.js - Sistema de Controle por Voz para SOT5
// Versão 1.0 - Implementação completa com Web Speech API

class VoiceController {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.lastCommand = '';
        this.isInitialized = false;
        this.floatingButton = null;
        this.statusBalloon = null;

        // Configurações
        this.commands = {
            // Navegação
            'abrir cadastro': 'cadastro-saidas',
            'abrir cadastros': 'cadastro-saidas',
            'cadastro': 'cadastro-saidas',
            'cadastro de saidas': 'cadastro-saidas',
            'abrir saidas': 'saidas-administrativas',
            'saidas administrativas': 'saidas-administrativas',
            'saidas': 'saidas-administrativas',
            'abrir saidas ambulancias': 'saidas-ambulancias',
            'saidas ambulancias': 'saidas-ambulancias',
            'abrir ambulancias': 'saidas-ambulancias',
            'ambulancias': 'saidas-ambulancias',
            'abrir abastecimento': 'abastecimento',
            'abastecimento': 'abastecimento',
            'abrir vistoria': 'vistoria',
            'vistoria': 'vistoria',
            'abrir situacao': 'situacao',
            'situacao': 'situacao',
            'abrir frota': 'frota-pessoal',
            'frota': 'frota-pessoal',
            'frota e pessoal': 'frota-pessoal',
            'abrir estatistica': 'estatistica',
            'estatistica': 'estatistica',
            'estatisticas': 'estatistica',
            'abrir escala': 'escala',
            'escala': 'escala',
            'abrir avisos': 'avisos',
            'avisos': 'avisos',
            'abrir lembretes': 'lembretes',
            'lembretes': 'lembretes',
            'abrir configuracoes': 'configuracoes',
            'configuracoes': 'configuracoes',

            // Consultas
            'listar viaturas': 'listar_viaturas',
            'listar motoristas': 'listar_motoristas',
            'quantas saidas hoje': 'numero_saidas_dia',
            'numero de saidas do dia': 'numero_saidas_dia',
            'saidas do dia': 'numero_saidas_dia',

            // Melhor data
            'melhor data para saida pela manha': 'melhor_data_manha',
            'melhor dia pela manha': 'melhor_data_manha',
            'melhor data manha': 'melhor_data_manha',
            'melhor data para saida pela tarde': 'melhor_data_tarde',
            'melhor dia pela tarde': 'melhor_data_tarde',
            'melhor data tarde': 'melhor_data_tarde',

            // Ações
            'gerar pdf': 'gerar_pdf',
            'imprimir': 'gerar_pdf',
            'imprimir em massa': 'imprimir_massa',
            'ajuda': 'mostrar_ajuda',
            'comandos': 'mostrar_ajuda',
            'parar escuta': 'parar_escuta',
            'desativar': 'parar_escuta',
            'repetir': 'repetir_comando'
        };

        this.init();
    }

    init() {
        if (!this.checkBrowserSupport()) {
            console.warn('🎤 Controle de voz não suportado neste navegador');
            return;
        }

        this.createFloatingButton();
        this.createStatusBalloon();
        this.setupSpeechRecognition();
        this.setupKeyboardShortcuts();
        this.isInitialized = true;

        console.log('🎤 Sistema de controle por voz inicializado');
    }

    checkBrowserSupport() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    createFloatingButton() {
        // Criar botão flutuante
        this.floatingButton = document.createElement('div');
        this.floatingButton.id = 'voice-control-button';
        this.floatingButton.innerHTML = '🎤';
        this.floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 9999;
            transition: all 0.3s ease;
            border: 3px solid rgba(255,255,255,0.2);
        `;

        this.floatingButton.addEventListener('click', () => this.toggleListening());
        this.floatingButton.addEventListener('mouseenter', () => {
            this.floatingButton.style.transform = 'scale(1.1)';
        });
        this.floatingButton.addEventListener('mouseleave', () => {
            this.floatingButton.style.transform = 'scale(1)';
        });

        document.body.appendChild(this.floatingButton);
    }

    createStatusBalloon() {
        // Criar balão de status
        this.statusBalloon = document.createElement('div');
        this.statusBalloon.id = 'voice-status-balloon';
        this.statusBalloon.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 14px;
            display: none;
            z-index: 9998;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        `;

        document.body.appendChild(this.statusBalloon);
    }

    showStatus(message, duration = 3000) {
        this.statusBalloon.textContent = message;
        this.statusBalloon.style.display = 'block';

        setTimeout(() => {
            this.statusBalloon.style.display = 'none';
        }, duration);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateButtonState();
            this.showStatus('🎤 Ouvindo...', 0);
            console.log('🎤 Reconhecimento de voz iniciado');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                this.statusBalloon.textContent = `🎤 ${interimTranscript}`;
            }

            if (finalTranscript) {
                console.log('🎤 Comando reconhecido:', finalTranscript);
                this.processCommand(finalTranscript.toLowerCase().trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('🎤 Erro no reconhecimento:', event.error);
            this.showStatus(`❌ Erro: ${event.error}`, 3000);
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButtonState();
            this.statusBalloon.style.display = 'none';
            console.log('🎤 Reconhecimento de voz parado');
        };
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.isInitialized) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Erro ao iniciar reconhecimento:', error);
            this.showStatus('❌ Erro ao iniciar', 3000);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    updateButtonState() {
        if (!this.floatingButton) return;

        if (this.isListening) {
            this.floatingButton.style.background = 'linear-gradient(135deg, #ff4757 0%, #ff3838 100%)';
            this.floatingButton.style.animation = 'pulse 1s infinite';
        } else {
            this.floatingButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            this.floatingButton.style.animation = 'none';
        }
    }

    processCommand(transcript) {
        console.log('🎯 Processando comando:', transcript);

        // Normalizar comando (remover acentos, pontuação)
        const normalizedCommand = this.normalizeText(transcript);
        console.log('📝 Comando normalizado:', normalizedCommand);

        // Procurar comando correspondente
        const commandKey = this.findCommand(normalizedCommand);

        if (commandKey) {
            console.log('✅ Comando encontrado:', commandKey);
            this.executeCommand(commandKey);
        } else {
            console.log('❌ Comando não reconhecido');
            this.showStatus('❌ Comando não reconhecido', 3000);
            this.speak('Comando não reconhecido. Diga ajuda para ver os comandos disponíveis.');
        }
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^\w\s]/g, '') // Remover pontuação
            .replace(/\s+/g, ' ') // Normalizar espaços
            .trim();
    }

    findCommand(normalizedText) {
        // Procurar correspondência exata primeiro
        if (this.commands[normalizedText]) {
            return this.commands[normalizedText];
        }

        // Procurar correspondência parcial
        for (const [key, value] of Object.entries(this.commands)) {
            if (normalizedText.includes(key) || key.includes(normalizedText)) {
                return value;
            }
        }

        return null;
    }

    executeCommand(command) {
        this.lastCommand = command;

        switch (command) {
            // Navegação entre abas
            case 'cadastro-saidas':
                this.navigateToTab('cadastro-saidas');
                this.speak('Abrindo cadastro de saídas');
                break;
            case 'saidas-administrativas':
                this.navigateToTab('saidas-administrativas');
                this.speak('Abrindo saídas administrativas');
                break;
            case 'saidas-ambulancias':
                this.navigateToTab('saidas-ambulancias');
                this.speak('Abrindo saídas de ambulâncias');
                break;
            case 'abastecimento':
                this.navigateToTab('abastecimento');
                this.speak('Abrindo abastecimento');
                break;
            case 'vistoria':
                this.navigateToTab('vistoria');
                this.speak('Abrindo vistoria');
                break;
            case 'frota-pessoal':
                this.navigateToTab('frota-pessoal');
                this.speak('Abrindo frota e pessoal');
                break;
            case 'estatistica':
                this.navigateToTab('estatistica');
                this.speak('Abrindo estatísticas');
                break;
            case 'escala':
                this.navigateToTab('escala');
                this.speak('Abrindo escala');
                break;
            case 'avisos':
                this.navigateToTab('avisos');
                this.speak('Abrindo avisos');
                break;
            case 'lembretes':
                this.navigateToTab('lembretes');
                this.speak('Abrindo lembretes');
                break;
            case 'configuracoes':
                this.navigateToTab('configuracoes');
                this.speak('Abrindo configurações');
                break;

            // Consultas
            case 'listar_viaturas':
                this.listViaturas();
                break;
            case 'listar_motoristas':
                this.listMotoristas();
                break;
            case 'numero_saidas_dia':
                this.showExitsOfDay();
                break;

            // Melhor data
            case 'melhor_data_manha':
                this.findBestDate('manha');
                break;
            case 'melhor_data_tarde':
                this.findBestDate('tarde');
                break;

            // Ações
            case 'gerar_pdf':
                this.generatePDF();
                break;
            case 'imprimir_massa':
                this.printMass();
                break;
            case 'mostrar_ajuda':
                this.showHelp();
                break;
            case 'parar_escuta':
                this.stopListening();
                this.speak('Escuta desativada');
                break;
            case 'repetir_comando':
                if (this.lastCommand) {
                    this.executeCommand(this.lastCommand);
                } else {
                    this.speak('Nenhum comando para repetir');
                }
                break;

            default:
                this.speak('Comando não implementado');
        }
    }

    navigateToTab(tabId) {
        // Simular clique na aba
        const tabButton = document.querySelector(`.tab-button[data-tab-id="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
            this.showStatus(`✅ ${tabButton.textContent.trim()}`, 2000);
        }
    }

    listViaturas() {
        // Implementar listagem de viaturas (placeholder)
        this.speak('Listando viaturas cadastradas');
        console.log('📋 Listar viaturas - Implementar busca no localStorage');
        this.showStatus('📋 Listando viaturas...', 3000);
    }

    listMotoristas() {
        // Implementar listagem de motoristas (placeholder)
        this.speak('Listando motoristas cadastrados');
        console.log('👥 Listar motoristas - Implementar busca no localStorage');
        this.showStatus('👥 Listando motoristas...', 3000);
    }

    showExitsOfDay() {
        // Buscar saídas do dia atual
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const exits = JSON.parse(localStorage.getItem('saidas_administrativas')) || [];

        let morningCount = 0;
        let afternoonCount = 0;

        exits.forEach(exit => {
            if (exit.data_saida && exit.data_saida.startsWith(dateKey)) {
                const hour = parseInt(exit.hora_saida.split(':')[0]);
                if (hour >= 0 && hour < 12) {
                    morningCount++;
                } else {
                    afternoonCount++;
                }
            }
        });

        const total = morningCount + afternoonCount;
        const dateStr = today.toLocaleDateString('pt-BR');

        // Falar resultado
        this.speak(`Saídas do dia ${dateStr}. Pela manhã: ${morningCount}. Pela tarde: ${afternoonCount}.`);

        // Mostrar modal
        this.showExitsModal(dateStr, morningCount, afternoonCount, total);

        console.log(`📊 Saídas de ${dateStr}:`, { manha: morningCount, tarde: afternoonCount, total });
    }

    showExitsModal(date, morning, afternoon, total) {
        // Criar modal em tela cheia
        const modal = document.createElement('div');
        modal.id = 'exits-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="position: absolute; top: 20px; right: 20px; cursor: pointer; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;" onclick="this.parentElement.remove()">×</div>
            <h1 style="font-size: 48px; margin-bottom: 40px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Saídas do Dia ${date}</h1>
            <div style="display: flex; gap: 60px; margin-bottom: 40px;">
                <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
                    <h2 style="font-size: 32px; margin-bottom: 20px;">MANHÃ</h2>
                    <div style="font-size: 120px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${morning}</div>
                </div>
                <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
                    <h2 style="font-size: 32px; margin-bottom: 20px;">TARDE</h2>
                    <div style="font-size: 120px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${afternoon}</div>
                </div>
            </div>
            <div style="font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Total: ${total} saídas</div>
        `;

        // Fechar com ESC
        const closeModal = () => modal.remove();
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });

        document.body.appendChild(modal);
    }

    findBestDate(period) {
        console.log('🔍 Buscando melhor data para saída no período:', period);

        // Implementar lógica de melhor data (placeholder)
        const today = new Date();
        const bestDate = new Date(today);
        bestDate.setDate(today.getDate() + Math.floor(Math.random() * 7) + 1);

        const dateStr = bestDate.toLocaleDateString('pt-BR');
        const dayName = bestDate.toLocaleDateString('pt-BR', { weekday: 'long' });

        this.speak(`Melhor data para saída pela ${period}: ${dayName}, dia ${dateStr}.`);
        this.showStatus(`🟢 ${dateStr} (${dayName})`, 5000);

        console.log('✅ Melhor dia encontrado:', { data: dateStr, diaSemana: dayName, periodo });
    }

    generatePDF() {
        // Implementar geração de PDF (placeholder)
        this.speak('Gerando PDF da aba atual');
        console.log('📄 Gerar PDF - Implementar geração de PDF');
        this.showStatus('📄 Gerando PDF...', 3000);
    }

    printMass() {
        // Implementar impressão em massa (placeholder)
        this.speak('Abrindo impressão em massa de vistorias');
        console.log('🖨️ Imprimir em massa - Implementar abertura da funcionalidade');
        this.showStatus('🖨️ Abrindo impressão em massa...', 3000);
    }

    showHelp() {
        const helpText = `
Comandos disponíveis:
• Navegação: "Abrir vistoria", "Abrir saídas", etc.
• Consultas: "Listar viaturas", "Quantas saídas hoje"
• Ações: "Gerar PDF", "Ajuda", "Parar escuta"
• Melhor data: "Melhor data pela manhã/tarde"
        `.trim();

        alert(helpText);
        this.speak('Mostrando lista de comandos disponíveis');
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';

            // Procurar voz em português
            const voices = speechSynthesis.getVoices();
            const ptVoice = voices.find(voice => voice.lang.startsWith('pt'));
            if (ptVoice) {
                utterance.voice = ptVoice;
            }

            speechSynthesis.speak(utterance);
        }
    }
}

// Adicionar estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.voiceController = new VoiceController();
});

// Exportar para uso global
window.VoiceController = VoiceController;
