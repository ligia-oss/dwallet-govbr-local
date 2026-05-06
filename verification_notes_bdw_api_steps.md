# Verificação das etapas BdW separadas por APIs

Data: 2026-05-06

## Escopo verificado

As etapas da Business dWallet foram separadas para refletir explicitamente as funções solicitadas das APIs de **standard value schemas**, **produtos**, **DSP** e **CSP**. A navegação lateral do preview em `/business-govbr` passou a exibir as etapas separadas:

- Listar standard value schemas disponíveis
- Listar produtos disponíveis
- Listar DSP (Data Savings Plan)
- Listar CSP (Commercial Savings Plan)
- Ver detalhes do DSP
- Escolher DSP

## Evidências técnicas

- `pnpm test` executado com sucesso: **7 arquivos de teste aprovados, 65 testes aprovados**.
- `pnpm build` executado com sucesso, com aviso esperado de chunk acima de 500 kB do Vite, sem erro de compilação.
- Diagnóstico do ambiente: servidor de desenvolvimento em execução, TypeScript sem erros, LSP sem erros e dependências OK.

## Evidências visuais

A rota `https://3000-i9jv60e6uzvu23jtyg4ln-90db71d2.us2.manus.computer/business-govbr` foi aberta no preview. A navegação lateral apresentou as seis etapas separadas solicitadas dentro da jornada Business dWallet. A tela inicial continuou preservando o mockup operacional de celular e o painel de execução/evidências.

## Observação de modelo de jornada

O metadata Dataprev preserva a jornada canônica de 17 passos no backend, mas o passo 10 agora contém também a ação `step10_dsp_details`, permitindo demonstrar a chamada de detalhe do DSP sem inflar artificialmente a quantidade de passos canônicos da jornada.
