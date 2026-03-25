# SOT — Fase 1: modelo de dados e metadados (saída administrativa)

Documento de especificação para evolução de concorrência, merge e sincronização. **Não substitui** o estado actual do JSON armazenado; define o alvo de contrato e extensões planejadas.

## 1. Âmbito

- **Entidade:** cada elemento do array `saidasAdministrativas` (localStorage / envelope Firestore `sot_data/saidasAdministrativas` → campo `items[]`).
- **Fora deste documento (mas análogo):** `saidasAmbulancias` partilha grande parte dos campos operacionais; o **bloco atómico KM/chegada** aplica-se da mesma forma.

## 2. Metadados por registro (obrigatórios e alvo)

| Campo | Tipo | Origem hoje | Notas Fase 1 |
|--------|------|-------------|--------------|
| `id` | string | Gerado (`saidas_*` no cadastro; `saida_adm_*` no quadro) | Identificador estável; não reutilizar após delete lógico. |
| `createdAt` | string ISO 8601 | `Cadastrodesaidas8` em criação | Manter em todas as vias de criação (incl. importações, quando possível). |
| `updatedAt` | string ISO 8601 | `touchCadastroSaidaMetadata` / `touchSaidaAdmRecord` / `data-service.normalizeArrayRecords` | **Fonte única** para “última modificação” do registo; alinhar leituras (`itemUpdatedMs` já considera `updatedAt`, `_updatedAt`, `modifiedAt`, `updated_at`). |
| `updatedBy` | string | Email, `uid`, `displayName` Firebase ou `'local-user'` | Auditoria humana; não confundir com dispositivo. |
| `revision` | integer ≥ 0 | *A introduzir* | Incremento **atómico** por escrita bem-sucedida (cliente + validação servidor/Firestore em fases posteriores). Substitui ou complementa “último `updatedAt` vence” em cenários de relógio skew. |
| `deviceId` | string (opcional) | *A introduzir* | Identificador estável do browser/dispositivo (ex. UUID em `localStorage`), para diagnóstico e merge; opcional por privacidade. |

**Firestore (envelope do documento):** o doc continua a exigir `items` + `updatedAt` ao nível do documento (`firestore.rules`). Os campos acima referem-se a **cada item** de `items[]`.

## 3. Metadados por campo (opcional, extensível)

Objeto no próprio registo, por exemplo:

- `fieldUpdatedAt`: mapa `{ [nomeDoCampo]: string ISO 8601 }`
- `fieldRevision`: mapa `{ [nomeDoCampo]: integer }` (opcional se `revision` global bastar)

**Recomendação inicial:** preencher primeiro para o **bloco atómico KM/chegada** (ver §5) e para campos de alto conflito (ex. `viatura`, `motorista`, `horaSaida`) se necessário.

## 4. Tabela de campos de domínio — saída administrativa

Campos observados no código (cadastro, quadro, agendamento). Tipos lógicos; o armazenamento actual é em grande parte **string** mesmo para números de KM.

