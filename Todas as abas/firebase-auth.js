// firebase-auth.js (ES Modules, Firebase v10)
// Responsável por: inicializar Firebase, autenticar via Google e expor `auth` e `db`.
//
// COMO USAR:
// 1) Cole o objeto `firebaseConfig` real nas configurações abaixo.
// 2) Garanta que o seu HTML tenha os IDs:
//    - nome-usuario
//    - usuario-info
//    - btn-login
//    - btn-sair
//
// Exporta:
//  - auth (Firebase Auth)
//  - db (Firestore)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: Cole aqui o seu firebaseConfig real do Console do Firebase.
// Exemplo (apenas estrutura):
const firebaseConfig = {
  apiKey: "AIzaSyCJkB0sDzoz8kuchiM-A9lycQk011H6Pmw",
  authDomain: "sot-c77cb.firebaseapp.com",
  projectId: "sot-c77cb",
  storageBucket: "sot-c77cb.firebasestorage.app",
  messagingSenderId: "608364494039",
  appId: "1:608364494039:web:018231f1db30be94c7c492"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Instâncias exportadas
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

function safeStringifyJson(value) {
  try {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch (e) {
    return "";
  }
}

async function recordAuditForUser(userSnapshot, action, details) {
  try {
    if (!userSnapshot || !userSnapshot.uid) return;
    const detailsStr = safeStringifyJson(details);
    await addDoc(collection(db, "sot_google_audit_logs"), {
      uid: userSnapshot.uid,
      email: userSnapshot.email || "",
      displayName: userSnapshot.displayName || "",
      action: action || "",
      details: detailsStr === "{}" ? "" : detailsStr,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    // Auditoria deve falhar silenciosamente para não quebrar o app.
    console.warn("[firebase-auth] Falha ao gravar auditoria:", e && e.message ? e.message : e);
  }
}

let lastUserSnapshot = null;

// Exponibiliza para iframes/scripts não-modulares (ex.: Configurações.html).
// Assinatura: window.top._sotRecordAuditAction(action: string, details?: object)
function recordAuditActionFromUI(action, details) {
  const user = auth.currentUser;
  const snapshot = user
    ? { uid: user.uid, email: user.email || "", displayName: user.displayName || "" }
    : lastUserSnapshot;
  return recordAuditForUser(snapshot, action, details);
}

try {
  if (window.top) window.top._sotRecordAuditAction = recordAuditActionFromUI;
  window._sotRecordAuditAction = recordAuditActionFromUI;
} catch (e) {}

// Grava login/logout independentemente do UI bind.
onAuthStateChanged(auth, (user) => {
  const snapshot = user
    ? { uid: user.uid, email: user.email || "", displayName: user.displayName || "" }
    : null;

  if (snapshot) {
    lastUserSnapshot = snapshot;
    void recordAuditForUser(snapshot, "google_login", {});
  } else if (lastUserSnapshot) {
    void recordAuditForUser(lastUserSnapshot, "google_logout", {});
    lastUserSnapshot = null;
  }
});

function $(id) {
  return document.getElementById(id);
}

// Debug rápido: ajuda a confirmar se o arquivo carregado no navegador
// está usando o `firebaseConfig` real (e não placeholders).
try {
  if (firebaseConfig?.apiKey && String(firebaseConfig.apiKey).includes("COLE_AQUI")) {
    console.error("[firebase-auth] firebaseConfig ainda parece placeholder (apiKey=COLE_AQUI).");
  } else {
    console.log("[firebase-auth] firebaseConfig apiKey prefix:", String(firebaseConfig?.apiKey || "").slice(0, 10));
    console.log("[firebase-auth] firebaseConfig authDomain:", firebaseConfig?.authDomain);
  }
} catch (e) {}

function getUI() {
  const doc = document;
  return {
    btnLogin: doc.getElementById("btn-login"),
    btnSair: doc.getElementById("btn-sair"),
    usuarioInfo: doc.getElementById("usuario-info"),
    nomeUsuario: doc.getElementById("nome-usuario")
  };
}

function setUIForSignedIn(user) {
  const { btnLogin, btnSair, usuarioInfo, nomeUsuario } = getUI();

  const displayName = user?.displayName || user?.email || "";

  if (nomeUsuario) nomeUsuario.textContent = displayName;

  if (usuarioInfo) usuarioInfo.style.display = "block";
  if (btnLogin) btnLogin.style.display = "none";

  if (btnSair) btnSair.style.display = "inline-block";
}

function setUIForSignedOut() {
  const { btnLogin, usuarioInfo } = getUI();
  if (usuarioInfo) usuarioInfo.style.display = "none";
  if (btnLogin) btnLogin.style.display = "inline-block";
}

let boundToTargetDoc = false;

function setUsuarioInfoVisibility(usuarioInfoEl, visible) {
  if (!usuarioInfoEl) return;
  if (!visible) {
    usuarioInfoEl.style.display = "none";
    return;
  }
  try {
    const shell = typeof document !== "undefined" ? document.getElementById("google-login-shell") : null;
    const inMainShell = shell && shell.contains(usuarioInfoEl);
    usuarioInfoEl.style.display = inMainShell ? "flex" : "block";
  } catch (e) {
    usuarioInfoEl.style.display = "block";
  }
}

function bindUIToDoc(targetDoc) {
  if (!targetDoc || boundToTargetDoc) return;

  const ui = {
    btnLogin: targetDoc.getElementById("btn-login"),
    btnSair: targetDoc.getElementById("btn-sair"),
    usuarioInfo: targetDoc.getElementById("usuario-info"),
    nomeUsuario: targetDoc.getElementById("nome-usuario")
  };

  // Atualiza UI quando o usuário mudar
  onAuthStateChanged(auth, (user) => {
    const displayName = user?.displayName || user?.email || "";
    if (ui.nomeUsuario) ui.nomeUsuario.textContent = displayName;

    // Usado pelo SOT5.html (iframe) para liberar o desbloqueio sem senha.
    // Atribuímos no window.top porque o SOT5 roda dentro de um iframe.
    try {
      if (window.top) window.top._sot_google_signed_in = !!user;
      else window._sot_google_signed_in = !!user;
    } catch (e) {}

    if (user) {
      setUsuarioInfoVisibility(ui.usuarioInfo, true);
      if (ui.btnLogin) ui.btnLogin.style.display = "none";
      if (ui.btnSair) ui.btnSair.style.display = "inline-block";
    } else {
      setUsuarioInfoVisibility(ui.usuarioInfo, false);
      if (ui.btnLogin) ui.btnLogin.style.display = "inline-block";
    }
  });

  // Event listeners (botões)
  if (ui.btnLogin) {
    ui.btnLogin.addEventListener("click", async () => {
      if (window.location.protocol === "file:") {
        alert(
          "O login Google não funciona ao abrir o arquivo direto (file://).\n\n" +
            "Use um endereço http://, por exemplo:\n" +
            "• VS Code: extensão «Live Server» → abra http://127.0.0.1:5500/.../index.html\n" +
            "• Terminal: npx --yes serve \"Todas as abas\"\n\n" +
            "No Firebase: Authentication → Settings → Authorized domains → inclua «localhost» e «127.0.0.1»."
        );
        return;
      }
      if (!navigator.onLine) {
        alert("Sem conexão com a internet.");
        return;
      }
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("Erro ao entrar com Google:", err);
        const code = err && err.code ? err.code : "";
        const msg = err && err.message ? err.message : "";
        alert("Falha ao entrar com Google.\n" + (code ? "Código: " + code + "\n" : "") + (msg ? msg : ""));
      }
    });
  }

  if (ui.btnSair) {
    ui.btnSair.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Erro ao sair:", err);
      }
    });
  }

  boundToTargetDoc = true;
}

