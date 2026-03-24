# QA Checklist - Cadastro de Saídas

Checklist dedicado para validação da aba **Cadastro de Saídas** (`Todas as abas/Cadastrodesaidas8.html`) antes de publicar. Cobre cenários online, offline, reconexão, conflito multiaba, login tardio, lote, edição e exclusão.

**Critérios de aceite objetivos (tópico 19):** [`ACEITE-CADASTRO-SAIDAS.md`](./ACEITE-CADASTRO-SAIDAS.md) — regras mensuráveis (ex.: sem sucesso falso, sem duplicação por duplo clique, status rastreável em todas as mutações via pipeline).

**Rollout em fases (tópico 20):** [`ROLLOUT-CADASTRO-SAIDAS.md`](./ROLLOUT-CADASTRO-SAIDAS.md) — ordem de validação (confiabilidade → UX → performance/hardening) antes de produção.

## Regras de uso

- Marcar cada item com:
  - `[OK]` passou
  - `[FALHA]` falhou
  - `[N/A]` não aplicável
- Testar em:
  - Desktop (Chrome/Edge)
  - Celular real (Android/iOS), preferencialmente dentro do `SOT5` (iframe)
- Executar em:
  - sessão normal (com login Google)
  - sessão limpa/anônima (sem login, quando aplicável ao caso)

---

## 1) Acesso e carregamento inicial

- [ ] A aba abre sem tela em branco (incluindo dentro do iframe do `SOT5`).
- [ ] Sub-abas **Cadastrar Nova Saída**, **Saídas Cadastradas**, **Cadastrar Itens**, **Saídas não Programadas** alternam sem erro.
- [ ] Ao abrir **Saídas Cadastradas** ou **Cadastrar Nova Saída**, dados e filtros carregam (tabela/listas populam).
- [ ] Pill de sincronização aparece e transita de **Carregando** para estado coerente (**Sincronizado**, **Pendente** ou **Offline**).

Critério: carregamento funcional sem erro fatal; indicador de sync consistente com rede e fila.

---

## 2) Autenticação e escrita remota (login tardio)

- [ ] Com **Google logado**, cadastrar/editar/excluir reflete na nuvem após refresh em outra sessão ou aba (quando as regras do Firebase permitem).
- [ ] **Sem login**, ao tentar sincronizar: mensagem orienta login (não apenas “sucesso” genérico); dados permanecem no cache local quando aplicável.
- [ ] **Login tardio** (abrir Cadastro antes de autenticar, depois entrar com Google): nova tentativa de gravação sincroniza ou enfileira corretamente; pill/outbox atualizam.

Critério: escrita remota condicionada à sessão; recuperação após login sem estado enganoso.

---

## 3) Validação transacional do formulário (Cadastrar Nova Saída)

- [ ] Campos obrigatórios (incl. viatura e motorista) bloqueiam submit com feedback claro.
- [ ] **Data/hora** inválidas ou incoerentes são bloqueadas (ex.: saída antes do pedido quando a regra se aplica).
- [ ] **KM** inválido bloqueado; com **KM Chegada** preenchido, **KM Saída** exigido; **KM Chegada <= KM Saída** bloqueado.
- [ ] Literais inválidos (`undefined`, `null` como texto, etc.) não passam na normalização final.

Critério: nenhum registro inconsistente persiste após validação.

---

## 4) Persistência e feedback real (sem “sucesso falso”)

- [ ] **Cadastrar** (uma saída): mensagem condiz com resultado real (`sincronizado`, `pendente de sync` ou falha).
- [ ] **Cadastrar múltiplas saídas**: mesmo registro não duplica por feedback antecipado; falha remota não aparece como sucesso total.
- [ ] **Cadastro em série** (várias datas): contagem de OK / pendente / falha é honesta; amostra de datas com falha quando houver.
- [ ] **Edição** de linha existente: alteração aparece na tabela e sobrevive a recarga (local + nuvem conforme cenário).
- [ ] **Importação CSV**: resumo alinhado ao status de persistência (sucesso / pendente / falha).
- [ ] **Excluir linha** e **excluir tudo** (com confirmação): efeito visível e consistente após recarga.

Critério: UI não declara sucesso completo quando parte da operação falhou ou ficou só local.