| Campo | Tipo lógico | Onde aparece | Notas |
|--------|-------------|--------------|--------|
| `tipo` | string | Form | Valor típico `Administrativa` (vs ambulância). |
| `dataPedido` | string `YYYY-MM-DD` | Form, agendamento | |
| `horaPedido` | string `HH:mm` | Form, agendamento | |
| `dataSaida` | string `YYYY-MM-DD` | Form, filtros | **Canónico** para data da saída. |
| `horaSaida` | string `HH:mm` | Form | **Canónico** para hora de saída. |
| `saida` | string | Persistido | Espelho de `horaSaida` (legado / compatibilidade). |
| `horario` | string | idem | Espelho de `horaSaida`. |
| `hora` | string | idem | Espelho de `horaSaida`. |
| `setor` | string | Form | |
| `ramal` | string | Form | |
| `cidade` | string | Form | Sinónimos de leitura: `endereco_cidade`. |
| `bairro` | string | Form | Sinónimos: `endereco_bairro`, `destino` (agendamento). |
| `objetivo` | string | Form | Sinónimo de leitura/escrita: `motivo`. |
| `numPassageiros` | string | Form | |
| `responsavelPedido` | string | Form | |
| `om` | string | Form | |
| `viatura` | string (placa) | Form, quadro | Sinónimo: `viatura_id` em alguns fluxos. |
| `motorista` | string | Form, quadro | Sinónimo: `motorista_id`. |
| `hospital` | string | Form | Mais relevante para ambulância; pode vazio na admin. |
| `kmSaida` | string | Form, quadro | **Canónico** (formato UI, vírgula/ponto). |
| `kmChegada` | string | Form, quadro | **Canónico**. |
| `chegada` | string `HH:mm` | Form, quadro | Hora de chegada. |
| `km_saida` | string | Quadro | **Duplicado de espelho:** escrito em `Saidasadministrativas6` junto com `kmSaida`; leitura defensiva deve aceitar ambos. |
| `km_chegada` | string | Quadro | Idem para `kmChegada`. |
| `observacoes` | string | Cadastro novo | Inicializado vazio. |
| `realizada` | boolean | Cadastro / regras UI | **Derivável:** `!!(kmSaida && kmChegada && chegada)` (com tolerância a `km_*`). Se persistido, deve ser recalculado ou actualizado em conjunto com o bloco KM/chegada. |
| `isUnplanned` | boolean | Cadastro | Atraso face à regra de pedido. |
| `preSaidaAlarmDismissed`, `saidaAlarmDismissed` | boolean | Cadastro | Estado de UI/lembrete. |
| `juntada` | boolean | Cadastro | Saída resultante de junção. |
| `setores_multiplos`, `destinos_multiplos`, `saidas_originais`, `saidaJuntadaOriginal` | vários | Junção | Removidos ao “desagrupar”; especificar em doc de junção se necessário. |
| `agendadoViaFrontend` | boolean | `Agendamento.html` | Metadado de proveniência. |

**Identificadores alternativos (merge):** `data-service.getStableRecordId` aceita `_id`, `uuid`, `key` além de `id` — não são o contrato preferido para saídas novas.

## 5. Bloco atómico KM / chegada

Estes campos devem ser tratados como **uma unidade de consistência** em merges e escritas concorrentes (actualizar juntos, mesma `revision` ou mesmo incremento de `updatedAt` por operação):

| Campo | Papel no bloco |
|--------|----------------|
| `kmSaida` | KM de saída (canónico). |
| `kmChegada` | KM de chegada (canónico). |
| `chegada` | Hora de chegada. |
| `km_saida` | Espelho de `kmSaida` (manter sincronizado ou eliminar numa migração futura). |
| `km_chegada` | Espelho de `kmChegada`. |
| `realizada` | Se existir no registo, actualizar **apenas** em função dos três canónicos acima (e não independentemente). |

**Invariantes de negócio (já validados no cadastro):** KM chegada só com KM saída; KM chegada numéricamente maior que saída quando ambos preenchidos (após normalização decimal).

## 6. Compatibilidade e próximos passos (Fase 2+)

- Normalizar gradualmente para **só camelCase** no armazenamento, mantendo leitura defensiva (`kmSaida ?? km_saida`) até migração completa.
- Introduzir `revision` por registo antes de condicionantes Firestore (`update` com pré-condição) na fase prevista para o servidor.
- Testes: cenários de duas abas a editar o mesmo `id` com alterações no bloco KM/chegada vs campos administrativos.

---

**Referências no repositório:** `Todas as abas/Cadastrodesaidas8.html` (`touchCadastroSaidaMetadata`, `saveNewSaida`), `Todas as abas/Saidasadministrativas6.html` (`commitKmFieldsFromModal`, `isSaidaAdministrativaIniciada`), `Todas as abas/data-service.js` (`itemUpdatedMs`, `normalizeArrayRecords`), `firestore.rules` (`hasValidArrayEnvelope`).
