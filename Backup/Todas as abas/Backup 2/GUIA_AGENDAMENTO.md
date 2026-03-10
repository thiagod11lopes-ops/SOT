# Guia de Uso - Agendamento de Saídas Administrativas

## 📋 Descrição

O **Agendamento.html** é um frontend independente e simplificado para agendamento de **saídas administrativas** de viaturas do sistema SOT. Permite que usuários de diferentes computadores na rede realizem agendamentos através de uma interface web limpa e intuitiva, com controle de disponibilidade de vagas por dia e horário.

---

## 🚀 Como Usar

### 1. **Acesso Local (Desenvolvimento)**

Abra o arquivo `Agendamento.html` diretamente no navegador:

```
file:///caminho/para/Agendamento.html
```

### 2. **Acesso via Rede Local**

Para disponibilizar o frontend para outros computadores na rede:

#### **Opção A: Usando Python (Recomendado para testes)**

1. Abra um terminal na pasta onde está o `Agendamento.html`
2. Execute:
   ```bash
   python -m http.server 8080
   ```
   ou no Python 3:
   ```bash
   python3 -m http.server 8080
   ```
3. Em outro computador na rede, acesse:
   ```
   http://[IP_DO_SERVIDOR]:8080/Agendamento.html
   ```
   Exemplo: `http://192.168.1.100:8080/Agendamento.html`

#### **Opção B: Usando Node.js (http-server)**

1. Instale o http-server:
   ```bash
   npm install -g http-server
   ```
2. Na pasta do projeto, execute:
   ```bash
   http-server -p 8080
   ```
3. Acesse de outros computadores:
   ```
   http://[IP_DO_SERVIDOR]:8080/Agendamento.html
   ```

#### **Opção C: Usando IIS (Windows)**

1. Copie o `Agendamento.html` para uma pasta do IIS
2. Configure o IIS para servir arquivos estáticos
3. Acesse via IP ou nome do servidor

---

## 🔧 Configuração

### **Dependências Necessárias**

O frontend precisa dos seguintes arquivos na mesma pasta ou acessíveis:

1. **api-service.js** - Serviço de API (já existe no projeto)
2. **data-service.js** - Serviço de dados unificado (já existe no projeto)

### **Funcionamento Atual**

**Modo Offline (Local):**
- Os dados são salvos no `localStorage` do navegador
- Cada computador mantém seus próprios dados
- Compatível com o sistema SOT atual

**Modo Online (Futuro):**
- Quando o backend estiver disponível, o sistema detecta automaticamente
- Os dados são salvos no servidor (banco de dados compartilhado)
- Todos os usuários veem os mesmos agendamentos

### **Indicador de Status**

No canto superior direito há um indicador que mostra:
- **🟢 Modo Online (Backend)** - Backend disponível, dados compartilhados
- **🟡 Modo Offline (Local)** - Usando localStorage local

---

## 🎯 Funcionalidades Principais

### **Sistema de Disponibilidade de Vagas**

O sistema possui controle de disponibilidade de vagas por dia e horário:

- ✅ **Verificação Automática**: Ao selecionar data e horário, o sistema verifica automaticamente a disponibilidade
- ✅ **Feedback Visual**: Mostra quantas vagas estão disponíveis para o horário selecionado
- ✅ **Bloqueio Inteligente**: Impede agendamento quando não há vagas disponíveis
- ✅ **Configuração Administrativa**: Administrador pode configurar vagas através da interface `DisponibilidadeAdmin.html`

### **Indicadores de Disponibilidade:**

- 🟢 **Verde (Disponível)**: Há vagas suficientes
- 🟡 **Amarelo (Limitado)**: Resta apenas 1 vaga
- 🔴 **Vermelho (Esgotado)**: Todas as vagas estão ocupadas

## 📝 Campos do Formulário

