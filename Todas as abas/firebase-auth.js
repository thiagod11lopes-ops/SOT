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
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

function $(id) {
  return document.getElementById(id);
}

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
  const { btnLogin, usuarioInfo, nomeUsuario } = getUI();

  const displayName = user?.displayName || user?.email || "";

  if (nomeUsuario) nomeUsuario.textContent = displayName;

  if (usuarioInfo) usuarioInfo.style.display = "block";
  if (btnLogin) btnLogin.style.display = "none";

  // opcional: garante que o botão sair fique visível
  if (btnSair) btnSair.style.display = "inline-block";
}

function setUIForSignedOut() {
  const { btnLogin, usuarioInfo } = getUI();
  if (usuarioInfo) usuarioInfo.style.display = "none";
  if (btnLogin) btnLogin.style.display = "inline-block";
}

let boundToTargetDoc = false;

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
      if (ui.usuarioInfo) ui.usuarioInfo.style.display = "block";
      if (ui.btnLogin) ui.btnLogin.style.display = "none";
      if (ui.btnSair) ui.btnSair.style.display = "inline-block";
    } else {
      if (ui.usuarioInfo) ui.usuarioInfo.style.display = "none";
      if (ui.btnLogin) ui.btnLogin.style.display = "inline-block";
    }
  });

  // Event listeners (botões)
  if (ui.btnLogin) {
    ui.btnLogin.addEventListener("click", async () => {
      if (!navigator.onLine) {
        alert("Sem conexão com a internet.");
        return;
      }
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("Erro ao entrar com Google:", err);
        alert("Falha ao entrar com Google. Verifique as configurações do Firebase Auth (Google habilitado).");
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

