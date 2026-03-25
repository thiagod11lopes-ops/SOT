# SOT — Fase 6: sincronização periódica e backoff do outbox (Cadastro)

Complementa [Fase 2 — outbox](SOT-FASE2-PERSISTENCIA-INDEXEDDB-OUTBOX.md). Garante que a fila **`sot_cadastro_saidas_outbox_v1`** é **re-tentada** de forma controlada sem sobrecarregar o cliente ou o Firestore quando há erros repetidos.

## 1. Gatilhos de flush (existentes + Fase 6)

| Gatilho | Comportamento |
|---------|----------------|
| `persistCadastroSaidasSnapshot` com `pending_sync` | `scheduleCadastroOutboxFlush(2500)` |
| Login Firebase (`sot-firebase-auth-changed`, signed in) | flush ~500 ms |
| **`online`** | reset de backoff + flush ~300 ms |
| **`visibilitychange`** (aba visível) | flush imediato (agendado 0 ms) |
| **`focus`** (janela, aba visível) | idem |
| **`pageshow` com `persisted`** (Fase 6) | flush ~200 ms ao regressar de bfcache |
| Carga inicial da página | `scheduleCadastroOutboxFlush(800)` |
| **Relógio periódico** (Fase 6) | a cada `CADASTRO_OUTBOX_PERIODIC_MS` (30 s), se aba visível, online, sem backoff activo e com outbox |

## 2. Backoff após falha (Fase 6)

- Cada tentativa de `flushCadastroOutbox` que **não** obtém `success` (ou lança excepção) incrementa `cadastroOutboxFlushFailStreak` (com tecto).
- Próximas tentativas **periódicas** são suprimidas até `Date.now() >= cadastroOutboxBackoffUntil`, com intervalo `min(BASE * 2^streak, CAP)`:
  - `CADASTRO_OUTBOX_BACKOFF_BASE_MS` = 20 s  
  - `CADASTRO_OUTBOX_BACKOFF_CAP_MS` = 300 s (5 min)
- **Sucesso** ou **outbox vazio**: streak e backoff repostos a zero.
- **`online`**: repõe streak e backoff (nova ligação merece tentativa imediata).
- **Eventos explícitos** (`visibilitychange`, `focus`, auth) continuam a chamar `scheduleCadastroOutboxFlush`; o flush em si **não** verifica backoff dentro de `flushCadastroOutbox` — só o **interval** evita martelar em loop. (Assim o utilizador ao voltar à aba força uma tentativa.)

## 3. Telemetria

- `outbox_backoff_fase6` — `untilEpochMs`, `failStreak`
- `outbox_flush_retry` — inclui `backoffMs`, `failStreak`

## 4. Ajuste fino

Alterar `CADASTRO_OUTBOX_PERIODIC_MS` no HTML se 30 s for demasiado ou pouco para o ambiente operacional.

## 5. Referências

- `Todas as abas/Cadastrodesaidas8.html` — `flushCadastroOutbox`, `scheduleCadastroOutboxFlush`, listeners `online` / `visibilitychange` / `focus` / `pageshow`, `setInterval` com `CADASTRO_OUTBOX_PERIODIC_MS`
