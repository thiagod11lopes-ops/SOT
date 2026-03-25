/**
 * sot-firestore-sync-module.js
 *
 * Módulo ES6 para Firebase Firestore (SDK modular v10+):
 * - Persistência IndexedDB (offline + sobrevive a fechar o navegador, conforme limites do browser)
 * - Leitura via onSnapshot como fonte única de verdade (cache ↔ servidor transparente)
 * - UI de sincronização via metadata (pendente local vs confirmado no servidor)
 * - Escrita resiliente com fila + retentativas (complementa a fila interna do SDK)
 *
 * Integração com o SOT atual:
 * - O projeto usa ainda `firebase-config.js` + compat (`firebase.firestore()`).
 * - Carregue ESTE ficheiro como <script type="module"> e passe o MESMO firebaseConfig.
 * - Migração completa: substituir gradualmente `get/set` agregados por documentos/coleções
 *   com updateDoc em campos específicos (evita sobrescrever o objeto inteiro).
 *
 * Estratégia de colisões (LWW vs merge):
 *
 * 1) Campos independentes (ex.: kmChegada, observacoes):
 *    - Preferir updateDoc({ campo: valor }) + serverTimestamp() num campo `updatedAt`.
 *    - Conflito entre dois clientes: Last Write Wins ao nível do campo se usar transação
 *      que lê `updatedAt` e só aplica se a versão local ainda for a mesma (optimistic locking).
 *
 * 2) Documento inteiro legado (arrays enormes no `sot_data`):
 *    - Alto risco de clobber. Mitigar com: versionamento (`__version` + transaction), ou
 *      split em subcoleções / documentos por entidade, ou merge profundo com carácter
 *      (complexo). "Zero data loss" estrito em edição concorrente no mesmo documento
 *      exige CRDT/OT ou modelo de dados mais fino — LWW é o compromisso pragmático.
 *
 * Porque isto ajuda:
 * - O SDK mantém fila de escritas pendentes no IndexedDB; onSnapshot reflecte logo mudanças
 *   locais (UX) e depois reconcilia com o servidor.
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  waitForPendingWrites,
  terminate,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/** @typedef {'pending_local' | 'local_cache' | 'server' | 'unknown'} SotSyncUiStatus */

/**
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').SnapshotMetadata} metadata
 * @returns {{ status: SotSyncUiStatus, label: string, hasPendingWrites: boolean, fromCache: boolean }}
 */
export function interpretSyncMetadata(metadata) {
  const hasPendingWrites = metadata.hasPendingWrites;
  const fromCache = metadata.fromCache;

  if (hasPendingWrites) {
    return {
      status: 'pending_local',
      label: 'Alterações por enviar ao servidor…',
      hasPendingWrites,
      fromCache,
    };
  }
  if (fromCache) {
    return {
      status: 'local_cache',
      label: 'Dados do cache local (aguardando confirmação da rede)',
      hasPendingWrites,
      fromCache,
    };
  }
  return {
    status: 'server',
    label: 'Sincronizado com o servidor',
    hasPendingWrites,
    fromCache,
  };
}

/**
 * Activa persistência. Tenta multi-tab primeiro (várias abas do SOT).
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').Firestore} db
 */
export async function enableFirestorePersistence(db) {
  try {
    await enableMultiTabIndexedDbPersistence(db);
    return { mode: 'multiTab', ok: true };
  } catch (e) {
    const code = e && e.code;
    if (code === 'failed-precondition') {
      try {
        await enableIndexedDbPersistence(db);
        return { mode: 'singleTab', ok: true };
      } catch (e2) {
        return { mode: 'none', ok: false, error: e2 };
      }
    }
    if (code === 'unimplemented') {
      return { mode: 'none', ok: false, error: e };
    }
    return { mode: 'none', ok: false, error: e };
  }
}

/**
 * Inicializa ou reutiliza app + Firestore modular (separado do `firebase` compat global).
 * @param {object} firebaseConfig mesmo objeto que em firebase-config.js
 * @param {{ appName?: string }} [opts]
 */
export function initModularFirestore(firebaseConfig, opts) {
  const appName = (opts && opts.appName) || 'sot-modular';
  let app;
  try {
    app = getApp(appName);
  } catch {
    app = initializeApp(firebaseConfig, appName);
  }
  const db = getFirestore(app);
  return { app, db };
}

