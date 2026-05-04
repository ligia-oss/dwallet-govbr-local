# Validação de interface local

A validação visual foi realizada no servidor de desenvolvimento local exposto pela plataforma em 2026-05-04. A rota `/personal` carregou a experiência dedicada **Personal dWallet**, com navegação própria, telas de cadastro, login, carteira, solicitação de dados, planos DSP, ofertas, checkout, extrato, resgate, PIX/conta bancária e histórico. A página apresentou formulários por tela, botões de execução de API, campos de evidência de requisição/resposta e estados visuais em português, incluindo **pendente** e **API ausente**.

A rota `/business` carregou a experiência dedicada **Business dWallet**, com navegação própria, telas de cadastro do colaborador, login Business, cadastro empresarial, schemas, produtos, solicitações de dados, certificados, ofertas comerciais, checkout Business e acompanhamento de operações. A página apresentou os mesmos padrões de formulários, botões de execução, evidências sanitizadas e estados visuais em português.

| Rota | Resultado observado | Captura |
|---|---|---|
| `/personal` | Aplicação carregada com navegação lateral, formulário de e-mail, ações executáveis e status por tela. | `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_19-34-33_4811.webp` |
| `/business` | Aplicação carregada com navegação lateral, formulário empresarial, ações executáveis e status por tela. | `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_19-34-42_5301.webp` |

A página inicial também foi verificada pelo diagnóstico do ambiente e mostrou o console integrado da jornada de 17 passos. A captura correspondente está em `/home/ubuntu/screenshots/webdev-preview-1777937666.png`.

## Execução real via frontend

Também foi executada uma ação real a partir da rota `/business`, usando o botão **Executar ação desta tela** da tela **Cadastro do colaborador**. O fluxo frontend → tRPC → servidor → sandbox retornou HTTP 201 para `POST /v1/employee/signup`, atualizou o status visual para **concluído** e exibiu a resposta com `tokens` substituído por `<REDACTED>`, confirmando a sanitização antes da renderização no navegador.

| Rota | Tela | Resultado | Captura |
|---|---|---|---|
| `/business` | Cadastro do colaborador | HTTP 201, status visual concluído e token redigido. | `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_19-35-38_7040.webp` |
