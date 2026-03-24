/**
 * Firestore modular (v10) para sot_data no iframe SOT5.
 * Compartilha persistência de Auth com firebase-auth.js no parent (mesmo origin),
 * para que request.auth nas regras do Firestore funcione.
 *
 * Mantenha firebaseConfig alinhado com firebase-config.js e firebase-auth.js.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJkB0sDzoz8kuchiM-A9lycQk011H6Pmw",
  authDomain: "sot-c77cb.firebaseapp.com",
  projectId: "sot-c77cb",
  storageBucket: "sot-c77cb.firebasestorage.app",
  messagingSenderId: "608364494039",
  appId: "1:608364494039:web:018231f1db30be94c7c492"
};

const COL = "sot_data";
const COL_AGENDAMENTO_USERS = "sot_agendamento_usuarios";
/** Alinhado a QuadroDeSaidas.html / ESTRATEGIA-QUADRO-CONSULTA-DIA.md (item 2–3) */
const SAIDAS_ADM_DAY_SHARD_PREFIX = "saidasAdm_day_";
/** Limite de documentos-dia por gravação do mestre (evita batches gigantes). */
const SAIDAS_ADM_DAY_SHARD_MAX_DATES = 220;
/** Item 5 Quadro: TTL base; chaves de saídas admin usam valores específicos abaixo. */
const CACHE_TTL_MS_DEFAULT = 60 * 1000;
/** Lista mestre grande — TTL mais curto reduz risco de filtro do dia desatualizado no fallback. */
const CACHE_TTL_MS_SAIDAS_ADM_MASTER = 45 * 1000;
/** Shards por dia (payload menor) — TTL maior evita reads repetidas ao alternar datas no Quadro. */
const CACHE_TTL_MS_SAIDAS_ADM_DAY_SHARD = 2 * 60 * 1000;
const LOG_PREFIX = "[firebase-sot-modular]";
/** Item 13 Quadro: nunca despejar payloads grandes na consola. */
const LOG_DETAIL_MAX_LEN = 320;

const cache = new Map();
const inFlightGets = new Map();
const inFlightSets = new Map();

let db = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();

function formatLogDetail(detail) {
  if (detail == null) return "";
  var t = typeof detail;
  if (t === "string") {
    return detail.length > LOG_DETAIL_MAX_LEN ? detail.slice(0, LOG_DETAIL_MAX_LEN) + "…" : detail;
  }
  if (t === "number" || t === "boolean") return String(detail);
  if (detail instanceof Error) {
    var em = detail.message || String(detail);
    return em.length > LOG_DETAIL_MAX_LEN ? em.slice(0, LOG_DETAIL_MAX_LEN) + "…" : em;
  }
  if (t === "object") {
    var code = detail.code != null ? String(detail.code) : "";
    var msg = detail.message != null ? String(detail.message) : "";
    if (code || msg) {
      var pair = (code ? code : "") + (code && msg ? " " : "") + (msg || "");
      return pair.length > LOG_DETAIL_MAX_LEN ? pair.slice(0, LOG_DETAIL_MAX_LEN) + "…" : pair;
    }
    try {
      var j = JSON.stringify(detail);
      if (j.length > LOG_DETAIL_MAX_LEN) return j.slice(0, LOG_DETAIL_MAX_LEN) + "…";
      return j;
    } catch (e) {
      return "[Object]";
    }
  }
  var s = String(detail);
  return s.length > LOG_DETAIL_MAX_LEN ? s.slice(0, LOG_DETAIL_MAX_LEN) + "…" : s;
}

function log(level, message, detail) {
  try {
    var extra = formatLogDetail(detail);
    var msg = extra ? message + " " + extra : message;
    if (level === "warn") console.warn(LOG_PREFIX, msg);
    else if (level === "error") console.error(LOG_PREFIX, msg);
    else console.debug(LOG_PREFIX, msg);
  } catch (e) {}
}

function invalidateCache(key) {
  try {
    cache.delete(String(key));
  } catch (e) {}
}

function cacheTtlMsForKey(keyStr) {
  var k = String(keyStr || "");
  if (k === "saidasAdministrativas") return CACHE_TTL_MS_SAIDAS_ADM_MASTER;
  if (k.indexOf(SAIDAS_ADM_DAY_SHARD_PREFIX) === 0) return CACHE_TTL_MS_SAIDAS_ADM_DAY_SHARD;
  return CACHE_TTL_MS_DEFAULT;
}

function getCached(key) {
  try {
    const entry = cache.get(String(key));
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(String(key));
      return null;
    }
    return entry.value;
  } catch (e) {
    return null;
  }
}

function setCache(key, value) {
  try {
    var keyStr = String(key);
    cache.set(keyStr, {
      value,
      expiresAt: Date.now() + cacheTtlMsForKey(keyStr)
    });
  } catch (e) {}
}

