# Mapeamento Postman — Código de Verificação

A coleção `DrumWave Platform API — Dataprev Sandbox` informa que os fluxos de criação de Business dWallet e Personal dWallet possuem etapas explícitas de envio e confirmação de código de verificação por e-mail, posicionadas após o cadastro e antes do login.

| Fluxo | Etapa Postman | Método | Endpoint | Headers relevantes | Body |
|---|---|---:|---|---|---|
| Business | 1b. Send email verification code | POST | `/v1/auth/token/iam/idp/users/send-code` | `x-api-key`, `Authorization: Bearer {{m2m_token}}`, `Content-Type: application/json`, `Accept-Language: pt-br` | `{ "value": "{{employee_email}}", "attribute": "email" }` |
| Business | 1c. Confirm email verification | POST | `/v1/auth/token/iam/idp/users/verify-code` | `x-api-key`, `Authorization: Bearer {{m2m_token}}`, `Content-Type: application/json` | `{ "attribute": "email", "value": "{{employee_email}}", "code": "{{employee_verification_code}}", "refreshToken": "", "secretHash": "{{employee_secret_hash}}", "clientId": "{{app_client_id}}" }` |
| Personal | 2b. Send email verification code | POST | `/v1/auth/token/iam/idp/users/send-code` | `x-api-key`, `Authorization: Bearer {{m2m_token}}`, `Content-Type: application/json`, `Accept-Language: pt-br` | `{ "value": "{{person_email}}", "attribute": "email" }` |
| Personal | 2c. Confirm email verification | POST | `/v1/auth/token/iam/idp/users/verify-code` | `x-api-key`, `Authorization: Bearer {{m2m_token}}`, `Content-Type: application/json` | `{ "attribute": "email", "value": "{{person_email}}", "code": "{{person_verification_code}}", "refreshToken": "", "secretHash": "{{person_secret_hash}}", "clientId": "{{app_client_id}}" }` |

O `secretHash` é calculado no script pré-requisição do Postman como `Base64(HMAC_SHA256(email + clientId, clientSecret))`. No aplicativo, esse cálculo deve ocorrer exclusivamente no servidor para não expor `clientSecret` ao frontend. As respostas e evidências exibidas na interface devem ser sanitizadas para não revelar token M2M, API key, client secret, secretHash bruto nem códigos sensíveis além do valor informado pelo operador quando necessário.
