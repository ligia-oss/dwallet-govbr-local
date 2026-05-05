# Auditoria de telas emuladas PdW e BdW

Autor: **Manus AI**  
Data: **2026-05-05**

A auditoria confirma que a página atual já possui um componente de celular e campos editáveis, mas ainda prioriza a lógica de teste de API. Para atender ao requisito de que a experiência pareça a do próprio usuário do aplicativo, o redesenho deve inverter a hierarquia visual: primeiro uma tela de aplicativo móvel real, depois a evidência técnica sanitizada como confirmação secundária.

| Área atual | Problema percebido | Padrão-alvo |
|---|---|---|
| Cabeçalho do telefone | Usa “App dWallet” e status técnico como elemento principal. | Usar cabeçalho semelhante a app real: saudação, nome da carteira, ícones de segurança/notificação e status discreto. |
| Formulários | Campos aparecem como cartões de leitura, não como inputs reais de app. | Exibir inputs com rótulos, placeholders, ajuda contextual, botões primários e estados de validação em português. |
| Respostas de API | A resposta aparece como “Tela de resposta do app”, mas ainda com linguagem de teste. | Transformar resposta em confirmação de app: conta criada, código enviado, pagamento iniciado, QR Pix criado, extrato atualizado. |
| Jornada Personal | Algumas telas usam blocos genéricos e não possuem `appEmulation` dedicado. | Dar copy e estrutura visual própria para entrada, OTP, KYC, painel, solicitações, planos, ofertas, checkout, extrato e configurações. |
| Jornada Business | As telas de criação de empregado e empresa já estão mais próximas, mas faltam telas financeiras BTG. | Adicionar/ajustar telas de saldo, extrato, Pix, cobrança, pagamento e comprovante com padrão bancário empresarial. |
| Passo 0 M2M | Já está separado, mas a tela do app ainda menciona dependências técnicas em alguns `footerNote`. | Remover linguagem de dependência técnica das telas finais e manter detalhes em painel técnico separado. |

## Padrão de aplicativo real a implementar

O novo padrão de tela deve parecer um celular com área de status, cabeçalho gov.br, conteúdo principal e rodapé de ação. As telas de entrada devem mostrar formulários reais; as telas financeiras devem mostrar cartões de saldo, lista de transações, recibos e QR/cobranças; as telas de resposta devem mostrar mensagens finais orientadas ao usuário.

| Tipo de tela | Componentes esperados |
|---|---|
| Cadastro e login | Título curto, descrição simples, campos editáveis, ajuda de privacidade, botão de continuar, link de voltar/reenviar quando aplicável. |
| OTP | Seis dígitos como campo de código, e-mail mascarado no texto, botão de confirmar e opção de reenviar. |
| Dashboard | Saudação, cartão de saldo/privacidade, ações rápidas, solicitações recentes e alertas de consentimento. |
| Pix e cobrança | Valor, chave Pix, descrição, QR/identificador de cobrança e botão de compartilhar/copiar quando houver resposta. |
| Pagamento | Linha digitável/código de barras, valor, data, conta de débito, revisão antes de confirmar e comprovante sanitizado. |
| Extrato | Filtro de período, saldo, lista de lançamentos com tipo, data e valor, além de estado vazio. |

## Critério de aceite visual

A tela deve ser compreensível
 para uma pessoa usuária sem conhecimento de API. O usuário deve conseguir preencher o que informaria no aplicativo real, acionar a ação principal e ver uma resposta com linguagem de produto. A evidência de API precisa permanecer acessível e sanitizada, mas não deve dominar a tela emulada.

| Critério | Validação esperada |
|---|---|
| Experiência de usuário final | As telas usam linguagem como “Criar conta”, “Confirmar e-mail”, “Pagar conta”, “Receber Pix” e “Ver extrato”, não termos como endpoint, payload ou token. |
| Identidade gov.br | Cores, contrastes, cabeçalho e tom visual preservam azul gov.br, amarelo de destaque e cartões claros com foco acessível. |
| Campos reais | Os dados editáveis aparecem dentro da tela de celular como inputs, não apenas como cards informativos. |
| Resposta de API | Após executar, o retorno aparece como confirmação de aplicativo e, separadamente, como JSON sanitizado para teste. |
| Segurança | Tokens, senhas, hashes e segredos nunca aparecem crus na interface. |
| Separação técnica | O Passo 0 M2M e diagnósticos de sandbox continuam fora da experiência do usuário final. |
