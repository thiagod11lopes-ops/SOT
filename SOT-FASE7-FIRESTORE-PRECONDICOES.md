# SOT — Fase 7: pré-condições Firestore (`sotDocGeneration`)

Complementa [Fase 1 — revision](SOT-FASE1-MODELO-DADOS-SAIDA-ADMIN.md) com um contador **por documento** no envelope Firestore, implementado sem alterar as regras (`hasValidArrayEnvelope` continua a exigir só `items` + `updatedAt`; campos extra são permitidos).

## 1. Campo no documento

| Campo | Tipo | Significado |
|--------|------|-------------|
| `sotDocGeneration` | int ≥ 0 | Incrementado em **cada** escrita bem-sucedida via transacção (começa em 1 na primeira gravação Fase 7; documentos antigos tratados como geração 0 até a primeira escrita). |

Presente nos documentos `sot_data/saidasAdministrativas` e `sot_data/saidasAmbulancias` quando a escrita passa pelo caminho transaccional.

## 2. Comportamento

1. **`get`:** ao ler um destes documentos, o cliente guarda a última geração conhecida (`getLastSotDocGeneration(key)`).
2. **`set` (via `data-service._setToFirebase`):** se existir geração conhecida, envia-se `expectSotDocGeneration` igual a esse valor.
3. **Transacção Firestore:** lê o documento; se `expectSotDocGeneration` não for `null` e for **diferente** da geração no servidor, a escrita **aborta** (`SOT_F7_GEN_MISMATCH`) e o cliente devolve `false` (outbox / retry / merge podem actuar).
4. Caso contrário grava o payload com `sotDocGeneration: prev + 1` e actualiza o cache local da geração.

Se **não** houver geração em cache (primeira sessão sem `get`, ou após `invalidateCache`), **não** se envia expectativa: a transacção só incrementa a geração no servidor (sem detecção de conflito nessa tentativa).

## 3. Ficheiros

- `Todas as abas/firebase-sot-firestore.mjs` — `runTransaction`, `docGenByKey`, `getLastSotDocGeneration`, `set(key, value, options)`.
- `Todas as abas/firebase-sot-service.js` — paridade (API compat com `db.runTransaction` quando existir).
- `Todas as abas/data-service.js` — passa `expectSotDocGeneration` em escritas das duas chaves quando disponível.

## 4. Limitações

- Não cobre outros documentos `sot_data` nem os shards `saidasAdm_day_*`.
- Conflito detectado implica `set` → `false`; a **fusão** com dados mais recentes depende dos fluxos existentes (cadastro, outbox, nova leitura).
- Duas abas com a mesma geração em cache podem disputar: uma ganha, a outra falha e deve reler.

## 5. Referências

- [Fase 6 — backoff / outbox](SOT-FASE6-SINCRONIZACAO-PERIODICA.md) para retry após falha de escrita.
