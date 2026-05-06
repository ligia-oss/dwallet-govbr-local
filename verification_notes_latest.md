# Verificação das edições visuais recentes da Business dWallet

Data: 2026-05-06.

A rota `/business-govbr` foi revisada no preview local após a edição visual e a consolidação manual em `client/src/pages/GovBRWalletApp.tsx`. A navegação lateral exibe **Extrato BdW** e **Configurações BdW**. A tela inicial da jornada exibe **Cadastro de funcionário**, com a descrição **Tela inicial da jornada BdWallet® em que o empregado responsável cria a própria conta antes de abrir a carteira de dados da empresa.** A instrução operacional também foi atualizada para **Use o mockup de celular abaixo como área principal de teste.**

O componente e a suíte `server/govbr.wallet.ui.test.ts` foram verificados por busca textual. Os textos antigos correspondentes não permanecem no componente principal, e a cobertura automatizada agora exige os novos rótulos e rejeita os rótulos antigos. Validações executadas: `pnpm test` com 64 testes aprovados, `pnpm build` aprovado e verificação de status sem erros de LSP/TypeScript.
