# 🎤 Dicas para Melhor Reconhecimento de Voz

## ✅ Como Falar para o Sistema Entender Melhor

### 1. **Ritmo e Clareza**
- ✅ Fale em **ritmo normal** (nem muito rápido, nem muito devagar)
- ✅ Pronuncie as palavras **claramente**
- ✅ Faça uma **pequena pausa** entre palavras-chave
- ❌ Evite falar muito rápido ou engolir sílabas

### 2. **Ambiente**
- ✅ Use em ambiente **silencioso**
- ✅ Fale a uma **distância adequada** do microfone (20-30cm)
- ❌ Evite ambientes com muito ruído de fundo
- ❌ Evite falar muito longe ou muito perto do microfone

### 3. **Comandos Simples**
- ✅ Use comandos **curtos e diretos**
- ✅ Fale **uma ação por vez**
- ❌ Evite frases muito longas ou complexas

## 📝 Exemplos de Comandos que Funcionam Bem

### ✅ CORRETO - Comandos Claros
```
"Vistoria"              → Abre aba de vistoria
"Saída"                 → Abre saídas administrativas  
"Situação"              → Abre situação das viaturas
"Listar viaturas"       → Lista todas as viaturas
"Listar motoristas"     → Lista todos os motoristas
"Quantas saídas"        → Conta saídas do dia
"Ajuda"                 → Mostra comandos
"Parar"                 → Desativa reconhecimento
```

### ✅ CORRETO - Consultas com Placa
```
"Consultar viatura ABC 1234"
"Problemas da viatura KZV 8089"
"Viatura ABC 1234"
```

**DICA:** Ao falar placas, diga letra por letra e números separados:
- ✅ "ABC 1234" (A-B-C um-dois-três-quatro)
- ✅ "KZV 8089" (K-Z-V oito-zero-oito-nove)

### ❌ EVITE - Comandos Confusos
```
❌ "Eu quero abrir a aba de vistoria por favor"
   ✅ Use: "Vistoria"

❌ "Me mostre todas as viaturas que estão cadastradas"
   ✅ Use: "Listar viaturas"

❌ "Quantas saídas administrativas foram feitas hoje"
   ✅ Use: "Quantas saídas"
```

## 🎯 Comandos Mais Usados (Simplificados)

| O que você quer | Diga isso |
|----------------|-----------|
| Abrir aba | "Vistoria" / "Saída" / "Situação" |
| Ver viaturas | "Listar viaturas" |
| Ver motoristas | "Listar motoristas" |
| Consultar viatura | "Viatura ABC 1234" |
| Ver problemas | "Problemas ABC 1234" |
| Gerar PDF | "Gerar PDF" ou "Imprimir" |
| Ver comandos | "Ajuda" |
| Parar escuta | "Parar" |

## 🔍 Feedback Visual - Entenda as Cores

### 🔵 Azul (Ouvindo)
- Sistema está **captando sua voz**
- Mostra o que está sendo reconhecido em tempo real
- Continue falando normalmente

### 🟢 Verde (Sucesso)
- Comando foi **reconhecido e executado**
- Ação foi realizada com sucesso

### 🔴 Vermelho (Erro)
- Comando **não foi reconhecido**
- Tente falar novamente mais devagar
- Ou diga "ajuda" para ver comandos válidos

## 💡 Truques para Melhorar o Reconhecimento

### 1. **Teste o Microfone Primeiro**
Antes de usar, teste se o microfone está funcionando:
- Abra o Console (F12)
- Ative o controle de voz
- Fale algo e veja se aparece no console

### 2. **Veja o que o Sistema Entendeu**
- Mantenha o Console (F12) aberto
- Você verá exatamente o que foi reconhecido
- Exemplo: `🎤 Alternativas reconhecidas: [{transcript: "vistoria", confidence: 0.95}]`

### 3. **Use a Confiança a Seu Favor**
- O sistema mostra a **confiança** de cada reconhecimento
- Se a confiança for baixa (<70%), repita o comando
- Exemplo: `🎯 Processando comando (confiança: 95.3%): vistoria`

### 4. **Aprenda com os Erros**
- Quando um comando não for reconhecido, veja no console o que foi entendido
- Ajuste sua pronúncia baseado nisso
- Exemplo: Se você disse "vistoria" mas foi entendido "história", fale mais devagar

## 🎓 Treinamento Rápido (5 minutos)

### Passo 1: Ative o sistema
- Clique no botão roxo ou pressione Ctrl + Shift + V

### Passo 2: Teste comandos simples
1. Diga: **"Ajuda"** (deve abrir a lista de comandos)
2. Diga: **"Vistoria"** (deve abrir a aba)
3. Diga: **"Situação"** (deve abrir a aba)

### Passo 3: Teste consultas
1. Diga: **"Listar viaturas"**
2. Diga: **"Listar motoristas"**
3. Diga: **"Quantas saídas"**

### Passo 4: Teste com placa (use uma placa real do seu sistema)
1. Diga: **"Viatura ABC 1234"** (substitua pela placa real)
2. Diga: **"Problemas ABC 1234"**

## ⚙️ Configurações do Navegador

### Chrome/Edge - Melhorar Reconhecimento
1. Vá em **Configurações** → **Privacidade e segurança**
2. Clique em **Configurações do site**
3. Role até **Microfone**
4. Certifique-se de que o site está **Permitido**

### Testar Microfone
1. Vá em **chrome://settings/content/microphone**
2. Clique em **Testar**
3. Fale algo e veja se a barra se move

## 🐛 Problemas Comuns e Soluções

### "Nenhuma fala detectada"
- ✅ Verifique se o microfone está conectado
- ✅ Aumente o volume do microfone
- ✅ Fale mais alto

### "Comando não reconhecido" sempre
- ✅ Fale mais devagar
- ✅ Use comandos da lista de ajuda
- ✅ Verifique o console para ver o que foi entendido

### Sistema não responde
- ✅ Recarregue a página (F5)
- ✅ Verifique se o botão está vermelho (escutando)
- ✅ Clique no botão para desativar e reativar

### Reconhece errado
- ✅ Fale com mais clareza
- ✅ Reduza ruído de fundo
- ✅ Fale mais perto do microfone

---

**Lembre-se:** O sistema aprende com o uso! Quanto mais você usar, melhor ficará o reconhecimento. 🚀
