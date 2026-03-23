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
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
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
const CACHE_TTL_MS = 60 * 1000;
const LOG_PREFIX = "[firebase-sot-modular]";

const cache = new Map();
const inFlightGets = new Map();
const inFlightSets = new Map();

let db = null;
let auth = null;

function log(level, message, detail) {
  try {
    const msg =
      detail != null
        ? message + " " + (typeof detail === "object" ? JSON.stringify(detail) : detail)
        : message;
    if (level === "warn") console.warn(LOG_PREFIX, msg);
    else if (level === "error") console.error(LOG_PREFIX, msg);
    else console.log(LOG_PREFIX, msg);
  } catch (e) {}
}

function invalidateCache(key) {
  try {
    cache.delete(String(key));
  } catch (e) {}
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
    cache.set(String(key), {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS
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

    invalidateAllCache: function () {
      try {
        cache.clear();
      } catch (e) {}
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
          const ref = doc(db, COL, keyStr);
          const snap = await getDoc(ref);
          if (!snap.exists) {
            setCache(keyStr, null);
            return null;
          }
          const data = snap.data();
          let value = null;
          if (data && Array.isArray(data.items)) value = data.items;
          else if (data && data.data !== undefined) value = data.data;
          else value = data;
          setCache(keyStr, value);
          return value;
        } catch (e) {
          log("error", "get error key=" + keyStr, e && e.message);
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
            const payload = Array.isArray(value)
              ? { items: value, updatedAt: ts }
              : { data: value, updatedAt: ts };
            await setDoc(ref, payload);
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
        const ref = doc(db, COL, "config_" + String(chave));
        const snap = await getDoc(ref);
        if (!snap.exists) return null;
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
    }
  };

  log("log", "Firebase SOT (modular) instalado; aguardando Google Auth para leituras/escritas.");
  return true;
}
