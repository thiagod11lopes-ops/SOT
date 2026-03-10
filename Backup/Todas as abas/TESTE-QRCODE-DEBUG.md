# 🔍 Guia de Debug - Scanner de QR Code SOT5

## 📋 Checklist de Teste

### 1. Verificar Console do Navegador

Abra o Console (F12) e procure por estas mensagens:

#### ✅ Mensagens Esperadas ao Iniciar Scanner:
```
Iniciando scanner de QR Code...
Scanner iniciado com sucesso!
```

#### ✅ Mensagens Esperadas Durante Scan:
```
Mensagem de detecção exibida
Mensagem de detecção ocultada
```

#### ✅ Mensagens Esperadas ao Ler QR Code:
```
QR Code detectado! Texto: {"dt":"2024-11-07",...}
Dados parseados: {dt: "2024-11-07", ...}
Mensagem de sucesso exibida
```

### 2. Verificar Elementos HTML

Abra o Inspector (F12 > Elements) e verifique se existem:

- `<div id="qrReader">` - Container do scanner
- `<div id="qrDetectingMessage">` - Mensagem amarela
- `<div id="qrSuccessMessage">` - Mensagem verde
- `<div id="qrErrorMessage">` - Mensagem vermelha

### 3. Testar Passo a Passo

#### Passo 1: Abrir a Página
1. Abra `Cadastrodesaidas8.html`
2. Selecione "Ambulância" no campo "Tipo de Saída"
3. Verifique se o scanner aparece (fundo roxo)

#### Passo 2: Iniciar Scanner
1. Clique em "Iniciar Scanner"
2. Permita acesso à câmera quando solicitado
3. Verifique no console: "Scanner iniciado com sucesso!"

#### Passo 3: Testar Detecção
1. Aponte a câmera para QUALQUER coisa (não precisa ser QR Code)
2. Deve aparecer mensagem amarela: "Detectando QR Code..."
3. Verifique no console: "Mensagem de detecção exibida"

#### Passo 4: Ler QR Code
1. Aponte para o QR Code do teste
2. Aguarde a leitura
3. Deve aparecer mensagem verde: "QR Code lido com sucesso!"
4. Campos devem ser preenchidos automaticamente

## 🐛 Problemas Comuns

### Problema 1: Scanner não inicia
**Sintomas**: Botão não muda para "Parar Scanner"
**Soluções**:
- Verifique permissões da câmera no navegador
- Tente usar HTTPS (ou localhost)
- Verifique se há erros no console

### Problema 2: Mensagem de detecção não aparece
**Sintomas**: Nada acontece ao apontar câmera
**Soluções**:
- Verifique se `isScanning` está `true` no console
- Digite `isScanning` no console e veja o valor
- Verifique se a biblioteca Html5-QRCode carregou

### Problema 3: QR Code não é lido
**Sintomas**: Mensagem amarela aparece mas não lê
**Soluções**:
- Melhore a iluminação
- Aproxime ou afaste a câmera
- Verifique se o QR Code é do formato correto (JSON)
- Teste com o `teste-qrcode-completo.html`

### Problema 4: Mensagens não aparecem
**Sintomas**: Console mostra logs mas não vê mensagens
**Soluções**:
- Verifique no Inspector se os elementos existem
- Verifique se a classe `.show` está sendo adicionada
- Verifique CSS: `display: none` vs `display: block`

## 🔧 Comandos de Debug no Console

Execute estes comandos no console para testar:

```javascript
// Verificar se elementos existem
console.log('Scanner:', document.getElementById('qrReader'));
console.log('Detecting:', document.getElementById('qrDetectingMessage'));
console.log('Success:', document.getElementById('qrSuccessMessage'));
console.log('Error:', document.getElementById('qrErrorMessage'));

// Verificar estado do scanner
console.log('isScanning:', isScanning);
console.log('html5QrCode:', html5QrCode);

// Testar mensagens manualmente
document.getElementById('qrDetectingMessage').classList.add('show');
document.getElementById('qrSuccessMessage').classList.add('show');
document.getElementById('qrErrorMessage').classList.add('show');

// Remover mensagens
document.getElementById('qrDetectingMessage').classList.remove('show');
document.getElementById('qrSuccessMessage').classList.remove('show');
document.getElementById('qrErrorMessage').classList.remove('show');
```

## 📊 Teste com QR Code de Exemplo

Use o arquivo `teste-qrcode-completo.html` para gerar um QR Code de teste:

1. Abra `teste-qrcode-completo.html` em uma aba
2. Abra `Cadastrodesaidas8.html` em outra aba
3. No SOT5, selecione "Ambulância" e inicie o scanner
4. Use um celular para escanear o QR Code da tela do PC
5. OU tire um print do QR Code e abra em outra janela

## 🎯 Dados Esperados no QR Code

O QR Code deve conter JSON com estas chaves:

```json
{
  "dt": "2024-11-07",
  "hr": "22:30",
  "st": "Emergência",
  "rm": "2345",
  "cd": "Rio de Janeiro",
  "br": "Centro",
  "ob": "Inter Hospitalar",
  "ps": "2",
  "rs": "Dr. José Santos",
  "th": "HNMD"
}
```

## 📞 Próximos Passos

Se ainda não funcionar:

1. **Compartilhe os logs do console** - Copie TODAS as mensagens
2. **Tire screenshots** - Mostre o que aparece (ou não aparece)
3. **Teste em outro navegador** - Chrome, Firefox, Edge
4. **Teste em outro dispositivo** - PC, celular, tablet

## ✅ Checklist Final

- [ ] Console mostra "Scanner iniciado com sucesso!"
- [ ] Mensagem amarela aparece ao apontar câmera
- [ ] QR Code é detectado (log no console)
- [ ] Mensagem verde aparece ao ler QR Code
- [ ] Campos são preenchidos automaticamente
- [ ] Scanner para automaticamente após leitura

---

**Última atualização**: 07/11/2024 22:42
