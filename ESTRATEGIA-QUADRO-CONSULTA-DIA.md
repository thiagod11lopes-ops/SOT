# Estratégia de consulta por dia — Quadro de Saídas (item 2)

## Decisão

Foi adotada a linha **2a**: **documentos auxiliares na coleção `sot_data`**, um por data civil, contendo apenas as saídas administrativas daquele dia.

| Opção | Decisão |
|--------|---------|
| **2a — Shard por dia (`sot_data`)** | **Adotada.** Leitura do Quadro pode ser **1 documento pequeno** por dia. |
| **2b — API / Cloud Function** | **Não adotada neste ciclo** (hospedagem estática GitHub Pages; exigiria backend dedicado e custo operacional). |
| **2c — Só documento único** | **Fallback obrigatório** enquanto os shards por dia não existirem ou falharem. Continua o modelo atual `saidasAdministrativas`. |

## Contrato Firestore

- **Documento mestre (já existente):** `sot_data/saidasAdministrativas` — array completo (fonte de verdade para escrita atual do SOT).
- **Documento opcional por dia:** `sot_data/saidasAdm_day_{YYYY-MM-DD}`  
  - Valor: mesmo formato que o cliente já usa — **array JSON** de registros de saída administrativa **somente daquela data** (`dataSaida` / `dataPedido` / `data` coerentes com o dia).
  - Se o documento **não existir** ou `get` retornar `null`, o Quadro usa o fallback: lê `saidasAdministrativas` e filtra no cliente (comportamento anterior).

Prefixo fixo no código do Quadro: **`saidasAdm_day_`** (ex.: `saidasAdm_day_2025-03-24`).

## Regras de segurança (Firestore)

Se as regras já permitem leitura/escrita em `sot_data/{doc}` para utilizadores autenticados, os novos IDs `saidasAdm_day_*` entram no **mesmo padrão** — validar no console Firebase que `read`/`update` aplicam-se a qualquer `doc` permitido hoje para `saidasAdministrativas`. Ajustar apenas se houver lista explícita de IDs de documento.

## População dos shards (item 3)

Sempre que `firebaseSot.set('saidasAdministrativas', lista)` conclui com sucesso o documento mestre, o módulo `firebase-sot-firestore.mjs` executa **`syncSaidasAdministrativasDayShards`**: agrupa a lista por data civil (mesma lógica de `dataSaida` / `dataPedido` / `data` que o Quadro) e grava/atualiza `sot_data/saidasAdm_day_{YYYY-MM-DD}` em batches (até 400 operações por batch).

- **Limite:** no máximo **220** datas distintas por gravação (as mais recentes por ordenação de ISO); datas mais antigas podem ficar com shard desatualizado até uma gravação futura que as volte a incluir no mestre (ou um backfill manual).
- **Lista vazia:** não corre sync de shards (evita apagar histórico de dias sem nova escrita explícita).
- **Falha no sync:** o mestre permanece gravado; regista-se `warn` no log; o Quadro continua a poder usar o fallback `saidasAdministrativas`.

Backfill histórico opcional: exportar lista atual, gravar uma vez via app ou script que chame `set` com a lista completa para gerar todos os shards cobertos pelo limite.

## Leitura de KM anterior (histórico)

Com shard por dia, a lista carregada para o quadro pode ser **só do dia**. O hint de **KM Saída** (última `kmChegada` da viatura em saídas **anteriores**) precisa do histórico: o Quadro faz **carga lazy** de `saidasAdministrativas` **apenas quando** o utilizador abre o fluxo de edição e o modo atual é `day_shard` (no máximo um `get` extra por sessão, com cache em memória até o próximo reload da lista).

## Referência de código

- `QuadroDeSaidas.html`: `getAllSaidas(selectedDateISO)`, retorno `{ saidas, remoteLoaded, loadMode: 'day_shard' | 'full' }`.
- `Todas as abas/firebase-sot-firestore.mjs`: após `set` do mestre, `syncSaidasAdministrativasDayShards` + constantes `SAIDAS_ADM_DAY_SHARD_PREFIX` / `SAIDAS_ADM_DAY_SHARD_MAX_DATES`.
- Invalidação de cache em reload externo / login: `firebaseSot.invalidateQuadroSaidasCaches(dataISO)` — mestre + shard do dia visível (sem limpar todos os shards, para não forçar reads desnecessárias ao mudar de data).

## Cache por tipo de chave (item 5)

No `firebase-sot-firestore.mjs`, o TTL em memória do `get` passa a depender do id do documento:

| Chave | TTL (orientação) |
|--------|-------------------|
| `saidasAdministrativas` (mestre) | 45 s — lista grande; fallback do Quadro menos tempo “stale”. |
| `saidasAdm_day_*` (shard) | 120 s — payload menor; menos leituras ao alternar entre dias recentes. |
| Demais chaves `sot_data` | 60 s (padrão). |

---

*Itens 2, 3 e 5 do plano de melhorias do Quadro de Saídas — leitura por dia, sync de shards, reconciliação em lote (item 4) e cache/invalidação alinhados.*
