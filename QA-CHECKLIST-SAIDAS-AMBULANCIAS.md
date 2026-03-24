# QA Checklist - Saídas de Ambulâncias

Checklist dedicado para validação da aba `Saidasdeambulâncias2.html` antes de publicar.

## Regras de uso

- Marcar cada item com:
  - `[OK]` passou
  - `[FALHA]` falhou
  - `[N/A]` não aplicável
- Testar em:
  - Desktop (Chrome/Edge)
  - Celular real (Android/iOS)
- Executar em:
  - sessão normal
  - sessão limpa/anônima

---

## 1) Acesso e carregamento inicial

- [ ] A aba abre sem tela em branco.
- [ ] Data do dia é carregada automaticamente.
- [ ] Tabela renderiza sem travar.
- [ ] Indicador de sync aparece e transita para `sincronizado`.

Critério: carregamento funcional sem erro fatal.

---

## 2) Autenticação e autorização

- [ ] Com login Google ativo, edição sensível de motorista funciona.
- [ ] Sem login Google, edição sensível é bloqueada com mensagem.
- [ ] Login tardio (após abrir aba) força recarga correta dos dados.

Critério: permissão de edição sensível vinculada à sessão autenticada.

---

## 3) Integridade de validação de campos críticos

- [ ] Bloqueia `KM` inválido (texto/letras).
- [ ] Bloqueia `KM Chegada` sem `KM Saída`.
- [ ] Bloqueia `KM Chegada <= KM Saída`.
- [ ] Bloqueia hora inválida fora de `HH:MM`.
- [ ] Bloqueia `chegada` sem `KM Saída`.

Critério: valores inválidos não são persistidos.

---

## 4) Persistência e feedback real

- [ ] Editar `KM Saída` salva e reflete no refresh.
- [ ] Editar `KM Chegada` salva e reflete no refresh.
- [ ] Editar `chegada` salva e reflete no refresh.
- [ ] Salvar observação persiste e reaparece após recarga.
- [ ] Excluir registro remove da lista após recarga.

Critério: UI só confirma mudança após persistência efetiva.

---

## 5) Proteção anti-duplo clique

- [ ] Clique rápido duplo em `Excluir` não duplica operação.
- [ ] Clique rápido duplo em `Salvar observação` não duplica gravação.
- [ ] Clique rápido duplo em limpeza de KM não gera estado inconsistente.

Critério: ações críticas são idempotentes sob cliques repetidos.

---

## 6) Outbox offline-first

- [ ] Com internet desligada, edição local continua possível.
- [ ] Estado visual muda para `offline`/`pendente`.
- [ ] Ao voltar internet, pendências são sincronizadas automaticamente.
- [ ] Após reconexão, estado volta para `sincronizado`.

Critério: sem perda de dados na transição offline -> online.

---

## 7) Anti-wipe (proteção de coleção)

- [ ] Tentativa de salvar lista vazia acidental é bloqueada.
- [ ] Exclusão total exige confirmação forte (`APAGAR TUDO`).
- [ ] Sem confirmação forte, exclusão total é cancelada.

Critério: não ocorre limpeza destrutiva acidental do Firebase.

---

## 8) Conflito entre clientes (latest wins)

- [ ] Em edição concorrente, versão mais recente por `updatedAt` prevalece.
- [ ] Ao detectar conflito, usuário recebe aviso visual.
- [ ] Após conflito, tabela mostra o estado final coerente.

Critério: política de conflito explícita e previsível.

---

## 9) Sincronização multi-aba/eventos

- [ ] Alteração em outra aba dispara recarga sem tempestade de refresh.
- [ ] `storage` / `BroadcastChannel` / `message` não causam loop.
- [ ] Uso de foco/visibility mantém dados atualizados sem travar.

Critério: recarga coordenada, sem cascata excessiva.

---

## 10) UX de mensagens e status

- [ ] Mensagens aparecem no componente de notificação (`amb-notice`).
- [ ] Mensagens de erro orientam ação do usuário.
- [ ] Status de sync (`carregando`, `salvando`, `offline`, `sincronizado`, `erro`) funciona.

Critério: feedback claro e não bloqueante.

---

## 11) Responsividade operacional

- [ ] Botões principais permanecem acionáveis no celular.
- [ ] Filtro de data é utilizável em tela pequena.
- [ ] Tabela mantém legibilidade com rolagem horizontal.
- [ ] Modais abrem/fecham corretamente em telas pequenas.

Critério: usabilidade aceitável em operação móvel.

---

## 12) Go / No-Go da aba Ambulâncias

Publicar apenas se:

- Todos os itens críticos (2, 3, 4, 6, 7, 8) estiverem `[OK]`.
- Nenhuma `[FALHA]` de severidade alta permanecer aberta.
- Houver teste validado em desktop e celular.

Se houver falha crítica: bloquear deploy e corrigir antes de publicar.
