# Resumo dos endpoints BTG Pactual extraídos da coleção Postman

Coleção: **BTG Pactual Empresar USER**.

| Pasta | Requisição | Método | URL | Auth | Body |
|---|---|---:|---|---|---|
| Pagamentos e Transferências | Listar iniciação de pagamento ou transferência | GET | `{{baseUrl}}/{{companyId}}/banking/payments` | bearer |  |
| Pagamentos e Transferências | Consulta barcodes | GET | `{{baseUrl}}/{{companyId}}/banking/payments/barcodes?code={{barcode}}` | bearer |  |
| Pagamentos e Transferências | Criar uma iniciação de pagamento ou transferência | POST | `{{baseUrl}}/{{companyId}}/banking/payments` | bearer | //Este é um exemplo do pagamento de utilities //Para o body de outras modalidades de pagamento ou transferência visite: //https://developers.empresas.btgpactual.com/reference/post_companyid-banking-payments { "items": [  |
| Pagamentos e Transferências | Gerar recibo | GET | `{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}/receipt` | bearer |  |
| Pagamentos e Transferências | Cancelar um pagamento ou transferência agendado | DELETE | `{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}` | bearer |  |
| Pagamentos e Transferências | Cancelar pagamento ou transferência pendente de aprovação | DELETE | `{{baseUrl}}/{{companyId}}/banking/payments/approvals/{{paymentId}}` | bearer |  |
| Pagamentos e Transferências | Listar um pagamento ou transferência específico | GET | `{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}` | bearer |  |
| Pix Cobrança / Locations | Criar QR code | POST | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations` | bearer | { "type":"cob", "description":"Exemplo de descrição" } |
| Pix Cobrança / Locations | Obter Lista de QR Codes | GET | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations` | bearer |  |
| Pix Cobrança / Locations | Desvincular cobrança de QR code | DELETE | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations/{{locationId}}` | bearer |  |
| Pix Cobrança / Instant collections | Criar cobrança | POST | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections` | bearer | { "pixKey":"exemplo-de-chave-pix", "amount": { "original": 1.1, "allowCustomerChangeValue": false } } |
| Pix Cobrança / Instant collections | Listar cobranças | GET | `{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections?locationId` | bearer |  |
| Saldo e Extrato | Listar extrato | GET | `{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/statements?startDate={{startDate}}&endDate={{endDate}}` |  |  |
| Saldo e Extrato | Listar dados da conta | GET | `{{baseUrl}}/{{companyId}}/banking/accounts` |  |  |
| Saldo e Extrato | Listar saldo | GET | `{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/balances` |  |  |
| Cobranças | Get all cobranças | GET | `{{basePath}}/{{companyId}}/banking/collections?pageSize=1&pageNumber=1` |  |  |
| Cobranças | Delete cobrança | DELETE | `{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}` |  |  |
| Cobranças | Post cobrança | POST | `{{basePath}}/{{companyId}}/banking/collections` |  | { "amount": 1, "type": "BANKSLIP", "dueDate": "2025-12-13", "overDueDate": "2025-12-15", "payer": { "name": "{{payerName}}", "personType": "J", "taxId": "{{payerTaxId}}" }, "account": { "number": "{{accountNumber}}", "br |
| Cobranças | Get a cobrança | GET | `{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}` |  |  |
| Cobranças | Update cobrança | PUT | `{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}` |  | { "amount":2, "dueDate":"2026-12-12", "overDueDate":"2026-12-20", "discounts":{ "limitDate":"2026-12-13", "type":"FIXED_VALUE", "value":1 }, "interest":{ "startDate":"2026-12-14", "type":"FIXED_VALUE", "value":1 }, "fine |
| Cobranças | Post batch | POST | `{{basePath}}/{{companyId}}/banking/collections/batch` |  | { "number": {{accountNumber}}, "branchCode": {{accountBranch}}, "collections": [ { "amount": 1, "type": "BANKSLIP", "dueDate": "2025-12-13", "overDueDate": "2025-12-15", "payer": { "name": "{{payerName}}", "personType":  |

## JSON estruturado

```json
[
  {
    "folder": "Pagamentos e Transferências",
    "name": "Listar iniciação de pagamento ou transferência",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Consulta barcodes",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments/barcodes?code={{barcode}}",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Criar uma iniciação de pagamento ou transferência",
    "method": "POST",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments",
    "authType": "bearer",
    "bodyMode": "raw",
    "bodyPreview": "//Este é um exemplo do pagamento de utilities //Para o body de outras modalidades de pagamento ou transferência visite: //https://developers.empresas.btgpactual.com/reference/post_companyid-banking-payments { \"items\": [ "
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Gerar recibo",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}/receipt",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Cancelar um pagamento ou transferência agendado",
    "method": "DELETE",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Cancelar pagamento ou transferência pendente de aprovação",
    "method": "DELETE",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments/approvals/{{paymentId}}",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pagamentos e Transferências",
    "name": "Listar um pagamento ou transferência específico",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/payments/{{paymentId}}",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pix Cobrança / Locations",
    "name": "Criar QR code",
    "method": "POST",
    "url": "{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations",
    "authType": "bearer",
    "bodyMode": "raw",
    "bodyPreview": "{ \"type\":\"cob\", \"description\":\"Exemplo de descrição\" }"
  },
  {
    "folder": "Pix Cobrança / Locations",
    "name": "Obter Lista de QR Codes",
    "method": "GET",
    "url": "{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pix Cobrança / Locations",
    "name": "Desvincular cobrança de QR code",
    "method": "DELETE",
    "url": "{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/locations/{{locationId}}",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Pix Cobrança / Instant collections",
    "name": "Criar cobrança",
    "method": "POST",
    "url": "{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections",
    "authType": "bearer",
    "bodyMode": "raw",
    "bodyPreview": "{ \"pixKey\":\"exemplo-de-chave-pix\", \"amount\": { \"original\": 1.1, \"allowCustomerChangeValue\": false } }"
  },
  {
    "folder": "Pix Cobrança / Instant collections",
    "name": "Listar cobranças",
    "method": "GET",
    "url": "{{baseUrl}}/v1/companies/{{companyId}}/pix-cash-in/instant-collections?locationId",
    "authType": "bearer",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Saldo e Extrato",
    "name": "Listar extrato",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/statements?startDate={{startDate}}&endDate={{endDate}}",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Saldo e Extrato",
    "name": "Listar dados da conta",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/accounts",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Saldo e Extrato",
    "name": "Listar saldo",
    "method": "GET",
    "url": "{{baseUrl}}/{{companyId}}/banking/accounts/{{accountId}}/balances",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Cobranças",
    "name": "Get all cobranças",
    "method": "GET",
    "url": "{{basePath}}/{{companyId}}/banking/collections?pageSize=1&pageNumber=1",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Cobranças",
    "name": "Delete cobrança",
    "method": "DELETE",
    "url": "{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Cobranças",
    "name": "Post cobrança",
    "method": "POST",
    "url": "{{basePath}}/{{companyId}}/banking/collections",
    "authType": "",
    "bodyMode": "raw",
    "bodyPreview": "{ \"amount\": 1, \"type\": \"BANKSLIP\", \"dueDate\": \"2025-12-13\", \"overDueDate\": \"2025-12-15\", \"payer\": { \"name\": \"{{payerName}}\", \"personType\": \"J\", \"taxId\": \"{{payerTaxId}}\" }, \"account\": { \"number\": \"{{accountNumber}}\", \"br"
  },
  {
    "folder": "Cobranças",
    "name": "Get a cobrança",
    "method": "GET",
    "url": "{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}",
    "authType": "",
    "bodyMode": "",
    "bodyPreview": ""
  },
  {
    "folder": "Cobranças",
    "name": "Update cobrança",
    "method": "PUT",
    "url": "{{basePath}}/{{companyId}}/banking/collections/{{collectionId}}",
    "authType": "",
    "bodyMode": "raw",
    "bodyPreview": "{ \"amount\":2, \"dueDate\":\"2026-12-12\", \"overDueDate\":\"2026-12-20\", \"discounts\":{ \"limitDate\":\"2026-12-13\", \"type\":\"FIXED_VALUE\", \"value\":1 }, \"interest\":{ \"startDate\":\"2026-12-14\", \"type\":\"FIXED_VALUE\", \"value\":1 }, \"fine"
  },
  {
    "folder": "Cobranças",
    "name": "Post batch",
    "method": "POST",
    "url": "{{basePath}}/{{companyId}}/banking/collections/batch",
    "authType": "",
    "bodyMode": "raw",
    "bodyPreview": "{ \"number\": {{accountNumber}}, \"branchCode\": {{accountBranch}}, \"collections\": [ { \"amount\": 1, \"type\": \"BANKSLIP\", \"dueDate\": \"2025-12-13\", \"overDueDate\": \"2025-12-15\", \"payer\": { \"name\": \"{{payerName}}\", \"personType\": "
  }
]
```
