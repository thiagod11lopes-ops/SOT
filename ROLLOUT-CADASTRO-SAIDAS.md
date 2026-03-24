# Rollout em fases — Cadastro de Saídas

Guia do **tópico 20** do plano de correção: publicar e validar a aba `Todas as abas/Cadastrodesaidas8.html` **por etapas**, com critérios de passagem explícitos entre fases.

Documentos relacionados:

- Execução de testes: [`QA-CHECKLIST-CADASTRO-SAIDAS.md`](./QA-CHECKLIST-CADASTRO-SAIDAS.md)
- Regras mensuráveis de release: [`ACEITE-CADASTRO-SAIDAS.md`](./ACEITE-CADASTRO-SAIDAS.md)

---

## Princípios

1. **Nenhuma fase seguinte** começa com bloqueadores abertos da fase anterior.
2. Cada fase tem um **critério de saída** objetivo (pass/fail).
3. Em produção, só promover após **Fase 3** concluída e critérios **C-01 a C-06** do aceite atendidos.

---

## Fase 1 — Confiabilidade de gravação

**Objetivo:** dados corretos no cliente e na nuvem (ou pendência explícita), sem sucesso falso e sem duplicação óbvia por reentrância.

| Área | Cobertura no plano (referência) | O que validar |
|------|----------------------------------|---------------|
| Pipeline único e status | Tópicos 1–2 | Toda mutação relevante passa por `persistCadastroSaidasSnapshot` com `success` / `pending_sync` / `failed`. |
| Confirmação / falha remota | Tópico 3 | Offline, sem auth ou falha de rede: UI não declara “sincronizado na nuvem” indevidamente. |
| Locks | Tópico 4 | Duplo clique em cadastrar, múltiplas, série, import, excluir. |
| Outbox offline-first | Tópico 5 | Pendência gravada; após online + auth, flush ou indicador claro. |
| Validação e payload | Tópicos 6–7 | Datas, KM, literais inválidos bloqueados antes de persistir. |
| Metadados e IDs | Tópico 8 | `id`, `updatedAt`, auditoria em novos/editados. |
| Lote honesto | Tópico 9 | Série/múltiplas: contagem OK/pendente/falha correta. |
| Merge e conflito | Tópicos 10–11 | LWW na carga; aviso se houver conflito. |

**Critério de saída da Fase 1**

- Checklist QA: seções **2, 3, 4, 5, 6, 7 e 8** com `[OK]` em ambiente de homologação.
- Aceite: **C-01, C-02, C-03, C-04, C-05, C-06** verificados pelo menos uma vez cada (não precisa repetir todos os testes nas fases 2 e 3 se não houver mudança no pipeline).

---

## Fase 2 — UX, status e operação

**Objetivo:** operador entende o que aconteceu (salvando, pendente, erro, offline) e não depende de `alert`/`confirm` nativos nos fluxos principais.

| Área | Cobertura no plano | O que validar |
|------|--------------------|---------------|
| Pill e estados de sync | Tópico 12 | Carregando, salvando, pendente, sincronizado, erro coerentes com rede/fila. |
| Toasts e confirmação | Tópico 13 | Fluxos críticos com toast/modal acessível. |
| Utilitários / shell | Tópicos 15–16 | `postCadastroRefreshToParent`; bloqueio/orientação quando falta auth para nuvem. |

**Critério de saída da Fase 2**

- Checklist QA: seções **9 e 10** com `[OK]`.
- Regressão rápida das seções **4 e 6** (garantir que mudanças de UX não mascaram falha de persistência).

---

## Fase 3 — Performance e hardening

**Objetivo:** carga inicial enxuta onde couber; observabilidade e processo de release documentados.

| Área | Cobertura no plano | O que validar |
|------|--------------------|---------------|
| Lazy load | Tópico 14 | PDF/OCR só após uso; erro de CDN tratado. |
| Telemetria | Tópico 17 | Eventos em `localStorage` / console conforme operação (sanidade). |
| Regressão manual | Tópico 18 | Checklist completo executado no alvo de deploy. |
| Aceite formal | Tópico 19 | Documento de aceite revisado para a versão que sobe. |

**Critério de saída da Fase 3**

- Checklist QA: seções **11 e 12** conforme aplicável; **seção 13 (Go/No-Go)** aprovada.
- Aceite **C-01 a C-06** confirmados na build que vai a produção.
- Desktop obrigatório; **celular** quando o uso operacional incluir iframe no dispositivo móvel.

---

## Sequência sugerida entre ambientes

1. **Desenvolvimento local / branch:** Fase 1 (e correções até passar).
2. **Homologação (ex.: GitHub Pages de teste ou build de preview):** Fases 1 + 2 + smoke da Fase 3.
3. **Produção:** Fase 3 completa + Go/No-Go da seção 13 do checklist.

Registrar na nota de release: data, commit/hash e quem assinou o Go/No-Go.

---

## Rollback

- Reverter para a última build que passou **Fase 1** no mínimo se houver perda de dados, sucesso falso ou wipe indevido.
- Manter backup de `localStorage` / exportação SOT antes de testes destrutivos em homologação.

---

*Tópico 20 — rollout em fases com validação (plano Cadastro de Saídas).*
