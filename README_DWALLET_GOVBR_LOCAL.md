# Personal dWallet e Business dWallet locais

Este projeto implementa duas aplicações locais em português, **Personal dWallet** e **Business dWallet**, além de uma página inicial de jornada integrada. A interface usa padrões visuais inspirados no Design System gov.br, com cabeçalhos institucionais, contraste alto, foco acessível, linguagem cidadã, botões descritivos e trilha de status por etapa.

## Como rodar localmente

No diretório do projeto, execute:

```bash
pnpm install
pnpm dev
```

A aplicação sobe no servidor local gerenciado pelo template. As rotas principais são:

| Rota | Finalidade |
|---|---|
| `/` | Console integrado da jornada de 17 passos, com execução e evidências por ação. |
| `/personal` | Aplicativo Personal dWallet, com telas de pessoa física, carteira, ofertas, checkout, extrato e resgate. |
| `/business` | Aplicativo Business dWallet, com telas de colaborador, empresa, produtos, solicitações, ofertas e operações. |

## Variáveis de ambiente

As credenciais são usadas apenas no servidor. O frontend nunca recebe API key, client secret ou token de acesso. As variáveis necessárias são:

| Variável | Uso |
|---|---|
| `DATAPREV_BASE_URL` | Base URL da sandbox DrumWave/Dataprev. |
| `DATAPREV_API_KEY` | Chave de API usada pelo servidor local. |
| `DATAPREV_CLIENT_ID` | Client ID para token M2M. |
| `DATAPREV_CLIENT_SECRET` | Client secret para token M2M. |

## Escopo das aplicações

A **Personal dWallet** contém telas para cadastro da pessoa, login, carteira, solicitação de dados, planos DSP, ofertas e aceite, carrinho/checkout, extrato, resgate, PIX/conta bancária e histórico. A **Business dWallet** contém telas para cadastro do colaborador, login Business, cadastro empresarial, schemas, produtos, solicitações de dados, certificados, ofertas comerciais, carrinho/checkout Business e acompanhamento de operações.

Cada tela possui um botão de execução que chama uma ação tRPC no backend. O backend injeta credenciais, monta payloads com dados sintéticos, executa a API quando existe endpoint externo conhecido e retorna evidência sanitizada com requisição, resposta, HTTP status, atualizações de estado e mensagem operacional.

## Status da jornada de 17 passos

| Passo | Cobertura implementada | Observação |
|---|---|---|
| 1 | Business | Cadastro/login colaborador e criação de empresa. |
| 2 | Personal | Cadastro/login da pessoa. |
| 3 | Business | Consulta de schemas. |
| 4 | Business | Consulta/criação de produto conforme permissões da sandbox. |
| 5 | Personal | Consulta de catálogo/carteira. |
| 6 | Personal | Criação de data request quando há empresa disponível. |
| 7 | Business | Listagem de requests e aceite quando há request válido. |
| 8 | Personal | Consulta de certificados/dados da pessoa. |
| 9 | Business | Consulta de certificados empresariais quando autorizada. |
| 10 | Personal | Consulta de DSPs e criação de conta quando suportada. |
| 11 | Business/Personal | **API faltante** para criação/publicação externa de ofertas e carrinho. |
| 12 | Personal | Consulta de ofertas; aceite depende de `offerId` retornado/disponível. |
| 13 | Personal | Evidência de compra/aceite quando há oferta utilizável. |
| 14 | Personal/Business | Extrato parcial por conta DSP conhecida. |
| 15 | Personal/Business | **API interna/não externalizada** para resgate. |
| 16 | Personal/Business | **API faltante** para cadastro de PIX/conta bancária. |
| 17 | Personal/Business | **API faltante** para histórico externo de resgates. |

## Validação realizada

Foram executadas validações TypeScript, testes Vitest de contrato, credenciais e sanitização, além de validação visual das rotas `/personal` e `/business`. As evidências visuais estão registradas em `validacao_interface_local.md`.

```bash
pnpm exec tsc --noEmit --pretty false
pnpm test -- server/dataprev.router.test.ts server/dataprev.sanitize.test.ts server/dataprev.secrets.test.ts
```

## Observações de segurança

As evidências retornadas ao frontend passam por sanitização de cabeçalhos e campos sensíveis. Campos como `authorization`, `x-api-key`, `api_key`, `secret`, `clientSecret` e tokens JWT são substituídos por marcadores de redação antes de chegar à interface.
