# dWallet GovBR — Jornada de Homologação DrumWave

Ferramenta de homologação da jornada de APIs DrumWave/Dataprev para as carteiras digitais Personal dWallet e Business dWallet.

## Funcionalidades

- Jornada de 18 passos (Passo 0 ao 17) com execução real das APIs Dataprev/DrumWave
- Mockup de celular emulando as telas do aplicativo gov.br para cada passo
- Campos editáveis por passo com propagação ao estado da jornada
- Indicador de progresso para passos com múltiplas ações sequenciais
- Aba de Variáveis com pasta de credenciais e resultados reutilizáveis entre passos
- Aba de Evidências com histórico sanitizado de execuções
- Proxy reverso para chamadas DrumWave via IP autorizado

## Como rodar localmente

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

## Variáveis de ambiente necessárias

| Variável | Descrição |
|---|---|
| DATAPREV_BASE_URL | URL base da sandbox DrumWave |
| DATAPREV_API_KEY | x-api-key da sandbox |
| DATAPREV_CLIENT_ID | Client ID para autenticação M2M |
| DATAPREV_CLIENT_SECRET | Client Secret para autenticação M2M |
| DATAPREV_PROXY_URL | (Opcional) URL do servidor proxy para chamadas via IP autorizado |

## Estrutura principal

```
client/src/pages/Homologacao.tsx                  <- Página principal (rota /)
client/src/components/HomologacaoPhoneMockup.tsx   <- Mockup de celular
client/src/lib/dataprevCredentials.ts              <- Persistência de credenciais e token M2M
server/dataprev.ts                                 <- Procedimentos tRPC para APIs Dataprev
server/btg.ts                                      <- Procedimentos tRPC para APIs BTG
server/_core/drumwaveProxy.ts                      <- Proxy reverso para API DrumWave
```
