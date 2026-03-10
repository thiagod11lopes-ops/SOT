# Configurar Firebase para o SOT (Usuários do Agendamento)

Siga estes passos para usar o Firebase de verdade e que a aba **Usuários** e o **login do Agendamento** funcionem na nuvem.

---

## Passo 1: Acessar o Firebase

1. Abra no navegador: **https://console.firebase.google.com**
2. Faça login com sua conta Google (a mesma do GitHub, se quiser).

---

## Passo 2: Criar um projeto (ou usar um existente)

- **Se ainda não tem projeto:**  
  Clique em **“Adicionar projeto”** / **“Criar um projeto”**.  
  Dê um nome (ex.: **SOT**).  
  Pode desativar o Google Analytics se não for usar.  
  Clique em **“Criar projeto”** e espere terminar.

- **Se já tem um projeto:**  
  Clique nele na lista para abrir.

---

## Passo 3: Ativar o Firestore

1. No menu da esquerda, clique em **“Criar”** (Build) → **“Firestore Database”** (ou **“Firestore”**).
2. Clique em **“Criar banco de dados”**.
3. Escolha **“Começar no modo de teste”** (para desenvolvimento).  
   Depois você pode endurecer as regras.
4. Escolha a região (ex.: **southamerica-east1** para São Paulo).
5. Clique em **“Ativar”**.

---

## Passo 4: Regras do Firestore (permitir leitura/escrita)

1. Ainda em **Firestore Database**, abra a aba **“Regras”** (Rules).
2. Substitua as regras atuais por estas (permite leitura e escrita na coleção dos usuários do agendamento):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sot_agendamento_usuarios/{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Clique em **“Publicar”**.

> **Segurança:** `if true` deixa qualquer um que tiver o link do app ler/escrever. Para produção, depois você pode restringir (por exemplo com Firebase Auth).

---

## Passo 5: Obter a configuração do app Web

1. No menu da esquerda, clique no **ícone de engrenagem** ao lado de “Visão geral do projeto” → **“Configurações do projeto”**.
2. Role até a seção **“Seus aplicativos”**.
3. Se não existir um app Web:
   - Clique no ícone **</>** (Web).
   - Dê um apelido (ex.: **SOT Web**).
   - Não precisa marcar Firebase Hosting agora.
   - Clique em **“Registrar aplicativo”**.
4. Na tela que aparece, você verá um bloco `firebaseConfig` com algo assim:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "seu-projeto-12345.firebaseapp.com",
  projectId: "seu-projeto-12345",
  storageBucket: "seu-projeto-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Copie** cada valor (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).  
   Você pode copiar o bloco inteiro e depois colar no arquivo de configuração.

---

## Passo 6: Colar no projeto SOT

1. Abra no seu projeto a pasta **Todas as abas**.
2. Abra o arquivo **firebase-config.js** (no Cursor ou Bloco de Notas).
3. Substitua **apenas os valores** entre aspas, mantendo os nomes das chaves:

- **apiKey** → o valor `apiKey` que você copiou.
- **authDomain** → o valor `authDomain` (geralmente `SEU_PROJETO_ID.firebaseapp.com`).
- **projectId** → o valor `projectId`.
- **storageBucket** → o valor `storageBucket` (geralmente `SEU_PROJETO_ID.appspot.com`).
- **messagingSenderId** → o valor `messagingSenderId` (número).
- **appId** → o valor `appId`.

Exemplo (com valores de mentira):

```javascript
var firebaseConfig = {
    apiKey: "AIzaSyB1234567890abcdef",
    authDomain: "meu-sot-abc123.firebaseapp.com",
    projectId: "meu-sot-abc123",
    storageBucket: "meu-sot-abc123.appspot.com",
    messagingSenderId: "987654321",
    appId: "1:987654321:web:xyz789"
};
```

4. **Salve** o arquivo (Ctrl+S).

---

## Passo 7: Testar

1. Abra o SOT no navegador.
2. Vá em **Configurações** → aba **Usuários**.
3. Cadastre um usuário (Login, Senha, Setor) e clique em **Cadastrar Usuário**.
4. A tabela deve atualizar e os dados passam a ficar no Firestore (e na nuvem).
5. Abra a página **Agendamento** e faça login com esse usuário para confirmar.

---

## Resumo

| Onde no Firebase | O que fazer |
|------------------|-------------|
| Console Firebase | Criar/usar projeto |
| Firestore Database | Criar banco, modo teste, região |
| Firestore → Regras | Publicar regra para `sot_agendamento_usuarios` |
| Configurações do projeto → Seus apps | Copiar `apiKey`, `projectId`, etc. |
| Arquivo `firebase-config.js` | Colar os valores no lugar dos placeholders |

Depois disso, o SOT estará usando o Firebase de verdade para usuários do Agendamento.