/**
 * Subscrição única: dados + estado de sync para UI.
 *
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').Firestore} db
 * @param {string} collectionPath ex: "viaturas"
 * @param {string} docId
 * @param {{
 *   onData?: (data: object|null, snap: import('firebase/firestore').DocumentSnapshot, syncUi: ReturnType<typeof interpretSyncMetadata>) => void,
 *   onError?: (err: Error) => void
 * }} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribeDocumentWithSyncUi(db, collectionPath, docId, handlers) {
  const ref = doc(db, collectionPath, docId);
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snapshot) => {
      const syncUi = interpretSyncMetadata(snapshot.metadata);
      if (!snapshot.exists()) {
        handlers.onData && handlers.onData(null, snapshot, syncUi);
        return;
      }
      handlers.onData && handlers.onData(snapshot.data(), snapshot, syncUi);
    },
    (err) => handlers.onError && handlers.onError(err)
  );
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Firestore rejeita campos com valor `undefined`. */
function omitUndefined(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  Object.keys(obj).forEach(function (k) {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

function isRetryableFirestoreError(err) {
  if (!err || !err.code) return true;
  const nonRetry = ['permission-denied', 'not-found', 'invalid-argument', 'failed-precondition'];
  return !nonRetry.includes(err.code);
}

/**
 * Fila simples para escritas críticas (além da fila nativa do SDK).
 * Serializa operações para evitar corridas no mesmo documento.
 */
export class CriticalWriteQueue {
  constructor(options) {
    this.maxRetries = (options && options.maxRetries) ?? 5;
    this.baseDelayMs = (options && options.baseDelayMs) ?? 800;
    this._chain = Promise.resolve();
  }

  /**
   * @param {() => Promise<void>} fn
   * @returns {Promise<void>}
   */
  enqueue(fn) {
    const run = async () => {
      let lastErr;
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          await fn();
          return;
        } catch (e) {
          lastErr = e;
          if (!isRetryableFirestoreError(e)) throw e;
          const backoff = this.baseDelayMs * Math.pow(2, attempt);
          await delay(Math.min(backoff, 30000));
        }
      }
      throw lastErr || new Error('CriticalWriteQueue: falha após retentativas');
    };
    this._chain = this._chain.then(run, run);
    return this._chain;
  }
}

const defaultSaidaQueue = new CriticalWriteQueue({ maxRetries: 6, baseDelayMs: 600 });

/**
 * Exemplo: atualizar apenas campos alterados de uma saída / viatura (evita sobrescrever o documento inteiro).
 * Usa serverTimestamp() para ordenação LWW no servidor.
 *
 * Campos sugeridos no documento (exemplo):
 *   status, ultimaSaidaId, kmAtual, observacoes, updatedAt, updatedBy
 *
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').Firestore} db
 * @param {string} collectionPath ex: "viaturas" ou "saidas_viatura"
 * @param {string} docId
 * @param {Record<string, unknown>} partial apenas chaves que mudaram
 * @param {{ queue?: CriticalWriteQueue, updatedBy?: string }} [options]
 */
export async function updateSaidaViaturaResilient(db, collectionPath, docId, partial, options) {
  const queue = (options && options.queue) || defaultSaidaQueue;
  const updatedBy = options && options.updatedBy;

  const payload = omitUndefined(
    Object.assign({}, partial, {
      updatedAt: serverTimestamp(),
      ...(updatedBy ? { updatedBy } : {}),
    })
  );

  const ref = doc(db, collectionPath, docId);
  await queue.enqueue(() => updateDoc(ref, payload));
}

/**
 * Opcional: antes de fechar a aba / navegar, esperar flush das escritas pendentes do SDK.
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').Firestore} db
 */
export async function flushPendingSdkWrites(db) {
  await waitForPendingWrites(db);
}

/**
 * Libertar recursos (pouco usado em SPAs que ficam sempre abertos).
 * @param {import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js').Firestore} db
 */
export async function shutdownModularFirestore(db) {
  await terminate(db);
}

/**
 * Bootstrap completo: init + persistência + retorno de helpers.
 * @param {object} firebaseConfig
 */
export async function bootstrapSotFirestoreModular(firebaseConfig) {
  const { app, db } = initModularFirestore(firebaseConfig);
  const persistence = await enableFirestorePersistence(db);
  return {
    app,
    db,
    persistence,
    subscribeDocumentWithSyncUi: (path, id, h) => subscribeDocumentWithSyncUi(db, path, id, h),
    updateSaidaViaturaResilient: (path, id, partial, opt) =>
      updateSaidaViaturaResilient(db, path, id, partial, opt),
    flushPendingSdkWrites: () => flushPendingSdkWrites(db),
  };
}

/*
  EXEMPLO (numa página com <script type="module">):

  import { bootstrapSotFirestoreModular } from './sot-firestore-sync-module.js';

  const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...', ... };

  const sot = await bootstrapSotFirestoreModular(firebaseConfig);
  console.log('Persistência:', sot.persistence);

  const unsub = sot.subscribeDocumentWithSyncUi('viaturas', 'ABC1D23', {
    onData(data, snap, syncUi) {
      document.getElementById('syncPill').textContent = syncUi.label;
      document.getElementById('syncPill').dataset.status = syncUi.status;
      if (data) renderForm(data);
    },
    onError(err) { console.error(err); }
  });

  await sot.updateSaidaViaturaResilient('viaturas', 'ABC1D23', {
    status: 'em_servico',
    ultimaSaida: 'saida_123',
  }, { updatedBy: 'user@dominio.com' });

  // Antes de sair da página (opcional):
  // await sot.flushPendingSdkWrites();
*/
