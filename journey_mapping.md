# Mapeamento inicial da jornada de 17 passos

Este documento consolida o roteiro recebido e orienta a implementação dos dois aplicativos locais, **Personal dWallet** e **Business dWallet**. A proposta é permitir a execução operacional das APIs disponíveis por meio de telas em português, com identidade visual inspirada nos princípios do Design System gov.br, sem afirmar uso oficial de marca, autenticação ou chancela governamental.

| Passo | Aplicativo | Objetivo operacional | APIs previstas | Situação inicial |
|---:|---|---|---|---|
| 1 | Business dWallet | Empresa cria sua conta na plataforma DrumWave | Configuração IAM, token M2M, signup employee/business, login, OTP, criação de business entity e convite | Parcialmente disponível; criação e login disponíveis, OTP e convite podem depender de ambiente |
| 2 | Personal dWallet | Pessoa física cria sua carteira de dados pessoal | Configuração IAM, token M2M, signup person, login, OTP, perfil, reset de senha | Parcialmente disponível; signup, login e perfil disponíveis conforme testes anteriores |
| 3 | Business dWallet | Empresa consulta Standard Value Schemas | Listar schemas, consultar último schema por SID, schemas por dSKU | Parcialmente disponível conforme endpoints de catálogo/standard |
| 4 | Business dWallet | Empresa cadastra produtos e consulta catálogo | Listar produto, detalhar produto, produtos por empresa, criar/atualizar produto e categorias | Parcial; criação/atualização pode estar como API interna |
| 5 | Personal dWallet | Pessoa consulta produtos, schemas e empresas | Listar produtos, produto por ID, listar schemas, buscar empresas | Parcialmente disponível |
| 6 | Personal dWallet | Pessoa solicita dados de uma empresa | `POST /v1/data-request` | Disponível nos testes anteriores |
| 7 | Business dWallet | Empresa responde solicitação de dados | `GET /v1/data-request`, `PATCH /v1/data-request/:id` | Disponível nos testes anteriores quando usado o ID funcional correto |
| 8 | Personal dWallet | Pessoa consulta certificados associados | `GET /v1/wallet/certificates` | Marcado no roteiro como interno ou não externalizado |
| 9 | Business dWallet | Empresa consulta certificados associados | `GET /v1/wallet/certificates` | Marcado no roteiro como interno ou não externalizado |
| 10 | Personal dWallet | Pessoa consulta e adere a plano DSP | Blueprints por região, DSPs comerciais, detalhe, template, aplicação, sign-up | Parcialmente disponível conforme testes anteriores |
| 11 | Business dWallet | Empresa cria ofertas | Sem endpoint detalhado no roteiro | API faltante ou não documentada no roteiro |
| 12 | Personal dWallet | Pessoa visualiza ofertas disponíveis | Sem endpoint detalhado no roteiro | API faltante ou não documentada no roteiro |
| 13 | Personal dWallet | Pessoa aceita ou rejeita oferta | Sem endpoint detalhado no roteiro | API faltante ou não documentada no roteiro |
| 14 | Ambos | Pessoa e empresa visualizam extrato financeiro | Transações de wallet e fatura | Parcial; alguns endpoints internos ou dependem de dados financeiros de sandbox |
| 15 | Ambos | Pessoa ou empresa solicita resgate | Withdrawal, payment settled, payment failed | Marcado como interno no sumário de GAPs |
| 16 | Ambos | Cadastrar PIX/conta | Accounts onboarding | GAP indicado no roteiro; falta criar/externalizar |
| 17 | Ambos | Consultar histórico de resgates | Wallet events, payments por transaction ID | GAP indicado no roteiro; falta criar/externalizar |

## Diretriz de implementação

As telas serão construídas para completar a jornada visualmente e executar APIs reais sempre que houver endpoint disponível. Quando o roteiro indicar API interna, inexistente ou não documentada, a interface exibirá o passo, os dados necessários, o motivo da ausência e o impacto na jornada, sem simular chamada real como se fosse integração concluída.
