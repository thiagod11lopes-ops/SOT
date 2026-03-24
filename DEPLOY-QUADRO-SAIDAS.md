# Deploy do Quadro de Saídas — paths e GitHub Pages (item 15)

## Estrutura obrigatória no repositório

O ficheiro **`QuadroDeSaidas.html`** na **raiz do site** deve ter ao lado (mesmo nível de pasta) o diretório **`Todas as abas/`** com os módulos que a página carrega.

```
<raiz-do-site>/
  QuadroDeSaidas.html
  Todas as abas/
    firebase-sot-firestore.mjs
    firebase-auth.js
    api-service.js      (opcional na carga inicial — item 14; carregado sob demanda)
    data-service.js     (idem)
    … (outros ficheiros do SOT)
```

Se esta árvore não se mantiver (por exemplo, só copiar `QuadroDeSaidas.html` sem a pasta, ou publicar o Quadro noutra pasta sem ajustar caminhos), **import dinâmico**, **scripts** e **fallback lazy** falham.

---

## Resolução de URLs (relativos ao documento)

| Origem no código | Caminho lógico |
|------------------|----------------|
| `import(new URL('Todas as abas/firebase-sot-firestore.mjs', document.baseURI))` | Módulo Firestore modular |
| `<script src="Todas%20as%20abas/firebase-auth.js?…">` | Auth (mesma pasta `Todas as abas/`) |
| `new URL('Todas as abas/', document.baseURI)` + `api-service.js` / `data-service.js` | Fallback item 14 |

`document.baseURI` é o URL do próprio `QuadroDeSaidas.html`. Em **GitHub Pages**, com o ficheiro em `https://&lt;user&gt;.github.io/&lt;repo&gt;/QuadroDeSaidas.html`, os recursos resolvem para `https://&lt;user&gt;.github.io/&lt;repo&gt;/Todas%20as%20abas/...`.

Não é necessário `<base href>` desde que o Quadro e `Todas as abas/` permaneçam **irmãos** na publicação.

---

## GitHub Pages

- O **site** costuma servir a **raiz do branch** configurado (`main` / `gh-pages` / pasta `/docs`).
- Garantir que **`QuadroDeSaidas.html`** e **`Todas as abas/`** estão nessa raiz (ou no mesmo prefixo que o resto do SOT usa).
- URL típica do Quadro:  
  `https://&lt;user&gt;.github.io/&lt;nome-do-repo&gt;/QuadroDeSaidas.html`

Se o projeto usar **subcaminho** (ex.: projeto numa subpasta do domínio), a mesma regra aplica-se: `QuadroDeSaidas.html` e `Todas as abas/` devem estar **no mesmo nível relativo** um ao outro que no repositório.

---

## Publicar o Quadro noutro URL ou CDN

1. Replicar a **mesma estrutura de pastas** (`QuadroDeSaidas.html` + `Todas as abas/` com os ficheiros referidos).
2. **Ou** alterar explicitamente no HTML/JS todos os caminhos (não recomendado sem revisão completa).
3. Evitar servir só o HTML sem os ficheiros em `Todas as abas/` — o Quadro não inicializa o Firestore nem o auth.

---

## Checklist antes de um deploy

- [ ] `Todas as abas/firebase-sot-firestore.mjs` presente e acessível pelo mesmo origin (CORS não aplica a mesmo origin; **MIME** `.mjs` deve ser `application/javascript` ou `text/javascript` — GitHub Pages costuma servir bem).
- [ ] `Todas as abas/firebase-auth.js` acessível.
- [ ] Testar abrir o Quadro, login Google e lista do dia (confirma boot + leitura Firestore).

---

## Referências no código

- Comentário no `<head>` / bloco de scripts de `QuadroDeSaidas.html` (item 15).
- Contrato de sync entre abas: `CONTRATO-QUADRO-SAIDAS-SYNC.md`.

---

*Item 15 do plano de melhorias do Quadro de Saídas — validação de paths de deploy e documentação para GitHub Pages / URLs alternativos.*
