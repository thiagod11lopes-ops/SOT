# Integração Firebase – SOT

## Abas que **já recebem e enviam** dados do Firebase

| Aba / Página | Dados | Observação |
|--------------|--------|------------|
| **Cadastro de Saídas** (Cadastrodesaidas8.html) | Viaturas, motoristas, saídas adm/amb | Firebase + data-service |
| **Saídas Administrativas** (Saidasadministrativas6.html) | Saídas administrativas, frota, motoristas | Firebase + data-service |
| **Configurações** (Configuracoes.html) | Configurações do sistema | Firebase + data-service |
| **Disponibilidade / Agendamento admin** (DisponibilidadeAdmin.html) | Viaturas, agendamentos | Firebase + data-service |
| **Agendamento** (Agendamento.html) | Agendamentos, saídas | Firebase + data-service |
| **Vistoria** (vistoriar.html) | Vistorias realizadas, motoristas vistoria | Firebase + data-service |
| **Frota e Pessoal** (Frotaepessoal3.html) | Viaturas, motoristas | Integrado nesta verificação – carrega e salva no Firebase |
| **Saídas de Ambulâncias** (Saidasdeambulâncias2.html) | Saídas ambulâncias, frota, motoristas | Integrado nesta verificação – carrega e salva no Firebase |
| **Estatística** (Estatistica4.html) | Saídas adm/amb, abastecimentos | Integrado nesta verificação – carrega do Firebase na abertura |
| **Avisos** (Avisos.html) | Avisos | Integrado nesta verificação – carrega e salva no Firebase |
| **Lembretes** (Lembretes.html) | Lembretes ativos | Integrado nesta verificação – carrega e salva no Firebase |
| **Abastecimento** (Abastecimento12.html) | Já usava data-service; agora com Firebase | Adicionados firebase-config e firebase-sot-service para persistência na nuvem |

---

## Partes que **ainda não** usam Firebase

| Aba / Página | Dados | Motivo |
|--------------|--------|--------|
| **RDV** (RDV.html) | Dados do RDV por data (ex.: `sot_rdv_data_YYYY-MM-DD`) | Estrutura por data; não há coleção “RDV” no data-service. Pode ser integrado depois com uma coleção única (ex.: `rdv`) ou por documento por data. |
| **Equipamentos e Suprimentos** (EquipamentoseSuprimentos.html) | Equipamentos, movimentações, ordem das abas | data-service não expõe get/set para essas chaves. Requer inclusão de métodos e, se desejar, coleções no Firebase. |
| **Escala** (Escala13.html, dentro de Frota e Pessoal) | Escala por mês (chaves `YYYY-MM`) | Hoje só em `localStorage`. Para sincronizar na nuvem seria preciso definir uma coleção (ex.: `escala`) e integrar leitura/gravação. |
| **Responsabilidades** (responsabilidades.html) | `motoristasVistoria` | Subaba de Frota e Pessoal; lê/grava em `localStorage`. A Vistoria já carrega `motoristasVistoria` do Firebase; para manter tudo consistente, esta tela pode passar a usar data-service/Firebase ao salvar. |
| **Viatura/Oficina** (vtr-oficina.html) | Registros de manutenção, viaturas, motoristas vistoria | Só `localStorage`. Integração futura exigiria novas chaves/coleções no Firebase. |

---

## Resumo das alterações feitas nesta verificação

1. **Frota e Pessoal** – Inclusão de Firebase + data-service; carregamento inicial de viaturas e motoristas do Firebase; gravação no Firebase ao salvar.
2. **Saídas de Ambulâncias** – Inclusão de Firebase + data-service; `loadAllData()` assíncrono buscando do Firebase; `saveData()` passou a chamar `dataService.setSaidasAmbulancias`.
3. **Estatística** – Inclusão de Firebase + data-service; no `DOMContentLoaded`, carregamento assíncrono de saídas adm/amb e abastecimentos do Firebase antes de montar gráficos/tabelas.
4. **Avisos** – Inclusão de Firebase + data-service; carregamento inicial dos avisos do Firebase; `syncAvisosToFirebase()` ao adicionar, excluir ou filtrar avisos.
5. **Lembretes** – Inclusão de Firebase + data-service; `loadLembretes()` assíncrono buscando `lembretes_ativos` do Firebase; `saveLembretes()` gravando no Firebase.
6. **Abastecimento** – Inclusão de `firebase-config.js` e `firebase-sot-service.js` para que o data-service (já usado na página) possa persistir abastecimentos no Firebase.

Com isso, as abas principais que dependem de frota, motoristas, saídas, vistorias, avisos, lembretes e abastecimentos passam a usar o Firebase quando ele estiver configurado; as exceções (RDV, Equipamentos, Escala, Responsabilidades, Viatura/Oficina) seguem apenas em `localStorage` até uma futura integração específica.
