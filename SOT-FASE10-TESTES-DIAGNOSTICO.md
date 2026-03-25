# SOT — Fase 10: testes e diagnóstico (fusão em memória)

Objetivo: dar um **check rápido** da lógica de **fusão LWW com desempate a favor do cliente** (`mergeSaidasListsLwwClientTiebreak`) e de **`itemUpdatedMs`**, **sem rede** e **sem Firestore**.

## O que é validado

- Remoto mais recente prevalece sobre registo do cliente mais antigo.
- Cliente mais recente prevalece sobre remoto mais antigo.
- **Empate de timestamp** → fica o **objeto do cliente** (desempate).
- Listas só remotas / só de cliente.
- `itemUpdatedMs` devolve um valor positivo para `updatedAt` ISO válido.

## Como executar

### 1. Página Configurações

1. Abra `Configuracoes.html` (com `data-service.js` carregado, como no projeto).
2. Expanda **Ferramentas adicionais**.
3. Clique em **Teste rápido de fusão (Fase 10)**.
4. A mensagem no topo da área de gestão indica sucesso ou falha; a consola (F12) mostra `[SOT Fase 10] selftest: OK` ou erros por verificação.

### 2. Consola do navegador

Em qualquer página que carregue `data-service.js`:

```js
window.__sotPhase10SelfTest.run(); // true = todas as verificações passaram
```

## Limitações

- **Não** testa IndexedDB, outbox, `SOTSync`, autenticação ou escrita/leitura no Firebase. Para instantâneo de filas e última sync, veja [Fase 11](SOT-FASE11-DIAGNOSTICO-SINCRONIZACAO.md).
- **Não** substitui testes E2E ou revisão manual de fluxos de sincronização nas abas de saídas.

## Implementação

- API: `window.__sotPhase10SelfTest` em `Todas as abas/data-service.js`.
- UI: botão em `Todas as abas/Configuracoes.html` (Ferramentas adicionais).
