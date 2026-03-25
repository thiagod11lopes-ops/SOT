# SOT — Fase 9: BroadcastChannel para coerência entre abas/iframes

Complementa [Fase 8](SOT-FASE8-UX-CONFLITO-ESCRITA.md). Quando o **`data-service`** conclui com sucesso uma escrita no Firestore para as listas mestre de saídas, emite um aviso por **`BroadcastChannel`** para que outras **vistas abertas** (outros iframes do SOT5, outras abas do mesmo origem) possam **invalidar cache** e **recarregar**.

## 1. Canais e mensagens

| Canal | Quando | Payload típico |
|--------|--------|----------------|
| `sot_saidas_administrativas` | Após `set` Firebase bem-sucedido em `saidasAdministrativas` | `{ type: 'saidas_updated', source: 'data_service_f9', key, t }` |
| `sot_saidas_ambulancias` | Idem para `saidasAmbulancias` | `{ type: 'saidas_amb_updated', source: 'data_service_f9', key, t }` |

O tipo `saidas_updated` no canal administrativo é **o mesmo** já usado pelo Quadro de Saídas Administrativas ao gravar localmente, de modo que **Estatística** e outras subscrições existentes continuam a funcionar.

## 2. Onde é emitido

- `Todas as abas/data-service.js` — função `notifyFase9SaidasListBroadcast`, chamada após sucesso do primeiro `firebaseSot.set` e após recuperação **Fase 8**.
- **Não** é chamado no ramo só offline (`isForcedOfflineMode`) da `_setToFirebase` (o `storage` local já notifica outros contextos).

## 3. Onde é recebido

- **`Saidasadministrativas6.html`** — já escuta `sot_saidas_administrativas` com `type === 'saidas_updated'` → `scheduleSaidasAdmUnifiedReload`.
- **`Estatistica4.html`** — escuta o mesmo canal e refresca estatísticas em qualquer mensagem.
- **`Saidasdeambulâncias2.html`** — escuta `sot_saidas_ambulancias`, invalida `saidasAmbulancias` no `firebaseSot` e chama `scheduleAmbUnifiedReload`.

## 4. Limitações

- Escritas que **não** passam pelo `data-service` (ex.: `firebaseSot.set` directo em algumas telas) **não** disparam estes avisos.
- `BroadcastChannel` só alcança o **mesmo origem** (mesmo esquema/host/porta).
- Pode haver **recargas duplicadas** (ex.: `storage` + broadcast); os debounces existentes nas páginas reduzem o impacto.

## 5. Referências

- `Todas as abas/data-service.js` — `notifyFase9SaidasListBroadcast`
- `Todas as abas/Saidasadministrativas6.html` — `SOT_SAIDAS_ADM_BC.onmessage`
- `Todas as abas/Saidasdeambulâncias2.html` — `_sotF9AmbBc`