### **Campos Obrigatórios (*):**
- **Data da Saída**: Data em que a viatura sairá
- **Hora da Saída**: Horário previsto para saída (verifica disponibilidade automaticamente)
- **Viatura**: Seleção da viatura disponível
- **Motorista**: Seleção do motorista disponível
- **Cidade**: Cidade de destino
- **Bairro/Destino**: Bairro ou local específico
- **Objetivo/Motivo**: Descrição do motivo da saída

### **Campos Opcionais:**
- **Setor**: Setor solicitante
- **Ramal**: Ramal do setor
- **Número de Passageiros**: Quantidade de passageiros
- **Responsável pelo Pedido**: Nome do responsável
- **Observações**: Informações adicionais

---

## ⚙️ Configuração de Disponibilidade (Administrador)

### **Acessar Painel Administrativo**

1. No canto superior esquerdo do `Agendamento.html`, clique no botão **"Admin"**
2. Ou acesse diretamente: `DisponibilidadeAdmin.html`

### **Configurar Disponibilidade Individual**

1. Selecione a **Data**
2. Selecione o **Horário**
3. Informe a **Quantidade de Vagas** disponíveis
4. Clique em **"Salvar Configuração"**

### **Configuração Rápida (Em Lote)**

Para configurar múltiplos dias e horários de uma vez:

1. Informe a **Data Inicial** e **Data Final**
2. Informe os **Horários** separados por vírgula (ex: `08:00, 09:00, 10:00, 14:00, 15:00`)
3. Informe a **Quantidade de Vagas** por horário
4. Clique em **"Criar Configurações em Lote"**

### **Gerenciar Disponibilidades**

- **Editar**: Clique no botão "Editar" na linha desejada
- **Excluir**: Clique no botão "Excluir" para remover uma configuração
- **Visualizar Status**: A tabela mostra vagas configuradas, ocupadas e disponíveis

### **Estatísticas**

O painel administrativo mostra:
- Total de períodos configurados
- Total de vagas disponíveis
- Vagas ocupadas
- Vagas disponíveis restantes

## 🔄 Integração com Sistema SOT

### **Compatibilidade de Dados**

O frontend usa a mesma estrutura de dados do sistema SOT principal:

- **Saídas Administrativas**: `localStorage.getItem('saidasAdministrativas')`
- **Disponibilidades**: `localStorage.getItem('disponibilidadeViaturas')`
- **Viaturas**: Carregadas de `viaturasCadastradas`
- **Motoristas**: Carregados de `motoristasCadastrados`

### **Visualização no SOT Principal**

Os agendamentos criados no frontend "Agendamento" aparecerão automaticamente em:
- **SOT5.html** → Aba "Saídas Administrativas"
- **Cadastrodesaidas8.html**

---

## 🛠️ Preparação para Backend (Futuro)

Quando o backend estiver pronto:

1. **Não será necessário alterar o frontend** - Ele já está preparado!

2. O sistema detectará automaticamente o backend quando:
   - O servidor estiver rodando
   - O endpoint `/api/health` estiver respondendo
   - A URL da API estiver configurada corretamente

3. **Configuração da URL da API** (se necessário):
   
   Edite `api-service.js` para configurar a URL do servidor:
   ```javascript
   const API_BASE_URL = 'http://[IP_DO_SERVIDOR]:[PORTA]/api';
   ```
   
   Ou configure no servidor para usar `window.location.origin + '/api'` automaticamente.

---

## 📊 Funcionalidades

### ✅ **Funcionalidades Implementadas:**

- [x] Formulário completo de agendamento (apenas saídas administrativas)
- [x] Sistema de controle de disponibilidade de vagas por dia/horário
- [x] Verificação automática de disponibilidade ao selecionar data/hora
- [x] Interface administrativa para configurar disponibilidades
- [x] Configuração rápida em lote (múltiplos dias/horários)
- [x] Validação de campos obrigatórios
- [x] Bloqueio de agendamento quando não há vagas
- [x] Carregamento automático de viaturas
- [x] Carregamento automático de motoristas
- [x] Lista de agendamentos recentes (últimos 10)
- [x] Indicador de status (Online/Offline)
- [x] Estatísticas de disponibilidade
- [x] Salvamento em localStorage (compatível com SOT)
- [x] Integração com data-service.js (preparado para backend)
- [x] Interface responsiva (funciona em mobile/tablet)
- [x] Mensagens de feedback ao usuário
- [x] Limpeza de formulário

