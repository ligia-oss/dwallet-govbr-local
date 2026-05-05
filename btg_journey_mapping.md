# Mapeamento BTG Pactual para jornadas dWallet

Autor: **Manus AI**  
Data: **2026-05-05**

Este documento consolida o mapeamento técnico entre a coleção Postman **BTG Pactual Empresar USER** e os passos da jornada dWallet que ainda não possuíam API aplicável. A origem primária é o arquivo local `/home/ubuntu/upload/BTGPactualEmpresarUSER.postman_collection.json`, resumido em `btg_postman_endpoints_summary.md`.

> O **Passo 0 M2M Dataprev** permanece classificado como pré-requisito técnico de sandbox e não deve ser exibido como etapa operacional da experiência do usuário final. As telas BTG devem aparecer apenas nos pontos funcionais da carteira: saldo, extrato, Pix, cobrança, recebimento e pagamentos.

## Princípios de implementação

A coleção BTG é empresarial, usa caminhos com `companyId` e autenticação OAuth2/Bearer. Por isso, o mapeamento se aplica principalmente à **Business dWallet / BdWallet**. A Personal dWallet continuará usando os endpoints Dataprev já integrados quando houver contrato aplicável, enquanto os recursos financeiros empresariais serão exibidos na BdWallet.

| Decisão técnica | Aplicação prática |
|---|---|
| Não expor token bruto | O front-end receberá apenas `tokenPresent`, `tokenHandle`, status HTTP, URL normalizada e corpo sanitizado. |
| Separar experiência de aplicativo e diagnóstico | A tela principal será uma tela de usuário final; os detalhes de API aparecerão como confirmação/resultado sanitizado, não como painel técnico dominante. |
| Tratar credenciais ausentes | Se `BTG_BASE_URL`, `BTG_COMPANY_ID` ou token OAuth2 não estiverem configurados, o backend retornará `configured: false` com mensagem segura. |
| Registrar lacunas de Pix | A coleção contém Pix cash-in e cobrança Pix, mas não apresenta endpoint específico de cadastro/gestão de chave Pix. Essa lacuna deve aparecer como bloqueio técnico. |
| Reaproveitar padrão de ações | Cada tela emulada dispara uma ação BTG com payload controlado, mantendo evidência sanitizada da requisição e da resposta. |

## Matriz de endpoints e telas

