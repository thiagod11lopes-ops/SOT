# SOT — Fase 4: merge campo-a-campo (fora do bloco KM)

Complementa [Fase 1 — fieldUpdatedAt](SOT-FASE1-MODELO-DADOS-SAIDA-ADMIN.md#3-metadados-por-campo-opcional-extensível), [Fase 3 — bloco KM atómico](SOT-FASE3-MERGE-BLOCO-KM.md) e o merge LWW do cadastro.

## 1. Objectivo

Depois de escolher o registo vencedor por **`updatedAt`** (LWW) e aplicar o **enxerto atómico de KM/chegada** (Fase 3), permitir que **outros campos** possam vir da cópia “perdedora” quando tiverem **carimbo de campo mais recente** que o vencedor — sem partir o bloco KM.

## 2. Metadados: `fieldUpdatedAt`

- Objeto no registo: `{ [nomeDaChave]: string ISO 8601 }`.
- **Gravação (cadastro):** em cada edição de saída existente, `touchCadastroSaidaFieldUpdatedAtFromDiff(prev, next)` compara `prev` e `next` e define `fieldUpdatedAt[k] = now` só para chaves cujo valor mudou (exclui metadados; **inclui** KM se o formulário alterar — o merge Fase 4 ignora chaves KM).
- Registos antigos ou vindos só da nuvem podem não ter mapa: usa-se **`updatedAt` do registo** como fallback para todos os campos sem entrada em `fieldUpdatedAt`.

## 3. Chaves excluídas do merge campo-a-campo

| Grupo | Chaves |
|--------|--------|
| Metadados | `id`, `createdAt`, `updatedAt`, `updatedBy`, `fieldUpdatedAt`, `fieldRevision` |
| Bloco KM (Fase 3) | `kmSaida`, `kmChegada`, `chegada`, `km_saida`, `km_chegada`, `realizada` |
| Outras | chaves que começam por `_` |

Qualquer outra chave presente em `onto` ou `other` é elegível (incl. espelhos como `saida`, `motivo`, `viatura_id`, etc.).

## 4. Algoritmo (`cadastroMergeNonKmFieldsByFieldTime`)

Para cada chave elegível com valores **diferentes** (igualdade por `===` ou `JSON.stringify` para objetos):

1. `tO = fieldUpdatedAt[k]` em `onto` parseado, senão `updatedAt` de `onto`.
2. `tR` idem para `other`.
3. Se `tR > tO`, copia `other[k]` → `onto[k]` e `onto.fieldUpdatedAt[k]` passa a refletir o carimbo adoptado.

Empate (`tR === tO`): mantém-se o valor já em `onto` (vencedor LWW).

## 5. Ordem no `mergeSaidasCadastroLWWWithReport`

1. LWW por `id`.
2. Enxerto KM se a outra cópia for mais completa (Fase 3).
3. Merge campo-a-campo não-KM (Fase 4).
4. Um único `touchCadastroSaidaMetadata(..., false)` se houve enxerto KM **ou** pelo menos um campo adoptado pela Fase 4.

## 6. Telemetria

- Evento `merge_field_level_non_km` com contagem de registos e de campos afectados (amostra de detalhes).

## 7. Limitações

- Sem `fieldUpdatedAt` granular em ambos os lados, o fallback ao `updatedAt` do registo torna o merge campo-a-campo equivalente ao “vencedor leva tudo” para campos em conflito (empate de tempo).
- Importações em massa devem, numa evolução futura, inicializar `fieldUpdatedAt` se se quiser discriminação fina.

## 8. Referências

- `Todas as abas/Cadastrodesaidas8.html` — `touchCadastroSaidaFieldUpdatedAtFromDiff`, `cadastroMergeNonKmFieldsByFieldTime`, `mergeSaidasCadastroLWWWithReport`, `saveNewSaida` (edição)
