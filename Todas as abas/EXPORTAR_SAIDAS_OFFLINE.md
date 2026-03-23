# Exportar saídas do Firebase e usar offline

Há **três** formas de obter um JSON com saídas administrativas e de ambulância e carregar sem depender do Firestore em tempo real.

---

## 1) Pelo SOT (recomendado)

1. Abra o sistema pelo **`index.html`** → entre com **Google**.
2. Vá em **Configurações** → **Gerenciamento de Dados**.
3. Clique em **«Baixar saídas (JSON)»** — gera `SOT_saidas_DD-MM-AAAA.json`.
4. Em outro computador ou **sem internet**, abra Configurações e use **«Restaurar saídas do backup»** e escolha esse arquivo.
5. Os dados ficam no **localStorage** do navegador. **Sem internet**, as telas de saídas passam a ler essa cópia local.
6. Quando voltar a internet, use **«Enviar dados locais para Firebase»** para gravar de novo na nuvem.

O mesmo formato serve o botão **«Salvar e fazer download»** (backup completo): dentro do arquivo há as chaves `saidasAdministrativas` e `saidasAmbulancias` (valores em string JSON).

---

## 2) Pelo Console do Firebase (cópia manual)

1. [Firebase Console](https://console.firebase.google.com) → seu projeto → **Firestore**.
2. Coleção **`sot_data`** → documento **`saidasAdministrativas`**.
3. O campo **`items`** é o array de saídas administrativas. Copie o array (ou use “Copiar” no documento).
4. Repita para o documento **`saidasAmbulancias`**.
5. Monte um arquivo `saidas.json` assim (os valores podem ser **string** JSON ou array direto):

```json
{
  "saidasAdministrativas": "[{\"id\":\"...\",\"viatura\":\"...\"}]",
  "saidasAmbulancias": "[{\"id\":\"...\"}]"
}
```

Ou com arrays literais:

```json
{
  "saidasAdministrativas": [],
  "saidasAmbulancias": []
}
```

6. No SOT → **Restaurar saídas do backup** → selecione o arquivo.

---

## 3) Formato mínimo aceito pelo «Restaurar saídas»

- Pelo menos uma das chaves **`saidasAdministrativas`** ou **`saidasAmbulancias`**.
- Valor: **array** ou **string** que o `JSON.parse` entenda como array.
- Se uma lista estiver vazia no arquivo, a outra ainda pode ser restaurada.

---

## Observações

- **Login Google** ainda é necessário para **gravar** no Firestore (regras `request.auth`).
- **Restaurar** sem internet preenche só o **navegador**; a nuvem atualiza quando você usar **Enviar dados locais para Firebase** ou **Sincronizar**, estando online e autenticado.
