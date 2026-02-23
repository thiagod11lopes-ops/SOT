# 📱 Leitor de QR Code - Sistema SOT5

## 🎯 Funcionalidade Implementada

Foi adicionado um **leitor de QR Code** na aba **Cadastro de Saídas** > **Cadastrar Nova Saída** que aparece automaticamente quando o tipo de saída selecionado é **"Ambulância"**.

## ✨ Como Funciona

### 1. Ativação Automática
- Ao selecionar **"Ambulância"** no campo "Tipo de Saída", o scanner de QR Code aparece automaticamente
- O scanner fica oculto quando o tipo de saída é "Administrativa"

### 2. Usando o Scanner
1. Selecione **"Ambulância"** no campo "Tipo de Saída"
2. Clique no botão **"Iniciar Scanner"**
3. Permita o acesso à câmera quando solicitado pelo navegador
4. Aponte a câmera para o QR Code no PDF gerado pelo Sistema de Controle de Ambulâncias
5. O sistema detecta automaticamente o QR Code e preenche os campos
6. O scanner para automaticamente após a leitura bem-sucedida

### 3. Campos Preenchidos Automaticamente

O QR Code contém os seguintes dados que são preenchidos no formulário:

- **Data do Pedido**
- **Hora do Pedido**
- **Setor Solicitante**
- **Ramal**
- **Cidade**
- **Bairro**
- **Objetivo da Saída**
- **Nº de Passageiros**
- **Responsável pelo Pedido**
- **Hospital de Destino** (se aplicável)

## 🔄 Integração com Sistema de Controle de Ambulâncias

O leitor de QR Code é compatível com os PDFs gerados pelo **Sistema de Controle de Ambulâncias - HNMD**.

### Formato dos Dados

O sistema suporta tanto o formato completo quanto o formato compacto dos dados:

**Formato Compacto** (usado nos QR Codes):
```json
{
  "dt": "2024-01-15",
  "hr": "14:30",
  "st": "Emergência",
  "rm": "2345",
  "cd": "Rio de Janeiro",
  "br": "Centro",
  "ob": "Inter Hospitalar",
  "ps": "2",
  "rs": "Dr. José Santos",
  "th": "Hospital Central"
}
```

**Mapeamento de Chaves**:
- `dt` = dataSolicitacao
- `hr` = horaSolicitacao
- `st` = setor
- `rm` = ramal
- `cd` = cidade
- `br` = bairro
- `ob` = objetivoSaida
- `ps` = numPassageiros
- `rs` = responsavel
- `th` = tipoHospital

## 🎨 Interface

### Visual
- **Container com gradiente roxo** para destacar o scanner
- **Botão de controle** que alterna entre "Iniciar Scanner" e "Parar Scanner"
- **Mensagem de sucesso** animada quando o QR Code é lido
- **Design responsivo** que se adapta a diferentes tamanhos de tela

### Animações
- Slide down suave quando o scanner aparece
- Fade in na mensagem de sucesso
- Transições suaves nos botões

## 🔧 Tecnologias Utilizadas

- **Html5-QRCode**: Biblioteca para leitura de QR Codes via câmera
- **JavaScript ES6+**: Async/await para operações assíncronas
- **CSS3**: Animações e gradientes modernos
- **Font Awesome**: Ícones

## 📱 Compatibilidade

### Navegadores Suportados
- ✅ Chrome (Desktop e Mobile)
- ✅ Firefox (Desktop e Mobile)
- ✅ Safari (Desktop e Mobile)
- ✅ Edge (Desktop e Mobile)

### Dispositivos
- 💻 **Desktop**: Usa webcam
- 📱 **Mobile**: Usa câmera traseira por padrão
- 📲 **Tablet**: Usa câmera traseira por padrão

## ⚠️ Requisitos

1. **HTTPS**: Para usar a câmera em produção, o site deve estar em HTTPS
2. **Permissões**: O navegador solicitará permissão para acessar a câmera
3. **Iluminação**: Certifique-se de ter boa iluminação ao escanear
4. **Foco**: Mantenha o QR Code estável e focado

## 🚀 Fluxo de Trabalho Completo

### No Sistema de Controle de Ambulâncias (HNMD):
1. Preencher solicitação de ambulância
2. Salvar registro
3. Gerar PDF (contém QR Code no canto superior direito)

### No Sistema SOT5:
1. Acessar **Cadastro de Saídas** > **Cadastrar Nova Saída**
2. Selecionar **"Ambulância"** no tipo de saída
3. Clicar em **"Iniciar Scanner"**
4. Escanear o QR Code do PDF
5. Verificar dados preenchidos automaticamente
6. Completar campos adicionais (Data/Hora da Saída, Viatura, Motorista)
7. Salvar a saída

## 🔐 Segurança

- Os dados no QR Code **não são criptografados**
- São apenas dados operacionais para facilitar o preenchimento
- Não contém informações sensíveis de saúde do paciente
- O QR Code é apenas para agilizar o processo, não substitui a validação dos dados

## 🐛 Solução de Problemas

### Câmera não funciona
- Verifique se concedeu permissão para acessar a câmera
- Certifique-se de que está usando HTTPS (ou localhost)
- Verifique se outro aplicativo não está usando a câmera

### QR Code não é reconhecido
- Certifique-se de que há boa iluminação
- Mantenha o QR Code estável e focado
- Verifique se o QR Code é do Sistema de Controle de Ambulâncias
- Tente aumentar ou diminuir a distância da câmera

### Dados não preenchem corretamente
- Verifique o console do navegador (F12) para erros
- Certifique-se de que o QR Code foi gerado corretamente
- Verifique se os nomes dos campos no formulário correspondem

## 📞 Suporte

Para dúvidas ou problemas com a funcionalidade de QR Code:
- Verifique o console do navegador para mensagens de erro
- Entre em contato com a equipe de desenvolvimento do SOT5

---

**Versão**: 1.0  
**Data**: Novembro 2024  
**Sistema**: SOT5 - Sistema de Organização de Transporte
