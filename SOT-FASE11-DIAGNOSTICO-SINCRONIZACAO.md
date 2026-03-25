# SOT — Fase 11: diagnóstico de sincronização (estado local)

Complementa [Fase 10](SOT-FASE10-TESTES-DIAGNOSTICO.md), que valida **só** a fusão LWW em memória. A Fase 11 expõe um **instantâneo legível** do que o navegador sabe sobre **última sync**, **política offline** e **filas locais (outbox)** — **sem gravar** no Firebase e **sem** drenar filas.

## O que é incluído no snapshot

| Campo | Significado |
|--------|-------------|
| `navigatorOnLine` | `navigator.onLine` do browser |
| `sotOfflineModeFlag` | Valor de `localStorage.sot_offline_mode` (`'true'` / `'false'` / null) |
| `cloudSyncDisabledByPolicy` | Mesma lógica que `sot-sync` usa para recusar sync com a nuvem |
| `lastSyncIso` / `lastSyncDisplay` | Último sync global (`sot_last_sync_timestamp`), texto amigável |
| `syncInFlight` | Se uma sincronização `SOTSync.sync` está em curso |
| `dataServiceUseFirebase` | Se `dataService.useFirebase` está ativo |
| `firebaseAuthGateOk` | Se existir `firebaseSot.authGateOk()`, indica login OK (senão `null`) |
| `outboxCadastro` | Fila `sot_cadastro_saidas_outbox_v1` (job único `replace_collections` ou vazio) |
| `outboxSaidasAdministrativas` | Fila `sot_saidas_adm_outbox_v1` (número de upserts pendentes) |
| `outboxSaidasAmbulancias` | Fila `sot_amb_outbox_v1` (tamanho de `items`) |
| `saidasAdmSyncLogTail` | Últimos 5 eventos de `sot_saidas_adm_sync_log_v1` (telemetria local) |

## Como usar

### Configurações

1. Abra `Configuracoes.html`.
2. **Ferramentas adicionais** → **Diagnóstico de sincronização (Fase 11)**.
3. A mensagem na página resume; o **objeto completo** aparece na consola: `[SOT Fase 11] diagnostics snapshot`.

### Consola

Em qualquer página que carregue `sot-sync.js`:

```js
window.__sotPhase11Diagnostics.getSnapshot(); // objeto
window.__sotPhase11Diagnostics.log();       // idem + console.log
```

## Limitações

- **Não** lê IndexedDB de cadastro (`sot-saidas-indexeddb.js`) — essa API não está em todas as páginas; use o fluxo normal do cadastro para inspecionar espelho local.
- **Não** substitui logs do Firestore nem diagnóstico de regras de segurança.
- Contagens de outbox refletem **localStorage** neste perfil do browser.

## Ficheiros

- `Todas as abas/sot-sync.js` — `window.__sotPhase11Diagnostics`
- `Todas as abas/Configuracoes.html` — botão na secção Ferramentas adicionais
