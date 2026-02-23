# Passo a passo: colocar o projeto SOT no GitHub

Siga estes passos no **PowerShell** ou no **Prompt de Comando**, dentro da pasta do projeto.

---

## 1. Abrir a pasta do projeto

```powershell
cd "c:\Users\anamr\OneDrive\Área de Trabalho\Projetos\SOT"
```

---

## 2. Inicializar o Git (se ainda não tiver)

```powershell
git init
```

Isso cria a pasta `.git` e transforma a pasta em um repositório Git.

---

## 3. Configurar nome e e-mail (só na primeira vez no computador)

```powershell
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"
```

Use o **mesmo e-mail** da sua conta do GitHub.

---

## 4. Adicionar todos os arquivos

```powershell
git add .
```

O ponto (`.`) adiciona tudo que ainda não está no `.gitignore`.

Para ver o que será commitado:

```powershell
git status
```

---

## 5. Fazer o primeiro commit

```powershell
git commit -m "Primeiro commit - Sistema SOT"
```

---

## 6. Criar o repositório no GitHub

1. Acesse **https://github.com** e faça login.
2. Clique no **+** no canto superior direito → **New repository**.
3. Preencha:
   - **Repository name:** por exemplo `SOT` ou `sistema-sot`.
   - **Description:** opcional (ex.: "Sistema de Gestão de Transporte").
   - Deixe **Public** (ou Private se quiser).
   - **Não** marque "Add a README" nem "Add .gitignore" (o projeto já tem).
4. Clique em **Create repository**.

O GitHub vai mostrar uma página com instruções; você já vai usar o passo 7.

---

## 7. Conectar o projeto ao repositório no GitHub

Na página do repositório vazio, o GitHub mostra algo como:

```text
…or push an existing repository from the command line
```

Use os comandos que aparecem lá (trocando `SEU_USUARIO` e `NOME_DO_REPOSITORIO` pelos seus):

```powershell
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git branch -M main
git push -u origin main
```

Exemplo se seu usuário for `anamr` e o repositório `SOT`:

```powershell
git remote add origin https://github.com/anamr/SOT.git
git branch -M main
git push -u origin main
```

Se pedir **usuário e senha**: use seu usuário do GitHub e, como senha, um **Personal Access Token** (o GitHub não aceita mais senha normal nesse caso). Para criar o token: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token**.

---

## 8. Próximas alterações (depois que já estiver no GitHub)

Sempre que fizer mudanças no projeto:

```powershell
git add .
git commit -m "Descrição do que você alterou"
git push
```

---

## Resumo rápido

| Passo | Comando / Ação |
|-------|-----------------|
| 1 | `cd` até a pasta do SOT |
| 2 | `git init` |
| 3 | `git config user.name` e `user.email` |
| 4 | `git add .` |
| 5 | `git commit -m "Primeiro commit - Sistema SOT"` |
| 6 | Criar repositório no site do GitHub |
| 7 | `git remote add origin ...` → `git branch -M main` → `git push -u origin main` |

Depois disso, o projeto estará no GitHub e você poderá usar `git add`, `git commit` e `git push` para enviar novas alterações.
