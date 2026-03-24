# Critérios de aceite objetivos — Cadastro de Saídas

Documento de **tópico 19** do plano de correção da aba `Cadastrodesaidas8.html`. Complementa o checklist executável em [`QA-CHECKLIST-CADASTRO-SAIDAS.md`](./QA-CHECKLIST-CADASTRO-SAIDAS.md): aqui estão as **regras mensuráveis** que definem “pronto para produção”. A ordem de validação antes do deploy está em [`ROLLOUT-CADASTRO-SAIDAS.md`](./ROLLOUT-CADASTRO-SAIDAS.md) (tópico 20).

---

## 1) Definições

| Termo | Significado |
|--------|-------------|
| **Sucesso falso** | A UI indica conclusão plena (ex.: “cadastrado com sucesso”, “todas as datas salvas”) quando, de fato, a nuvem não confirmou a escrita **e** o estado não foi comunicado como **pendente de sincronização** ou **falha**. |
| **Duplicação por duplo clique** | Dois (ou mais) registros equivalentes criados por reentrância do mesmo gesto do usuário nos fluxos protegidos por lock (cadastro simples, múltiplas, série, importação, exclusões). |
| **Status rastreável** | Toda operação de persistência de snapshot (`saidasAdministrativas` / `saidasAmbulancias`) passa pelo pipeline único e produz um resultado estruturado consumido pelo fluxo de UI (ou telemetria), sem “sumir” o desfecho. |

Valores canônicos de status do pipeline: `success` \| `pending_sync` \| `failed` (conforme retorno de `persistCadastroSaidasSnapshot`).

---

## 2) Critérios obrigatórios (binários)

Cada item deve ser verificável com **pass/fail** claro.

### C-01 — Zero sucesso falso em cadastro simples

- **Regra:** Se `persistCadastroSaidasSnapshot` retornar `pending_sync` ou `failed`, a mensagem ao usuário **não** pode equivaler a “100% sincronizado na nuvem”.
- **Verificação:** Casos do [`QA-CHECKLIST-CADASTRO-SAIDAS.md`](./QA-CHECKLIST-CADASTRO-SAIDAS.md) seção **4** (offline, sem login, falha de rede simulada).

### C-02 — Zero sucesso falso em lote (múltiplas / série)

- **Regra:** Mensagem agregada deve refletir contagens reais de `success`, `pending_sync` e `failed` por item (ou explícito que houve falha parcial).
- **Verificação:** Seção **4** do checklist (múltiplas saídas e cadastro em série com falha simulada em parte das datas).

### C-03 — Zero duplicação por duplo clique nos fluxos críticos

- **Regra:** Nos fluxos sob `runCadastroLocked`, duplo clique rápido não deve gerar segundo efeito completo antes do término do primeiro (sem segundo `persist` completo paralelo).
- **Verificação:** Seção **5** do checklist + contagem de linhas novas / IDs no `localStorage` ou Firestore após teste.

### C-04 — 100% das mutações iniciadas pelo usuário via pipeline com status explícito

Toda ação do usuário que **altera** o par de coleções (cadastro, edição, importação, exclusão, outbox flush concluída) deve passar pelo pipeline e obter desfecho rastreável na UI (ou efeito equivalente no flush):

**Nota:** o push automático após `loadDataAndPopulateTables` (merge LWW, `cadastroNeedPushSaidas`) usa `setSaidas*` / `firebaseSot.set` de forma assíncrona e **não** substitui este requisito — é sincronização de carga, não substitui o contrato das operações abaixo.

| Operação (usuário) | Deve passar por | Resultado esperado na UI |
|--------------------|-----------------|---------------------------|
| Cadastrar / editar saída (formulário principal) | `persistCadastroSaidasSnapshot` | `notifyCadastroSubmitPersistResult` alinhado ao `status` |
| Cadastrar múltiplas | idem | Mensagem conforme `multiPersist.status` |
| Cadastro em série | `saveNewSaida` + agregação | Texto de `getSerialCadastroOutcomeDisplay` honesto |
| Importar CSV | idem | `notifyCadastroImportPersist` |
| Excluir linha | idem | `notifyCadastroRowDeletePersist` |
| Excluir tudo | idem | Toast + consistência pós-`loadData` |
| Flush da outbox | `flushCadastroOutbox` | Pill / pendência coerentes após tentativa |

- **Verificação:** Revisão de código: `setSaidas*` no fluxo de **formulário/import/exclusão/outbox** só dentro de `persistCadastroSaidasSnapshot`; exceção esperada: push pós-merge em `loadDataAndPopulateTables`. Reforço com seções **4** e **6** do checklist.

### C-05 — Pendência sincronizável

- **Regra:** Se `status === 'pending_sync'` e houver outbox, ao voltar **online** e **autenticado**, o sistema deve tentar `flush` automático (ou manter indicador explícito de pendência até sucesso).
- **Verificação:** Seção **6** do checklist.

### C-06 — Conflito e política explícita

- **Regra:** Na carga com merge LWW, se houver `remoteWon` / `localWon` / `localOnly`, o usuário recebe aviso e o log de conflito (e telemetria, se ativa) registra o evento.
- **Verificação:** Seção **8** do checklist + opcionalmente evento `merge_conflict_lww` na telemetria.

---

## 3) Critérios desejáveis (não bloqueiam sozinhos)

| ID | Critério | Nota |
|----|-----------|------|
| D-01 | Telemetria com eventos `save_success` / `save_error` / `save_pending` por operação relevante | Suporte a diagnóstico; ver seção **12** do checklist |
| D-02 | Tempo de carga inicial sem PDF/OCR até uso | Seção **11** do checklist |

---

## 4) Decisão de aceite (release)

**Aceito para produção** somente se:

1. Todos os critérios **C-01 a C-06** forem atendidos nos ambientes alvo (desktop + mobile quando aplicável).
2. O [`QA-CHECKLIST-CADASTRO-SAIDAS.md`](./QA-CHECKLIST-CADASTRO-SAIDAS.md) estiver executado com seções críticas em `[OK]`, alinhado à seção **13** desse checklist.

**Não aceito** se qualquer **C-0x** falhar ou se houver regressão conhecida em sucesso falso / duplo clique / persistência fora do pipeline.

---

## 5) Rastreabilidade (auditoria rápida)

- **Código:** pipeline central `persistCadastroSaidasSnapshot` + locks `runCadastroLocked`.
- **Armazenamento local:** outbox `sot_cadastro_saidas_outbox_v1`; telemetria `sot_cadastro_saidas_telemetry_v1`; log de conflito `sot_cadastro_conflict_log_v1`.
- **Este documento:** versão lógica **v1** (tópico 19); alterações futuras devem incrementar a versão no rodapé ou em commit message.

*Última definição: tópico 19 do plano Cadastro de Saídas — critérios de aceite objetivos.*
