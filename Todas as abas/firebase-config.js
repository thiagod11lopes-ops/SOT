/**
 * Configuração do Firebase para o SOT.
 * Substitua os valores abaixo pelas credenciais do seu projeto Firebase:
 * Console Firebase > Configurações do projeto (ícone engrenagem) > Seus apps > Web app.
 * Coleção usada para usuários do Agendamento: sot_agendamento_usuarios
 */
(function() {
    if (typeof firebase === 'undefined') return;
    var firebaseConfig = {
        apiKey: "SUA_API_KEY",
        authDomain: "SEU_PROJETO.firebaseapp.com",
        projectId: "SEU_PROJETO_ID",
        storageBucket: "SEU_PROJETO.appspot.com",
        messagingSenderId: "SEU_SENDER_ID",
        appId: "SEU_APP_ID"
    };
    try {
        window.firebaseApp = firebase.app();
    } catch (e) {
        window.firebaseApp = firebase.initializeApp(firebaseConfig);
    }
    window.firebaseDb = firebase.firestore();
})();