### 🔮 **Funcionalidades Futuras (quando backend estiver pronto):**

- [ ] Sincronização automática em tempo real
- [ ] Notificações de novos agendamentos
- [ ] Filtros e busca avançada
- [ ] Edição e exclusão de agendamentos
- [ ] Visualização de calendário
- [ ] Verificação de conflitos (viatura/motorista já agendados)
- [ ] Histórico completo
- [ ] Exportação de relatórios

---

## 🐛 Solução de Problemas

### **Problema: Viaturas/Motoristas não aparecem**

**Solução:**
1. Certifique-se de que há viaturas e motoristas cadastrados no SOT principal
2. Acesse o SOT5.html e verifique as abas "Frota e Pessoal"
3. Cadastre pelo menos uma viatura e um motorista
4. Recarregue a página do Agendamento

### **Problema: Agendamentos não aparecem**

**Solução:**
1. Verifique se o agendamento foi salvo (mensagem de sucesso)
2. Verifique o console do navegador (F12) para erros
3. Certifique-se de que está no mesmo navegador/computador (modo local)
4. Quando o backend estiver pronto, agendamentos serão compartilhados

### **Problema: Sistema diz que não há vagas disponíveis**

**Solução:**
1. Acesse o painel administrativo (`DisponibilidadeAdmin.html`)
2. Verifique se há configuração de disponibilidade para o dia/horário desejado
3. Se não houver, crie uma configuração para aquele horário
4. Se houver, verifique quantas vagas estão configuradas e quantas estão ocupadas
5. Considere aumentar o número de vagas ou escolher outro horário

### **Problema: Não consigo configurar disponibilidades**

**Solução:**
1. Certifique-se de que está acessando `DisponibilidadeAdmin.html`
2. Preencha todos os campos obrigatórios (data, horário, quantidade)
3. A quantidade de vagas deve ser um número maior que zero
4. Verifique se não há erros no console do navegador (F12)

### **Problema: Não consigo acessar de outro computador**

**Solução:**
1. Verifique o firewall do Windows/servidor
2. Certifique-se de que a porta está aberta (ex: 8080)
3. Verifique o IP do servidor: `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
4. Teste acessando `http://[IP]:8080` de outro computador
5. Certifique-se de que estão na mesma rede

### **Problema: Status sempre mostra "Offline"**

**Solução:**
Isso é **normal** se o backend ainda não estiver implementado. O sistema funcionará em modo local usando localStorage até que o backend seja configurado.

---

## 📱 Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ✅ Navegadores mobile (responsivo)

---

## 🔐 Segurança

**Notas Importantes:**

1. **Modo Local (atual)**: Os dados são armazenados apenas no navegador local. Não há compartilhamento automático entre computadores.

2. **Modo Rede (futuro)**: Quando o backend estiver pronto, implemente:
   - Autenticação de usuários
   - HTTPS para conexões seguras
   - Validação de dados no backend
   - Proteção contra SQL injection
   - Rate limiting

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador (F12 → Console)
2. Verifique os logs do servidor (se usando servidor web)
3. Consulte a documentação do sistema SOT principal

---

## 📝 Changelog

### **Versão 1.0** (2025-01-27)
- ✅ Lançamento inicial
- ✅ Formulário completo de agendamento
- ✅ Integração com sistema SOT
- ✅ Preparado para backend futuro
- ✅ Interface responsiva e moderna

---

**Desenvolvido para Sistema SOT - Sistema de Organização de Transporte**
