# SOT — Fase 8: recuperação de escrita e UX após conflito

Complementa [Fase 7 — `sotDocGeneration`](SOT-FASE7-FIRESTORE-PRECONDICOES.md): quando a primeira escrita falha (por exemplo geração desactualizada), o `data-service` tenta **uma** recuperação automática antes de devolver `false` ao chamador.

## 1. Fluxo (`data-service._setToFirebase`)

Aplica-se apenas a **`saidasAdministrativas`** e **`saidasAmbulancias`** quando o valor é um **array**.

1. Primeira chamada `firebaseSot.set(key, value, setOpts)` como na Fase 7.
2. Se devolver `false`:
   - Invalida cache de leitura no `data-service` e, se existir, `firebaseSot.invalidateCache(key)`.
   - `firebaseSot.get(key)` para obter o estado **actual** na nuvem.
   - **`mergeSaidasListsLwwClientTiebreak(remote, client)`:** por `id`, vence o registo com `updatedAt` mais recente (`itemUpdatedMs`); em **empate**, prevalece a cópia que o cliente tentou gravar (`value`).
   - `normalizeArrayRecords` com prefixo `saida` / `amb`.
   - Segunda `set` com `expectSotDocGeneration` lido após o `get` (geração fresca do servidor).
3. Se a segunda escrita tiver sucesso:
   - Actualiza `localStorage` (quando não está em modo estrito só-Firebase).
   - Dispara o evento de UI **`sot-fase8-write-recovered`** com `detail: { key }`.
4. Se falhar de novo, devolve `false` (outbox / mensagens de erro existentes continuam a aplicar-se).

## 2. Protecções

- Em modo **`SOT_STRICT_FIREBASE_ONLY`** com remoto não vazio, não se faz merge que substitua o remoto por lista **vazia** (anti-wipe, alinhado ao primeiro `set`).

## 3. UX (Cadastro de Saídas)

`Cadastrodesaidas8.html` escuta **`sot-fase8-write-recovered`** para:

- telemetria `fase8_write_recovered`;
- mensagem informativa ao utilizador;
- `refreshCadastroSyncStatusPill()`.

Outras páginas podem subscrever o mesmo evento.

## 4. Limitações

- Uma única tentativa de recuperação por chamada a `_setToFirebase`.
- Não trata escritas feitas **directamente** com `firebaseSot.set` sem passar pelo `data-service` (ex.: alguns fluxos em `Configuracoes.html`).
- O merge é **por registo**, não campo-a-campo (Fase 4 continua relevante na carga do cadastro).

## 5. Referências

- `Todas as abas/data-service.js` — `mergeSaidasListsLwwClientTiebreak`, ramo Fase 8 em `_setToFirebase`
- `Todas as abas/Cadastrodesaidas8.html` — listener `sot-fase8-write-recovered`
