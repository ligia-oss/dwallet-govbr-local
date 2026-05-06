# Verificação visual — botões em duas linhas

Data: 2026-05-06

Foi aberta a rota de preview `/business-govbr` e, em seguida, a aba **Credenciais**. O primeiro bloco exibido é **Credenciais e chaves**. Na captura de tela do preview, o botão **Gerar M2M token** aparece com quebra de linha entre `Gerar M2M` e `token`, dentro do container lateral do bloco. O botão **Limpar Dataprev** também permanece renderizado em duas linhas, com `Limpar` e `Dataprev` separados por quebra de linha.

Validações executadas antes desta verificação: `pnpm test` com 63 testes aprovados e `pnpm build` aprovado. O status do projeto reportou servidor em execução, dependências OK e ausência de erros de LSP/TypeScript.
