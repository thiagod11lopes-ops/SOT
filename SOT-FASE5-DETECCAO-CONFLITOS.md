# SOT — Fase 5: detecção de conflitos “moles”

Complementa [Fase 3](SOT-FASE3-MERGE-BLOCO-KM.md) e [Fase 4](SOT-FASE4-MERGE-CAMPOS.md). **Não altera** a política de merge: apenas **identifica** situações em que duas cópias divergem mas o algoritmo escolhe um valor por empate ou regra arbitrária.

## 1. Quando corre

Na carga com nuvem (`loadDataAndPopulateTables`), **antes** dos enxertos Fase 3 e Fase 4, para cada `id` presente em remoto **e** no cache local, compara-se a cópia remota normalizada com a cópia local normalizada (`rem` e `n` em `mergeSaidasCadastroLWWWithReport`).

## 2. Tipos de alerta (`issues[]`)

| `kind` | Significado |
|--------|-------------|
| `km_same_score_divergent` | Mesma pontuação de completude KM (1–3) em ambas as cópias, mas triple canónico (`kmSaida`/`kmChegada`/`chegada` + snake) **diferente**. A Fase 3 só enxerta quando uma cópia é **estritamente mais completa**. |
| `field_timestamp_tie` | Campo fora de metadados/KM com valores diferentes e **mesmo** `cadastroFieldUpdatedMsForKey`, com pelo menos um carimbo útil (`tMs > 0` ou `fieldUpdatedAt[k]` explícito num dos lados). Empates com 0 em ambos **sem** carimbo por campo são ignorados para evitar ruído em dados legados. |

Cada entrada em `softConflictDetails` inclui: `id`, `tipo` (`Administrativa` / `Ambulância`), `issues`.

## 3. Superfícies de observabilidade

1. **Consola:** `console.warn('[SOT Cadastro Saídas][Fase 5 — conflitos não resolvidos automaticamente]', …)`.
2. **Telemetria em memória:** evento `merge_soft_conflicts_fase5` (payload com contagem e amostra).
3. **localStorage:** fila circular `sot_cadastro_soft_conflict_log_v1` (máx. 60 entradas), via `appendCadastroSoftConflictLogEntries`.
4. **UI:** `displayMessage` em modo aviso com amostra de IDs (não lista todos os campos em conflito).

## 4. O que o operador deve fazer

Abrir o cadastro, localizar os `id` indicados e **reconciliar** manualmente (editar e gravar) ou corrigir na fonte autorizada, conforme processo interno.

## 5. Evoluções possíveis (fora do âmbito desta fase)

- Resolução assistida (modal campo a campo).
- `revision` / transacções Firestore para conflitos duros.
- Propagação da mesma detecção noutras abas (ex. quadro administrativo).

## 6. Referências

- `Todas as abas/Cadastrodesaidas8.html` — `cadastroCollectSoftMergeConflicts`, `cadastroKmBlockCanonicalTripleStr`, `appendCadastroSoftConflictLogEntries`, retorno `softConflictDetails` do merge.