function authGateOk() {
  try {
    return !!(auth && auth.currentUser);
  } catch (e) {
    return false;
  }
}

/**
 * SDK modular: em várias versões `exists` é método `exists()`; em outras é boolean.
 * Usar só `snap.exists` como boolean quebra leituras (sempre "documento inexistente").
 */
function snapshotExists(snap) {
  if (!snap) return false;
  try {
    if (typeof snap.exists === "function") {
      return snap.exists();
    }
  } catch (e) {}
  if (typeof snap.exists === "boolean") {
    return snap.exists;
  }
  try {
    const d = snap.data();
    return d !== undefined;
  } catch (e2) {
    return false;
  }
}

/** Mesma regra que `get` usa para `snap.data()` → valor JS (array, objeto, etc.). */
function valueFromFirestoreDocData(data) {
  if (!data || typeof data !== "object") return null;
  if (data._sotJsonV1 === true && typeof data.body === "string") {
    try {
      return JSON.parse(data.body);
    } catch (parseErr) {
      log("error", "valueFromFirestoreDocData JSON parse", parseErr && parseErr.message);
      return null;
    }
  }
  if (Array.isArray(data.items)) return data.items;
  if (data.data !== undefined) return data.data;
  return data;
}

/** Firestore não aceita arrays aninhados (ex.: escalaData.members = [[...],[...]]). */
function valueNeedsJsonBlob(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    if (value.some(function (item) { return Array.isArray(item); })) return true;
    return value.some(function (item) {
      return item !== null && typeof item === "object" && valueNeedsJsonBlob(item);
    });
  }
  if (typeof value === "object") {
    for (var k in value) {
      if (Object.prototype.hasOwnProperty.call(value, k) && valueNeedsJsonBlob(value[k])) return true;
    }
  }
  return false;
}

async function ensureAuthTokenForFirestore() {
  try {
    const u = auth && auth.currentUser;
    if (!u) return;
    await u.getIdToken();
  } catch (e) {}
}

/** Mesma semântica que QuadroDeSaidas.parseDateToISO para data da saída administrativa. */
function parseSaidaAdmDateToISO(value) {
  if (value === null || value === undefined) return "";
  var s = String(value).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (s.indexOf("T") !== -1) return s.split("T")[0];
  var m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    return (
      m[3] +
      "-" +
      String(m[2]).padStart(2, "0") +
      "-" +
      String(m[1]).padStart(2, "0")
    );
  }
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  return "";
}

function groupSaidasAdministrativasByDay(list) {
  var map = new Map();
  if (!Array.isArray(list)) return map;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || typeof item !== "object") continue;
    var raw =
      item.dataSaida != null
        ? item.dataSaida
        : item.dataPedido != null
          ? item.dataPedido
          : item.data;
    var iso = parseSaidaAdmDateToISO(raw);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    if (!map.has(iso)) map.set(iso, []);
    map.get(iso).push(item);
  }
  return map;
}

/**
 * Item 3 Quadro: após gravar o mestre, atualiza documentos sot_data/saidasAdm_day_{ISO} (batches de até 400 ops).
 */
async function syncSaidasAdministrativasDayShards(list) {
  if (!db || !Array.isArray(list) || list.length === 0) return;
  var groups = groupSaidasAdministrativasByDay(list);
  if (!groups.size) return;
  var keys = Array.from(groups.keys()).sort(function (a, b) {
    return b.localeCompare(a);
  });
  if (keys.length > SAIDAS_ADM_DAY_SHARD_MAX_DATES) {
    keys = keys.slice(0, SAIDAS_ADM_DAY_SHARD_MAX_DATES);
    try {
      log(
        "warn",
        "sync day shards: truncado a " +
          SAIDAS_ADM_DAY_SHARD_MAX_DATES +
          " datas (mais recentes); dias mais antigos podem ficar com shard desatualizado até próximo save que os inclua"
      );
    } catch (e) {}
  }
  await ensureAuthTokenForFirestore();
  var batch = writeBatch(db);
  var n = 0;
  var ts = serverTimestamp();
  for (var k = 0; k < keys.length; k++) {
    var iso = keys[k];
    var arr = groups.get(iso) || [];
    var ref = doc(db, COL, SAIDAS_ADM_DAY_SHARD_PREFIX + iso);
    if (valueNeedsJsonBlob(arr)) {
      batch.set(ref, { _sotJsonV1: true, body: JSON.stringify(arr), updatedAt: ts });
    } else {
      batch.set(ref, { items: arr, updatedAt: ts });
    }
    n++;
    try {
      invalidateCache(SAIDAS_ADM_DAY_SHARD_PREFIX + iso);
    } catch (e) {}
    if (n >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      n = 0;
      ts = serverTimestamp();
    }
  }
  if (n > 0) {
    await batch.commit();
  }
}

