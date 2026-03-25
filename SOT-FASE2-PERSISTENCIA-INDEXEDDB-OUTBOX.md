# SOT — Fase 2: persistência local durável (IndexedDB) e outbox

Complementa a [Fase 1 — modelo de dados](SOT-FASE1-MODELO-DADOS-SAIDA-ADMIN.md). A **autoridade remota** continua a ser Firestore (`sot_data/*` com `items` + `updatedAt` no documento).

## 1. Objectivos

1. **Espelho IndexedDB** das arrays `saidasAdministrativas` e `saidasAmbulancias` no fluxo do **Cadastro de Saídas**, para:
   - reduzir perda de dados quando `localStorage` enche ou falha (`QuotaExceededError`);
   - recuperar listas quando o cache em `localStorage` está vazio mas existe cópia recente no browser.
2. **Manter o outbox existente** (`sot_cadastro_saidas_outbox_v1` em `localStorage`) como fila de **reenvio da última tentativa falhada** para a nuvem — sem alterar a semântica da Fase 2 no código inicial (ver §4).

## 2. Schema IndexedDB

| Chave | Valor |
|--------|--------|
| Nome da base | `sot_saidas_local_v1` |
| Versão | `1` |
| Object store | `kv` com `keyPath: 'key'` |
| Registo de snapshot | `key === 'cadastro_saidas_snapshot_v1'` |

**Payload do snapshot (um registo):**

- `key` (string): constante acima  
- `savedAt` (string ISO 8601): momento da escrita  
- `saidasAdministrativas` (array)  
- `saidasAmbulancias` (array)  

Implementação: `Todas as abas/sot-saidas-indexeddb.js` expõe `window.sotSaidasIdb.putCadastroSnapshot` / `getCadastroSnapshot`.

## 3. Integração no Cadastro (`Cadastrodesaidas8.html`)

| Momento | Comportamento |
|---------|----------------|
| **Após persistência local bem-sucedida** (`persistCadastroSaidasSnapshot`) | Gravar o mesmo snapshot no IndexedDB (e também quando só a nuvem falha, desde que os arrays em memória sejam a verdade local). |
| **`localStorage.setItem` falha** | Marcar `localOk` como falso; **ainda assim** tentar IndexedDB para não perder o estado em memória. |
| **Carga inicial** (`loadDataAndPopulateTables`) | Se **ambas** as listas lidas de `localStorage` estão vazias, tentar `getCadastroSnapshot()` e usar arrays não vazias como **cache local** para o merge LWW com o remoto (igual ao papel do LS antes do merge). |
| **Após merge e `setItem` no fim do load** | Espelhar o resultado normalizado no IndexedDB. |

**Não** se assume que IndexedDB é fonte única: primeiro continua a ler `localStorage`; o IDB só entra como recuperação e cópia durável.

## 4. Outbox (estado actual e evolução)

- **Hoje:** `enqueueCadastroOutbox` grava JSON completo em `localStorage`. Se a quota falhar, a fila pode não ser persistida.
- **Evolução opcional (Fase 2+):** duplicar o payload do outbox numa chave `cadastro_outbox_v1` no mesmo object store `kv`, com os mesmos campos que o JSON do LS (`type`, `queuedAt`, `reason`, arrays). `getCadastroOutbox` tentaria LS e, em falha, IDB.

## 5. Limitações conhecidas

- Limpeza **apenas** de `localStorage` (sem apagar IndexedDB) pode deixar um snapshot IDB mais antigo que “parece” recuperável quando o utilizador apagou dados de propósito; é cenário raro face a “limpar dados do site”.
- Outras abas (ex. **Saídas Administrativas 6**) continuam a usar principalmente `localStorage`; alinhar numa fase posterior se for necessário um único backend local partilhado.

## 6. Referências no repositório

- `Todas as abas/sot-saidas-indexeddb.js`  
- `Todas as abas/Cadastrodesaidas8.html` — `persistCadastroSaidasSnapshot`, `loadDataAndPopulateTables`, `CADASTRO_OUTBOX_KEY`, `flushCadastroOutbox`
