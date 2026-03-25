# SOT — Fase 3: merge atómico do bloco KM / chegada

Complementa a [Fase 1 — bloco atómico](SOT-FASE1-MODELO-DADOS-SAIDA-ADMIN.md#5-bloco-atómico-km--chegada) e o merge LWW do cadastro.

## 1. Problema

No merge **latest-wins** por `id`, vence o registo inteiro com `updatedAt` mais recente. Cenário frequente: a **nuvem** recebe uma edição administrativa (ex. setor) com carimbo novo, enquanto o **Quadro / cache local** tem KM de saída, KM de chegada e hora de chegada preenchidos com carimbo mais antigo. Sem regra extra, o registo remoto **apagaria** o trabalho operacional de KM.

Um merge **campo a campo** genérico pode misturar `kmSaida` de uma revisão com `kmChegada` de outra e violar invariantes.

## 2. Política Fase 3 (implementada no cadastro)

1. Mantém-se o **LWW por registo** como base (remoto vs cache local em `loadDataAndPopulateTables`).
2. Para cada `id` presente em ambos os lados, compara-se a **completude** do bloco KM/chegada:
   - três canónicos: `kmSaida` (ou `km_saida`), `kmChegada` (ou `km_chegada`), `chegada` (hora);
   - pontuação = número de canónicos não vazios (0 a 3).
3. Se a cópia **não vencedora** tiver pontuação **estritamente maior**, o vencedor recebe **todo** o bloco copiado da outra cópia (**merge atómico**): `kmSaida`, `kmChegada`, `chegada`, `km_saida`, `km_chegada`, `realizada` (derivada).
4. Se houve enxerto, chama-se `touchCadastroSaidaMetadata(..., false)` para actualizar `updatedAt` / `updatedBy`, permitindo que `cadastroNeedPushSaidas` envie o resultado à nuvem.

Empate na pontuação: mantém-se o bloco do vencedor LWW (sem misturar campos entre revisões).

## 3. API interna (`Cadastrodesaidas8.html`)

| Função | Papel |
|--------|--------|
| `cadastroKmCanonSaida` / `cadastroKmCanonChegadaKm` / `cadastroKmCanonChegadaHora` | Leitura canónica com fallback snake_case. |
| `cadastroKmBlockCompletenessScore` | 0–3. |
| `cadastroApplyAtomicKmBlock(onto, from)` | Escreve o bloco inteiro em `onto`. |
| `cadastroMergeAtomicKmBlockIfRicher(onto, from)` | Aplica só se `from` for estritamente mais completo. |
| `mergeSaidasCadastroLWWWithReport` | Devolve também `kmBlockGraftedIds`. |

Telemetria: evento `merge_km_block_graft` (ver log cadastro).

## 4. Limitações e próximos passos

- Não resolve conflito quando **ambas** as cópias têm o mesmo score mas valores diferentes (mantém o vencedor LWW).
- **Per-field** `fieldUpdatedAt` (Fase 1) permitiria desempate fino; ainda não usado.
- Outras páginas que fundem listas (ex. só `mergeById`) não aplicam esta regra até serem alinhadas.

## 5. Referências

- `Todas as abas/Cadastrodesaidas8.html` — funções acima e `mergeSaidasCadastroLWWWithReport`
- [Fase 2 — IndexedDB](SOT-FASE2-PERSISTENCIA-INDEXEDDB-OUTBOX.md) (persistência local)
