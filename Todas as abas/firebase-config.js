/**
 * Configuração do Firebase para o SOT (Usuários do Agendamento).
 *
 * COMO PREENCHER:
 * 1. Abra https://console.firebase.google.com e entre no seu projeto (ou crie um).
 * 2. Ative o Firestore (Criar > Firestore Database > Criar banco, modo teste).
 * 3. Em Configurações do projeto (engrenagem) > Seus aplicativos > app Web, copie o firebaseConfig.
 * 4. Cole abaixo os valores reais (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
 * Guia completo: abra o arquivo CONFIGURAR_FIREBASE.md nesta pasta.
 *
 * Segurança: a chave Web é pública por desenho; o controlo de acesso real está nas regras
 * Firestore (ver firestore.rules na raiz do projeto e o guia).
 */
(function() {
    if (typeof firebase === 'undefined') return;
    var firebaseConfig = {
        apiKey: "AIzaSyCJkB0sDzoz8kuchiM-A9lycQk011H6Pmw",
        authDomain: "sot-c77cb.firebaseapp.com",
        projectId: "sot-c77cb",
        storageBucket: "sot-c77cb.firebasestorage.app",
        messagingSenderId: "608364494039",
        appId: "1:608364494039:web:018231f1db30be94c7c492"
    };
    try {
        window.firebaseApp = firebase.app();
    } catch (e) {
        window.firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    window.firebaseDb = firebase.firestore();
    try {
        window.firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function () {
            /* vários separadores ou browser sem suporte */
        });
    } catch (ePersist) {}
})();
