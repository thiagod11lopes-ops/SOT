# QA Checklist SOT (Pré-Deploy)

Checklist funcional e de resiliência para validar o SOT antes de publicar.

## Como usar

- Ambiente recomendado:
  - Desktop (Chrome/Edge)
  - Celular real (Android/iOS) com `QuadroDeSaidas.html`
- Sempre testar em:
  - sessão limpa (aba anônima) e sessão normal
  - rede normal e rede instável (simulação offline/online)
- Marque cada item como:
  - `[OK]` passou
  - `[FALHA]` falhou
  - `[N/A]` não aplicável

---

## 1) Smoke Test (2-5 min)

- [ ] Abrir `index.html` (raiz) e confirmar redirecionamento para `Todas as abas/index.html`.
- [ ] Confirmar carregamento do `SOT5` dentro do iframe sem erros visuais.
- [ ] Fazer login Google e validar exibição de usuário logado.
- [ ] Abrir `QuadroDeSaidas.html` e confirmar que carrega sem erro fatal.

Critério de aprovação: sem tela em branco, sem travamento, sem erro de autenticação bloqueando uso.

---

## 2) Autenticação e sessão (Google)

- [ ] Entrar com Google no `Todas as abas/index.html`.
- [ ] Recarregar página e confirmar manutenção de sessão.
- [ ] Abrir `QuadroDeSaidas.html` no mesmo navegador e confirmar sessão refletida.
- [ ] Testar sair (`logout`) e confirmar atualização de estado nas telas.
- [ ] Repetir no celular.

Critério de aprovação: sessão consistente entre telas, login/logout refletidos corretamente.

---

## 3) Carregamento de dados (fonte Firebase)

- [ ] `Saídas Administrativas`: lista carrega para data atual.
- [ ] `Saídas Ambulâncias`: lista carrega.
- [ ] `Frota e Pessoal`: viaturas, motoristas e KM atual carregam com dados.
- [ ] `Cadastro de Saídas`: selects de viatura/motorista carregam sem itens vazios/`undefined`.
- [ ] `QuadroDeSaidas`: agenda do dia aparece após login.

Critério de aprovação: dados coerentes entre telas e sem listas vazias indevidas.

---

## 4) Fluxos críticos de edição/salvamento

- [ ] Editar KM Saída e KM Chegada em `Saídas Administrativas` e confirmar persistência.
- [ ] Preencher `Chegada` e confirmar atualização visual e sincronização.
- [ ] Criar nova saída e validar presença no quadro e no cadastro.
- [ ] Editar uma saída existente e validar atualização em todas as telas.
- [ ] Excluir uma saída individual e validar remoção consistente.

Critério de aprovação: operação persiste e replica sem duplicação.

---

## 5) Proteções de integridade (anti-wipe / validação)

- [ ] Tentar inserir KM inválido (texto não numérico) e validar bloqueio.
- [ ] Tentar inserir hora inválida e validar bloqueio.
- [ ] Confirmar que campos não aceitam `undefined`/`null` como texto útil.
- [ ] Em exclusão total de `Saídas Administrativas`, validar confirmação forte (`APAGAR TUDO`).
- [ ] Confirmar que não há limpeza acidental de lista remota não vazia.

Critério de aprovação: valores inválidos não persistem; wipe acidental bloqueado.

---

## 6) Offline-first e recuperação

- [ ] Com app aberto, desligar internet e editar KM/chegada.
- [ ] Confirmar estado `offline` na UI e manutenção dos dados localmente.
- [ ] Reativar internet.
- [ ] Confirmar flush da fila (outbox) e estado `sincronizado`.
- [ ] Confirmar que mudanças offline chegam ao Firebase ao reconectar.

Critério de aprovação: sem perda de dados ao transitar offline -> online.

---

## 7) Multi-aba e sincronização em cascata

- [ ] Abrir duas abas do SOT.
- [ ] Alterar dado na Aba A e confirmar atualização na Aba B.
- [ ] Confirmar que não há loop de reload nem travamento (CPU alta).
- [ ] Validar atualização via `BroadcastChannel`/`storage` sem inconsistência.

Critério de aprovação: sincronização rápida e estável entre abas.

---

## 8) Mobile (Quadro de Saídas)

- [ ] Login Google funciona no celular.
- [ ] Carregamento da agenda do dia funciona após login.
- [ ] Edição permitida segue regras (bloqueio quando registro finalizado).
- [ ] Após alteração no SOT principal, quadro reflete atualização.
- [ ] Rotação de tela não quebra layout nem estado.

Critério de aprovação: quadro funcional no celular sem defasagem de dados.

---

## 9) Configurações, backup e restore

- [ ] `Salvar e fazer download` gera JSON.
- [ ] JSON contém coleções críticas (saídas, viaturas, motoristas, escala, vistoria, etc.).
- [ ] `Carregar Dados` importa JSON local.
- [ ] Após carregar, validar opção de envio para Firebase.
- [ ] Confirmar dados restaurados em telas principais e no quadro.

Critério de aprovação: backup/restore completo e consistente.

---

## 10) Regras Firebase e permissões

- [ ] Usuário não autenticado não consegue leitura/escrita sensível.
- [ ] Usuário autenticado consegue fluxo normal.
- [ ] Escrita de envelope inválido é negada.
- [ ] Delete destrutivo direto em `sot_data` é negado por regra.

Critério de aprovação: segurança compatível com regras publicadas.

---

## 11) Performance e estabilidade

- [ ] Navegar entre abas por 5-10 minutos sem crescimento anormal de uso.
- [ ] Confirmar que, com aba oculta, timers/listeners reduzem atividade.
- [ ] Em retorno à aba visível, dados recarregam corretamente.
- [ ] Sem travamentos ao editar rapidamente múltiplas linhas.

Critério de aprovação: experiência fluida e estável.

---

## 12) Critério final de Go/No-Go

Publicar apenas se:

- Todos os itens críticos (sessão, carregamento, salvar, offline, anti-wipe) estiverem `[OK]`.
- Nenhuma `[FALHA]` de severidade alta permanecer aberta.
- Houver evidência de teste em desktop e celular.

Se houver falha alta: bloquear deploy, corrigir e reexecutar checklist.
