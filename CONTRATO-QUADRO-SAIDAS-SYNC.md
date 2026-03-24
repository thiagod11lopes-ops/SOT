# Contrato de sincronização — Quadro de Saídas e saídas administrativas (item 10)

## Objetivo

Garantir que **qualquer mutação** da lista **`saidasAdministrativas`** (Firestore + cache local) seja refletida no **Quadro de Saídas** (`QuadroDeSaidas.html`) e nas **outras abas do SOT**, sem depender apenas de o utilizador recarregar a página ou de o cache do Firebase expirar.

Sem estes sinais, pode haver **“buraco”**: o Firestore já está atualizado, mas o Quadro continua a mostrar dados antigos até ao próximo `get` com cache válido.

---

## Quem escuta (consumidor: `QuadroDeSaidas.html`)

Após um destes eventos, o Quadro **invalida** o cache relevante (`invalidateQuadroSaidasCaches` ou fallback em `saidasAdministrativas` + shard do dia) e chama **`loadSaidasForSelectedDate()`** (com debounce / fila se já houver recarga em curso; adia se o fluxo de edição KM estiver ativo).

| Canal | Detalhe |
|--------|---------|
| **`storage`** | `event.key === 'saidasAdministrativas'` — dispara **apenas noutros documentos** do mesmo origin (a aba que fez `setItem` **não** recebe o evento). |
| **`BroadcastChannel`** | Nome fixo: **`sot_saidas_administrativas`**. O Quadro regista `onmessage` e agenda recarga **para qualquer mensagem** (o payload típico é `{ type: 'saidas_updated', t: number }`). |
| **`window.postMessage`** | `event.data.type === 'refresh_all_data'` — útil quando o SOT corre em **iframe** dentro de `SOT5.html` (o pai ou outro frame pode reencaminhar ou o Quadro abre na mesma janela com `message`). |

**Nota:** Em **aba dedicada** ao Quadro (sem iframe), `postMessage` vindo só de `window.parent` **pode não chegar**. Para outra aba no mesmo browser, use **`BroadcastChannel`** e/ou **`localStorage`** conforme abaixo.

---

## Contrato para quem grava (produtores)

Depois de **`saidasAdministrativas`** estar persistida com sucesso no **Firestore** (e alinhada com o que pretende mostrar ao utilizador), o código que gravou **deve** propagar o estado pelos canais aplicáveis:

1. **`localStorage.setItem('saidasAdministrativas', JSON.stringify(lista))`**  
   - Atualiza o cache local e notifica **outras abas** via `storage`.  
   - Não notifica a **própria** aba.

2. **`BroadcastChannel('sot_saidas_administrativas').postMessage({ type: 'saidas_updated', t: Date.now() })`**  
   - Alcança **todas** as janelas/abas do **mesmo origin** que tenham o canal aberto (inclui Quadro standalone + `Saidasadministrativas6` + outras páginas que subscrevam).

3. **Se a página corre dentro do shell SOT (iframe):**  
   - `window.parent.postMessage({ type: 'refresh_all_data' }, '*')`  
   - Para o coordenador no topo atualizar outros iframes / lógica agregada.

4. **Opcional — sync imediato com Firebase no shell:**  
   - `window.top.postMessage({ type: 'request_sync', immediate: true | false }, '*')`  
   - Usado quando se quer que o `SOT5` trate sync sem esperar debounce (ex.: após KM / chegada).

**Ordem recomendada:** concluir escrita remota → `localStorage` → `BroadcastChannel` → `postMessage` para `parent`/`top` (conforme existam).

---

## Implementação de referência no repositório

| Local | Função / trecho | Papel |
|--------|------------------|--------|
| `Todas as abas/Saidasadministrativas6.html` | `notifySaidasAdministrativasChanged(immediateSync)` | Centraliza BC + `refresh_all_data` + `request_sync` após alterações às saídas administrativas. |
| `QuadroDeSaidas.html` | `propagateSaidasKmChegadaChangeFromQuadro(field)` | Após `firebaseSot.set('saidasAdministrativas', …)` com sucesso no Quadro, replica o mesmo padrão de aviso. |
| `QuadroDeSaidas.html` | `storage` / `BroadcastChannel` / `message` listeners | Consumidor descrito acima. |
| `Todas as abas/firebase-sot-firestore.mjs` | `watchSaidasAdmDayShard(dateIso, callback)` | Item 11: `onSnapshot` só no doc `saidasAdm_day_{YYYY-MM-DD}`. |
| `QuadroDeSaidas.html` | `resyncQuadroDayShardListener()` | Subscreve/desliga o listener quando mudam data ou sessão Google. |

Novos fluxos (import, API, outro HTML) que chamem apenas `dataService.setSaidasAdministrativas` / `firebaseSot.set` **sem** estes passos devem ser considerados **incompletos** para UX multi-aba.

---

## Tempo real sem depender só de eventos locais (item 11)

- **Decisão:** `onSnapshot` **apenas** no documento do dia (`sot_data/saidasAdm_day_{YYYY-MM-DD}`), **não** no mestre `saidasAdministrativas` (lista grande → mais custo e mais notificações irrelevantes para o filtro do dia).
- **Complementa** os canais do item 10: quando outro cliente grava no Firestore e o shard do dia é atualizado (sync após `set` do mestre), o Quadro pode atualizar **mesmo sem** `BroadcastChannel` / `storage` naquele momento.
- **Limite:** alterações que existam **só** no mestre e **ainda não** tenham shard correspondente atualizado continuam a depender do fallback `get` ao mestre, TTL ou dos canais locais.
- **Custo Firestore:** uma subscrição ativa por aba do Quadro com data selecionada; leituras adicionais quando o documento do dia muda (comportamento normal do listener).

---

## Lacunas e boas práticas

- **`Cadastrodesaidas8.html`** (e páginas semelhantes): hoje reforçam sobretudo `postMessage` para o pai (`postCadastroRefreshToParent`). Para utilizadores com **Quadro noutra aba** na mesma origem, o ideal é também emitir **`BroadcastChannel`** (mesmo nome e payload) após persistência bem-sucedida, além de manter o `localStorage` já existente.
- **`storage` sozinho** não cobre a aba que escreveu; **`BC`** cobre todas as contextos que escutam no origin.
- **`refresh_all_data`** é amplamente usado no SOT para vários dados; o Quadro **só** reage a este tipo para recarregar saídas (tratamento genérico no consumidor).

---

## Alterações futuras

Se no futuro existir `onSnapshot` também no mestre ou polling global, documentar aqui o critério (evitar leituras duplicadas e conflito com a cache em memória).

---

**Deploy / URLs:** ver `DEPLOY-QUADRO-SAIDAS.md` (item 15 — estrutura no GitHub Pages e paths relativos).

---

*Itens 10 e 11 do plano de melhorias do Quadro de Saídas — contrato entre abas e listener em tempo real no shard do dia.*