function syncSignedInFlag() {
  const ok = authGateOk();
  try {
    window._sot_google_signed_in = ok;
  } catch (e) {}
  try {
    if (window.top) window.top._sot_google_signed_in = ok;
  } catch (e) {}
  try {
    window.dispatchEvent(new CustomEvent("sot-firebase-auth-changed", { detail: { signedIn: ok } }));
  } catch (e) {}
}

/**
 * Aguarda até haver usuário Firebase Auth (ou timeout). Útil no overlay inicial do SOT5.
 */
export function waitUntilSignedIn(timeoutMs) {
  timeoutMs = timeoutMs || 120000;
  return new Promise(function (resolve) {
    if (!auth) {
      resolve(false);
      return;
    }
    if (auth.currentUser) {
      auth.currentUser.getIdToken().catch(function () {});
      resolve(true);
      return;
    }
    const t = setTimeout(function () {
      try {
        unsub();
      } catch (e) {}
      resolve(!!auth.currentUser);
    }, timeoutMs);
    var unsub = onAuthStateChanged(auth, function (user) {
      if (user) {
        clearTimeout(t);
        user.getIdToken().catch(function () {});
        try {
          unsub();
        } catch (e) {}
        resolve(true);
      }
    });
  });
}

export async function installFirebaseSot() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, function (user) {
    syncSignedInFlag();
    if (window.firebaseSot && typeof window.firebaseSot.invalidateAllCache === "function") {
      window.firebaseSot.invalidateAllCache();
    }
  });
  syncSignedInFlag();

  window.__sotWaitUntilSignedIn = waitUntilSignedIn;

  window.firebaseSot = {
    authGateOk: authGateOk,

    isAvailable: function () {
      return !!db && typeof getDoc === "function";
    },

    invalidateCache: function (key) {
      invalidateCache(key);
    },

    /**
     * Item 5 (Quadro): invalida o mestre + o shard do dia selecionado numa única chamada (chaves alinhadas ao TTL por tipo).
     */
    invalidateQuadroSaidasCaches: function (selectedDateIso) {
      invalidateCache("saidasAdministrativas");
      var d = selectedDateIso != null ? String(selectedDateIso).slice(0, 10) : "";
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        invalidateCache(SAIDAS_ADM_DAY_SHARD_PREFIX + d);
      }
    },

    /**
     * Item 11 (Quadro): ouve só o documento do dia `saidasAdm_day_YYYY-MM-DD` (payload pequeno).
     * Atualiza a cache em memória desse id e chama `callback` a cada mudança remota.
     * Não subscreve o mestre `saidasAdministrativas` (evita custo e ruído da lista completa).
     * @returns {function} unsubscribe
     */
    watchSaidasAdmDayShard: function (dateIso, callback) {
      var d = dateIso != null ? String(dateIso).slice(0, 10) : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return function () {};
      }
      if (!db || !authGateOk()) {
        return function () {};
      }
      var keyStr = SAIDAS_ADM_DAY_SHARD_PREFIX + d;
      var ref = doc(db, COL, keyStr);
      var unsub = onSnapshot(
        ref,
        function (snap) {
          try {
            var value = null;
            if (snapshotExists(snap)) {
              value = valueFromFirestoreDocData(snap.data());
            }
            setCache(keyStr, value);
          } catch (e) {
            log("warn", "watchSaidasAdmDayShard parse key=" + keyStr, e && e.message);
          }
          try {
            if (typeof callback === "function") callback();
          } catch (e2) {}
        },
        function (err) {
          log("warn", "watchSaidasAdmDayShard listener key=" + keyStr, err && err.message);
        }
      );
      return function () {
        try {
          unsub();
        } catch (e) {}
      };
    },

    invalidateAllCache: function () {
      try {
        cache.clear();
      } catch (e) {}
    },

    getCurrentUserProfile: function () {
      try {
        const u = auth && auth.currentUser;
        if (!u) return null;
        return {
          uid: u.uid || "",
          email: u.email || "",
          displayName: u.displayName || ""
        };
      } catch (e) {
        return null;
      }
    },

    signInWithGoogle: async function () {
      if (window.location.protocol === "file:") {
        throw new Error("google-login-file-protocol");
      }
      if (!auth) return false;
      await signInWithPopup(auth, googleProvider);
      return !!(auth && auth.currentUser);
    },

    signOutGoogle: async function () {
      if (!auth) return false;
      await signOut(auth);
      return true;
    },

    get: async function (key) {
      const keyStr = String(key);
      if (!authGateOk()) {
        return null;
      }
      const cached = getCached(keyStr);
      if (cached !== null) return cached;

      let promise = inFlightGets.get(keyStr);
      if (promise) {
        try {
          return await promise;
        } finally {
          inFlightGets.delete(keyStr);
        }
      }

      promise = (async function () {
        if (!db) {
          log("warn", "get: db indisponível", keyStr);
          return null;
        }
        try {
          await ensureAuthTokenForFirestore();
          const ref = doc(db, COL, keyStr);
          const snap = await getDoc(ref);
          if (!snapshotExists(snap)) {
            setCache(keyStr, null);
            return null;
          }
          const value = valueFromFirestoreDocData(snap.data());
          setCache(keyStr, value);
          return value;
        } catch (e) {
          const code = e && e.code ? e.code : "";
          const msg = e && e.message ? e.message : String(e);
          if (code === "permission-denied") {
            log("error", "get PERMISSION-DENIED key=" + keyStr + " — confira regras Firestore e login Google.", msg);
          } else {
            log("error", "get error key=" + keyStr, msg);
          }
          return null;
        }
      })();

      inFlightGets.set(keyStr, promise);
      try {
        return await promise;
      } finally {
        inFlightGets.delete(keyStr);
      }
    },

    set: async function (key, value) {
      const keyStr = String(key);
      invalidateCache(keyStr);
      if (!authGateOk()) {
        return false;
      }

      let promise = inFlightSets.get(keyStr);
      if (promise) {
        try {
          return await promise;
        } catch (e) {
          return false;
        }
      }

      promise = (async function () {
        try {
          if (!db) {
            log("warn", "set: db indisponível");
            return false;
          }
          try {
            const ref = doc(db, COL, keyStr);
            const ts = serverTimestamp();
            var payload;
            if (valueNeedsJsonBlob(value)) {
              payload = { _sotJsonV1: true, body: JSON.stringify(value), updatedAt: ts };
            } else if (Array.isArray(value)) {
              payload = { items: value, updatedAt: ts };
            } else {
              payload = { data: value, updatedAt: ts };
            }
            await setDoc(ref, payload);
            if (keyStr === "saidasAdministrativas" && Array.isArray(value) && value.length > 0) {
              try {
                await syncSaidasAdministrativasDayShards(value);
              } catch (shardErr) {
                log("warn", "syncSaidasAdministrativasDayShards após set mestre", shardErr && shardErr.message);
              }
            }
            return true;
          } catch (e) {
            log("error", "set error key=" + keyStr, e && e.message);
            return false;
          }
        } finally {
          inFlightSets.delete(keyStr);
        }
      })();

      inFlightSets.set(keyStr, promise);
      try {
        return await promise;
      } finally {
        inFlightSets.delete(keyStr);
      }
    },

    getConfig: async function (chave) {
      if (!authGateOk()) return null;
      if (!db) return null;
      try {
        await ensureAuthTokenForFirestore();
        const ref = doc(db, COL, "config_" + String(chave));
        const snap = await getDoc(ref);
        if (!snapshotExists(snap)) return null;
        const data = snap.data();
        return data && data.value !== undefined ? data.value : null;
      } catch (e) {
        log("error", "getConfig error chave=" + chave, e && e.message);
        return null;
      }
    },

    setConfig: async function (chave, valor) {
      if (!authGateOk()) return false;
      if (!db) return false;
      try {
        const ref = doc(db, COL, "config_" + String(chave));
        await setDoc(ref, { value: valor, updatedAt: serverTimestamp() });
        return true;
      } catch (e) {
        log("error", "setConfig error chave=" + chave, e && e.message);
        return false;
      }
    },

    listAgendamentoUsuarios: async function () {
      if (!authGateOk() || !db) return [];
      try {
        await ensureAuthTokenForFirestore();
        const snap = await getDocs(collection(db, COL_AGENDAMENTO_USERS));
        const rows = [];
        snap.forEach(function (d) {
          try {
            rows.push({ id: d.id, ...d.data() });
          } catch (e) {}
        });
        return rows;
      } catch (e) {
        log("error", "listAgendamentoUsuarios error", e && e.message);
        return [];
      }
    },

    saveAgendamentoUsuario: async function (docId, payload) {
      if (!authGateOk() || !db) return false;
      const id = String(docId || "").trim();
      if (!id) return false;
      try {
        await ensureAuthTokenForFirestore();
        const ref = doc(db, COL_AGENDAMENTO_USERS, id);
        const nowTs = serverTimestamp();
        const data = payload && typeof payload === "object" ? payload : {};
        await setDoc(ref, {
          login: data.login || "",
          senha: data.senha || "",
          setor: data.setor || "",
          criadoEm: nowTs,
          atualizadoEm: nowTs
        }, { merge: true });
        return true;
      } catch (e) {
        log("error", "saveAgendamentoUsuario error", e && e.message);
        return false;
      }
    }
  };

  log("log", "Firebase SOT (modular) instalado; aguardando Google Auth para leituras/escritas.");
  return true;
}