function tryBind() {
  try {
    // Caso os elementos estejam no documento principal
    if (document.getElementById("btn-login")) {
      bindUIToDoc(document);
      return true;
    }

    // Caso os elementos estejam dentro do iframe (index.html -> SOT5.html)
    const iframe = document.querySelector('iframe.content-frame');
    if (iframe && iframe.contentDocument) {
      if (iframe.contentDocument.getElementById("btn-login")) {
        bindUIToDoc(iframe.contentDocument);
        return true;
      }
    }
  } catch (e) {
    // Pode acontecer se o iframe ainda não estiver carregado ou por restrições de acesso
  }
  return false;
}

// Tenta ligar assim que carregar e também quando o iframe terminar de carregar
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (!tryBind()) {
      const iframe = document.querySelector('iframe.content-frame');
      if (iframe) iframe.addEventListener("load", () => tryBind());
    }
  });
} else {
  if (!tryBind()) {
    const iframe = document.querySelector('iframe.content-frame');
    if (iframe) iframe.addEventListener("load", () => tryBind());
  }
}

// Se o módulo carregar antes do DOM completo ou o iframe atrasar, tenta de novo.
setTimeout(function () {
  if (!boundToTargetDoc) tryBind();
}, 500);
setTimeout(function () {
  if (!boundToTargetDoc) tryBind();
}, 2500);
window.addEventListener("load", function () {
  if (!boundToTargetDoc) tryBind();
});