| Caso de uso dWallet | Tela de app emulada | Método | URL | Headers/parâmetros | Payload esperado | Resposta sanitizada exibida |
|---|---|---:|---|---|---|---|
| Consultar dados da conta empresarial | **Minha conta BdW** | GET | `{{baseUrl}}/{{companyId}}/banking/accounts` | `Authorization: Bearer <token>` quando configurado; `companyId` no path | Não possui body | Lista/metadados de contas, agência, número, status e identificadores mascarados quando existirem. |
| Consultar saldo | **Saldo disponível BdW** | GET | `{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/balances` | `Authorization: Bearer <token>`; `companyId` e `accountId` no path | Não possui body | Saldo disponível/contábil e moeda quando retornados; em erro, status HTTP e mensagem sanitizada. |
| Visualizar extrato | **Extrato BdW** | GET | `{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/statements?startDate={{startDate}}&endDate={{endDate}}` | `Authorization: Bearer <token>`; `companyId`, `accountId`, `startDate`, `endDate` | Não possui body | Lista de lançamentos por período ou payload sanitizado retornado pela API. |
| Consultar linha digitável | **Conferir boleto/conta** | GET | `{{baseUrl}}/{{companyId}}/banking/payments/barcodes?code={{barcode}}` | `Authorization: Bearer <token>`; `companyId` no path; `code` na query | Não possui body | Dados para conferência antes de pagar, como valor, beneficiário e vencimento quando retornados. |
| Enviar pagamento ou transferência | **Pagar com BdW** | POST | `{{baseUrl}}/{{companyId}}/banking/payments` | `Authorization: Bearer <token>`; `Content-Type: application/json`; `companyId` no path | `{ "items": [{ "type": "UTILITIES", "amount": 1.1, "paymentDate": "2029-09-26", "debitParty": { "branchCode": "50", "number": "000000000" }, "detail": { "digitableLine": "800800000000000000000000000000000000000000000000" }, "tags": { "externalId": "item-1" } }] }` | Protocolo/status da iniciação de pagamento ou erro sanitizado. |
| Listar pagamentos | **Pagamentos enviados** | GET | `{{baseUrl}}/{{companyId}}/banking/payments` | `Authorization: Bearer <token>`; `companyId` no path | Não possui body | Relação de iniciações/pagamentos retornada pela API. |
| Consultar pagamento específico | **Detalhe do pagamento** | GET | `{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}` | `Authorization: Bearer <token>`; `companyId` e `paymentId` no path | Não possui body | Status, item e dados do pagamento, com identificadores sensíveis mascarados quando necessário. |
| Gerar recibo | **Comprovante BdW** | GET | `{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}/receipt` | `Authorization: Bearer <token>`; `companyId` e `paymentId` no path | Não possui body | Metadados do recibo ou payload sanitizado. |
| Criar QR Code Pix de recebimento | **Receber via Pix — QR Code** | POST | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations` | `Authorization: Bearer <token>`; `Content-Type: application/json`; `companyId` no path | `{ "type": "cob", "description": "Exemplo de descrição" }` | Identificador/localização do QR Code retornado. |
| Listar QR Codes Pix | **QR Codes gerados** | GET | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations` | `Authorization: Bearer <token>`; `companyId` no path | Não possui body | Lista de localizações/QR Codes retornada pela API. |
| Criar cobrança Pix instantânea | **Receber via Pix — cobrança** | POST | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections` | `Authorization: Bearer <token>`; `Content-Type: application/json`; `companyId` no path | `{ "pixKey": "exemplo-de-chave-pix", "amount": { "original": 1.1, "allowCustomerChangeValue": false } }` | Dados da cobrança Pix instantânea, incluindo identificadores/links/QR quando retornados. |
| Listar cobranças Pix | **Cobranças Pix** | GET | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections?locationId={{locationId}}` | `Authorization: Bearer <token>`; `companyId` no path; `locationId` opcional na query | Não possui body | Lista de cobranças Pix vinculadas à empresa ou localização. |
| Criar cobrança bancária | **Receber por boleto/cobrança** | POST | `{{basePath}}/{{companyId}}/banking/collections` | `Authorization: Bearer <token>` quando configurado; `Content-Type: application/json`; `companyId` no path | Payload com `amount`, `type: BANKSLIP`, `dueDate`, `overDueDate`, `payer`, `account`, descontos/juros/multa quando aplicável. | Dados da cobrança registrada ou erro sanitizado. |
| Consultar cobranças bancárias | **Cobranças emitidas** | GET | `{{basePath}}/{{companyId}}/banking/collections?pageSize=1&pageNumber=1` | `Authorization: Bearer <token>` quando configurado; `companyId` no path; paginação na query | Não possui body | Lista paginada de cobranças emitidas. |
| Cadastro de chave Pix | **Cadastrar chave Pix** | Sem endpoint na coleção | Não aplicável | Não aplicável | Campo de chave, tipo de chave e conta serão exibidos como tela bloqueada/pendente de contrato. | A tela deve informar que a coleção recebida não contém endpoint de cadastro/gestão de chave Pix, diferenciando de cobrança Pix, que possui endpoints. |

## Cobertura por fluxo

| Fluxo funcional | Cobertura pela coleção BTG | Observação de UX |
|---|---|---|
| Recebimento via Pix | Coberto por `pix-cash-in/locations` e `pix-cash-in/instant-collections`. | A tela deve parecer “Receber Pix” com valor, descrição, chave Pix e confirmação de QR/cobrança. |
| Envio de pagamento | Coberto por `banking/payments` e `banking/payments/barcodes`. | A tela deve parecer “Pagar conta” com linha digitável, valor, data e conta de débito. |
| Extrato e saldo | Coberto por `banking/accounts`, `balances` e `statements`. | A tela deve parecer extrato bancário de app, com período, cards de saldo e lista de lançamentos. |
| Comprovante | Coberto por `banking/payments/{{paymentId}}/receipt`. | A tela deve parecer comprovante de pagamento, não dump técnico. |
| Cadastro de chave Pix | Não coberto na coleção recebida. | Exibir tela de app com estado “contrato BTG não fornecido”, sem simular chamada inexistente como real. |

## Formato de resposta sanitizada

As respostas de todos os procedimentos BTG devem retornar um envelope com `provider: "BTG Pactual"`, `action`, `configured`, `request`, `response`, `durationMs` e `receivedAt`. O campo `request.headers.Authorization` nunca deve conter o token bruto; quando houver token, deve exibir apenas `Bearer ••••••••`. O corpo da resposta deve passar por sanitização recursiva para mascarar chaves como `access_token`, `refresh_token`, `token`, `secret`, `authorization`, `password` e equivalentes.

```json
{
  "provider": "BTG Pactual",
  "action": "createPayment",
  "configured": false,
  "request": {
    "method": "POST",
    "url": "https://sandbox.example/{companyId}/banking/payments",
    "headers": { "Authorization": "Bearer ••••••••" },
    "body": { "items": [{ "type": "UTILITIES", "amount": 1.1 }] }
  },
  "response": {
    "ok": false,
    "status": 0,
    "body": { "message": "Credenciais BTG não configuradas no ambiente." }
  }
}
```