---

## 5) Proteção anti-duplo clique e reentrância

- [ ] Clique duplo rápido em **Cadastrar** não cria duplicatas óbvias nem estados inconsistentes.
- [ ] Idem em **Cadastrar múltiplas saídas**, **Cadastro em série**, **importar CSV**, **excluir linha**, **excluir tudo**.

Critério: locks impedem reentrância visível nas ações críticas.

---

## 6) Outbox offline-first e reconexão

- [ ] Com **internet desligada**, salvar ainda grava localmente e pill/outbox indicam **Pendente** / **Offline** conforme implementação.
- [ ] Ao **voltar online** (e com sessão válida), fila tenta flush; pill volta a estado coerente.
- [ ] Após reconexão, dados pendentes aparecem no Firebase ou o usuário vê motivo claro de nova tentativa.

Critério: sem perda silenciosa na transição offline → online.

---

## 7) Anti-wipe e exclusões destrutivas

- [ ] **Excluir tudo** exige confirmação forte (texto explícito); cancelar não apaga dados.
- [ ] Não há caminho óbvio de “lista vazia” acidental substituindo nuvem sem validação.

Critério: operações destrutivas exigem intenção explícita.

---

## 8) Conflito multi-cliente (latest-wins / merge na carga)

- [ ] Simular alteração da mesma saída em outro cliente (ou cache local antigo vs nuvem nova): política **latest-wins** prevalece de forma previsível.
- [ ] Quando houver resolução de conflito, usuário vê **aviso** (ex.: toast/message `warning`) com resumo.
- [ ] Tabela final reflete o merge (sem mistura incoerente de campos).

Critério: conflito tratado de forma explícita e auditável (UI +, se usar, log local de conflito).

---

## 9) Sincronização multi-aba e shell (iframe)

- [ ] Após mutação relevante, outras abas do SOT recebem sinal de refresh (`postMessage` / padrão existente) sem loop infinito.
- [ ] Foco/visibilidade da janela não dispara tempestade de recargas.

Critério: atualização coordenada entre abas, sem cascata excessiva.

---

## 10) UX: toasts, confirmações e pill de sync

- [ ] **Toasts** (`showCadastroToast`) para sucesso/erro/aviso sem `alert` nativo nos fluxos principais.
- [ ] **Confirmações** destrutivas usam modal acessível (`showCadastroConfirm`), não `confirm` nativo.
- [ ] Pill reflete **Salvando**, erro temporário após falha de save e retorno ao estado derivado (fila/rede).

Critério: feedback não bloqueante, coerente e acessível.

---

## 11) Performance sob demanda (PDF / OCR)

- [ ] **Baixar PDF** (onde existir na aba): primeira vez carrega libs sob demanda; falha de rede mostra erro amigável.
- [ ] **OCR / documento** (se usado): Tesseract carrega sob demanda; erro não trava a página inteira.

Critério: primeira abertura da aba não depende de download pesado até uso da funcionalidade.

---

## 12) Telemetria (sanidade opcional)

- [ ] Após operações de save/load/outbox, verificar no DevTools → Application → Local Storage a chave de telemetria (ex.: `sot_cadastro_saidas_telemetry_v1`) recebendo novos eventos.
- [ ] Console opcional: prefixo `[SOT_TELEMETRY_CADASTRO]` em eventos esperados.

Critério: diagnóstico local disponível para suporte em produção (não obrigatório para Go/No-Go do usuário final).

---

## 13) Go / No-Go - Cadastro de Saídas

Publicar apenas se:

- Os critérios **C-01 a C-06** de [`ACEITE-CADASTRO-SAIDAS.md`](./ACEITE-CADASTRO-SAIDAS.md) estiverem atendidos (sucesso falso, duplo clique, pipeline, outbox, conflito).
- Todos os itens das seções **2, 3, 4, 6, 7 e 8** deste checklist estiverem `[OK]`.
- Nenhuma `[FALHA]` de severidade alta permanecer aberta nos fluxos de gravação e conflito.
- Houver validação em **desktop** e, quando o uso for operacional em campo, em **celular** dentro do iframe.

Se houver falha crítica: bloquear deploy e corrigir antes de publicar.
