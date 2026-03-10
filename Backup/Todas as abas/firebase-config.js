/**
 * Configuração do Firebase para o SOT (Usuários do Agendamento).
 *
 * COMO PREENCHER:
 * 1. Abra https://console.firebase.google.com e entre no seu projeto (ou crie um).
 * 2. Ative o Firestore (Criar > Firestore Database > Criar banco, modo teste).
 * 3. Em Configurações do projeto (engrenagem) > Seus aplicativos > app Web, copie o firebaseConfig.
 * 4. Cole abaixo os valores reais (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
 * Guia completo: abra o arquivo CONFIGURAR_FIREBASE.md nesta pasta.
 */
(function() {
    if (typeof firebase === 'undefined') return;
    var firebaseConfig = {
        apiKey: "COLE_SUA_API_KEY_AQUI",
        authDomain: "SEU_PROJETO_ID.firebaseapp.com",
        projectId: "SEU_PROJETO_ID",
        storageBucket: "SEU_PROJETO_ID.appspot.com",
        messagingSenderId: "COLE_SEU_SENDER_ID",
        appId: "COLE_SEU_APP_ID"
    };
    try {
        window.firebaseApp = firebase.app();
    } catch (e) {
        window.firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    window.firebaseDb = firebase.firestore();
})();
