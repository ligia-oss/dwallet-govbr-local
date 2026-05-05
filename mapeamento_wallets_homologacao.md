# Mapeamento das wallets em homologação

## Achados iniciais em telas públicas

| Aplicação | URL | Elementos visíveis | Direção visual observada | Arquivo de screenshot |
|---|---|---|---|---|
| Personal dWallet | https://br.personal.drumwave.me/ | Botões “Criar minha dWallet” e “Login”; marca “dWallet Personal”; chamada “SE É MEU. EU QUERO.”; subtítulo “Seu Futuro é Mais Rico com Dados.” | Landing page full-screen com imagem fotográfica de pessoas, fundo escuro, partículas, CTA primário branco e CTA secundário escuro contornado. | /home/ubuntu/screenshots/br_personal_drumwave_2026-05-04_19-52-18_1465.webp |
| Business dWallet | https://br.business.drumwave.me/ | Botões “Criar Business dWallet”, “Login” e link “Ir para a Personal dWallet”; marca “dWallet Business”; chamada “DADOS RENDEM. RESULTADOS CRESCEM.”; subtítulo “Seu Negócio. Sua Estratégia. O Valor dos Seus Dados.” | Landing page full-screen com imagem fotográfica de varejo/negócio, fundo escuro, partículas, CTA primário branco, CTA secundário escuro contornado e link cruzado para Personal. | /home/ubuntu/screenshots/br_business_drumwave_2026-05-04_19-52-35_5821.webp |

## Implicações para os novos front-ends GovBR

Os novos front-ends devem preservar a separação entre **Personal dWallet** e **Business dWallet**, mas substituir a linguagem visual proprietária por um padrão governamental brasileiro: cabeçalho institucional, azul gov.br como cor estruturante, amarelo/verde como acentos moderados, alto contraste, foco visível, textos objetivos em português e navegação clara de serviço público digital. As telas públicas devem manter chamadas equivalentes, porém com vocabulário de carteira de dados e transparência de uso de APIs.

## Próximos pontos a mapear

É necessário acessar os fluxos de cadastro e login para identificar menus internos, telas autenticadas, formulários, estados vazios, módulos de carteira, dados, ofertas, solicitações e configurações. Como isso envolve submissão de formulários em serviço externo, a criação de contas de teste deve ser confirmada antes de enviar dados.

## Cadastro Personal dWallet — etapa 1 observada

| Etapa | URL observada | Tela | Campos/Ações | Observações de UX |
|---|---|---|---|---|
| 1 | https://br.personal.drumwave.me/enter-name | Identificação do usuário | Campo “Nome”, campo “Sobrenome”, botão “Continuar” e botão de voltar | Tela em fundo escuro, ícone de usuário, formulário centralizado, texto auxiliar “Isso nos ajuda a personalizar a sua experiência”. |

Ainda não houve submissão de criação de conta. Para avançar pelas etapas de cadastro e criar logins de homologação, será necessária confirmação explícita dos dados sintéticos a serem enviados.

## Cadastro Personal dWallet — etapa 2 observada

| Etapa | URL observada | Tela | Campos/Ações | Observações de UX |
|---|---|---|---|---|
| 2 | https://br.personal.drumwave.me/enter-info | Captura de e-mail e estado | Campo “Email”, seletor “Estado onde você mora”, botão “Continuar” e botão de voltar | A tela informa “Certo! Agora precisamos de um e-mail” e explica que o e-mail ajuda a verificar identidade e solicitar dados. O campo de estado aparece como combobox, indicando lista de UF/estado. |

Dados sintéticos já usados na etapa anterior: nome “Usuário GovBR” e sobrenome “Teste”, conforme confirmação do usuário.

### Dropdown de estado no cadastro Personal

A lista de estado do cadastro Personal foi aberta e apresenta opções em português, incluindo Acre, Alagoas, Amapá, Amazonas, Bahia, Ceará, Distrito Federal, Espírito Santo, Goiás, Maranhão, Mato Grosso, Mato Grosso do Sul, Minas Gerais, Pará, Paraíba, Paraná, Pernambuco, Piauí, Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul, Rondônia, Roraima, Santa Catarina, São Paulo, Sergipe e Tocantins. Para o teste sintético, será usado **São Paulo**.

### Observação operacional no cadastro Personal

Após preencher o e-mail sintético e selecionar **São Paulo**, o botão “Continuar” permaneceu visível na mesma rota `/enter-info` depois da primeira tentativa de avanço. Isso pode indicar validação assíncrona, bloqueio temporário, necessidade de foco/teclado, erro não visível ou restrição do domínio de e-mail usado. O estado será reavaliado antes de prosseguir para evitar submissões repetidas.

### Diagnóstico da permanência na etapa de e-mail Personal

Após rever a tela e consultar o console do navegador, não foi exibida mensagem textual de erro nem log de console visível. A tela continuou na rota `/enter-info` com e-mail e estado preenchidos. O próximo passo será testar interação por teclado e, se necessário, mapear o fluxo via login/cadastro alternativo ou registrar a limitação como bloqueio de homologação.

### Interação por teclado no cadastro Personal

Ao pressionar Enter, o foco abriu a lista de estados em vez de submeter o formulário. Ao pressionar Escape, a lista foi fechada e o botão “Continuar” voltou a ficar disponível como índice interativo. Isso confirma que o seletor de estado retém foco e pode exigir fechamento explícito antes da submissão.

## Cadastro Personal dWallet — etapa 3 observada

| Etapa | URL observada | Tela | Campos/Ações | Observações de UX |
|---|---|---|---|---|
| 3 | https://br.personal.drumwave.me/password | Definição de senha | Campos “Senha” e “Confirmar Senha”, ícones de exibição/ocultação, checkbox de aceite de Termos e Condições e Política de Privacidade, botão “Continuar” | A tela orienta criar senha forte com pelo menos 12 caracteres, incluindo letras, números e caracteres especiais. Há validação visual próxima ao campo de senha, área de aceite e links para termos/política. |

Senha sintética preenchida conforme confirmação: `GovBR@Teste2026!`.

### Bloqueio observado na submissão de senha Personal

Após preencher senha e confirmação com `GovBR@Teste2026!`, marcar o checkbox de aceite e clicar em “Continuar”, a aplicação permaneceu em `/password`. Visualmente, o checkbox apareceu marcado, mas a tela exibiu indicação residual “Faltam 0 caracteres” junto ao campo de senha e não houve navegação automática para a próxima etapa. Será feita verificação de console/rede e tentativa controlada com senha alternativa mais simples, sem expor dados reais.

## Cadastro Personal dWallet — etapa 4 observada

| Etapa | URL observada | Tela | Campos/Ações | Observações de UX |
|---|---|---|---|---|
| 4 | https://br.personal.drumwave.me/email-verification | Confirme seu e-mail | Seis campos para código numérico, botão “Não recebi um código! Reenviar”, botão “Confirmar” e navegação de retorno | A criação de conta avançou efetivamente após a etapa de senha. O fluxo agora exige OTP enviado ao e-mail `govbr.personal.teste.7938215717@example.com`. Como esse domínio não oferece caixa postal acessível, a navegação interna autenticada fica bloqueada até obter código ou usar e-mail de teste com inbox acessível. |

Observação: a suspeita inicial de bloqueio na senha foi descartada; a aplicação navegou para `/email-verification` após o processamento da submissão.

### Reinício do cadastro Personal com e-mail verificável

Para superar o bloqueio de OTP em `example.com`, foi criada uma caixa postal descartável controlada em `govbrpersonal7938215717@deltajohnsons.com`. O fluxo Personal foi reiniciado em `/enter-name`, mantendo a mesma estrutura observada: campos `Nome`, `Sobrenome`, botão “Continuar” e botão de retorno. O objetivo é concluir a verificação e mapear as telas autenticadas internas, conforme solicitado.

### Cadastro Personal com e-mail verificável — etapas repetidas

| Etapa | URL observada | Elementos confirmados | Observação |
|---|---|---|---|
| Identificação | `/enter-name` | Campo `Nome`, campo `Sobrenome`, botão “Continuar” | Preenchido com dados sintéticos e avanço bem-sucedido. |
| E-mail e Estado | `/enter-info` | Campo `Email`, seletor “Estado onde você mora”, botão “Continuar” | Tela mantém a mesma estrutura já observada. Será preenchida com `govbrpersonal7938215717@deltajohnsons.com` para viabilizar OTP. |

### Cadastro Personal — lista de UF com e-mail verificável

Na etapa `/enter-info`, o e-mail verificável `govbrpersonal7938215717@deltajohnsons.com` foi inserido com sucesso. O seletor de estado apresenta a lista completa de UFs em ordem alfabética, incluindo Acre, Alagoas, Amapá, Amazonas, Bahia, Ceará, Distrito Federal, Espírito Santo, Goiás, Maranhão, Mato Grosso, Mato Grosso do Sul, Minas Gerais, Pará, Paraíba, Paraná, Pernambuco, Piauí, Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul, Rondônia, Roraima, Santa Catarina, São Paulo, Sergipe e Tocantins. A próxima ação será selecionar São Paulo e prosseguir para senha/OTP.

### Cadastro Personal — seleção de UF aceita

A opção `São Paulo` foi selecionada com sucesso no seletor de UF, e a tela permaneceu em `/enter-info` com e-mail e estado preenchidos. A primeira tentativa de avançar após a seleção não mudou a rota; este comportamento já havia ocorrido anteriormente e pode estar relacionado a foco/estado do componente. Será feita nova tentativa de submissão após atualização da visão/interação de teclado, preservando a evidência de que não houve erro visível nessa tela.

### Cadastro Personal — etapa de senha com e-mail verificável

Após limpar o foco do seletor e clicar novamente em “Continuar”, o cadastro avançou de `/enter-info` para `/password`. A tela de senha contém campo `Senha`, campo `Confirmar Senha`, botões de exibição/ocultação da senha, checkbox de aceite, link/modal `Termos e Condições`, link `Política de Privacidade` e botão “Continuar”. A senha deve ter pelo menos 12 caracteres, incluindo letras, números e caracteres especiais.

### Cadastro Personal — senha e aceite

A etapa `/password` foi preenchida com a senha sintética confirmada. Após o preenchimento, a interface exibiu indicação de requisito pendente junto ao campo de senha (“Faltam 0 caracteres”), mas permitiu manter o valor informado. O checkbox de aceite dos Termos e Condições/Política de Privacidade foi marcado com sucesso, preparando a submissão de criação da conta sintética autorizada.

### Cadastro Personal — verificação de e-mail

A submissão da conta sintética Personal avançou para `/email-verification`. A tela solicita um código OTP de 6 dígitos enviado para `govbrpersonal7938215717@deltajohnsons.com`, apresenta seis campos individuais de entrada, indicação de reenvio com contagem regressiva e botão “Confirmar”. Esta tela representa uma etapa interna de segurança do onboarding que deve ser reproduzida no front-end GovBR.

### Cadastro Personal — conclusão da verificação e foto de perfil

O código OTP recebido na caixa descartável foi preenchido e confirmado com sucesso. A aplicação avançou para `/profile-picture`, tela de onboarding para atualizar foto. Elementos observados: botão de voltar, título “Atualize sua foto”, avatar circular com inicial do usuário, nome `Usuário GovBR Teste`, descrição de upload, botão secundário/contornado “Adicionar foto” e botão primário claro “Agora não”. Para o front-end GovBR, esta etapa deve aparecer como configuração opcional de perfil, com opção de pular o envio de imagem.

### Personal — pré-verificação e início da verificação de identidade

Após pular o upload de foto, a aplicação avançou para `/pre-verify`, com mensagem “Só mais um passo importante”, explicação de proteção de dados, referência à DrumWave, link de suporte `suporte@drumwave.com` e botão “Verificação de Identidade”. Ao acionar o botão, a rota mudou para `/verify`, exibindo estado de carregamento com a mensagem “Retomando verificação...” e spinner central. A tela possui rolagem vertical e indica provável integração com provedor externo de KYC/identidade, que deve ser representada no front-end GovBR como etapa de validação cadastral/identidade.

### Personal — provedor Persona sandbox

A rota `/verify` incorporou um fluxo Persona em ambiente sandbox. Primeiro foi exibido um aviso em inglês “You are in a Sandbox environment”, explicando que os resultados são simulados e que não se deve inserir informações pessoais reais. A tela inicial apresenta ícone central de identidade, texto de consentimento sobre coleta/processamento biométrico, link para Política de Privacidade, botão “Iniciar Verificação”, selo “Secured with Persona” e alternância “Pass verification” visível no canto inferior. Após iniciar, a tela passou para seleção de país, com dropdown “Selecione um país” pré-preenchido com Brasil e botão “Selecionar”. Para o front-end GovBR, essa etapa deve ser modelada como verificação de identidade assistida, sem solicitar documentos reais no protótipo local.

### Personal — seleção de documento no Persona sandbox

Após selecionar Brasil, o provedor exibiu opções de documento: “Carteira de motorista digital”, “Carteira de motorista” e “Carteira de identidade”, com botão “Continuar”. Ao escolher “Carteira de identidade”, a próxima tela apresentou duas alternativas: “Enviar arquivos” e “Continuar em outro dispositivo”. Como o objetivo é mapear telas e não enviar documento real, esta etapa foi documentada como barreira externa de KYC. No front-end GovBR local, a tela deve expor a verificação de identidade como etapa de fluxo, com indicação clara de que a homologação real depende do provedor de identidade e de documentos simulados/autorizados.

Após tentativa de fechar ou contornar o componente Persona, a aplicação permaneceu na tela de upload/continuação em outro dispositivo. O acesso às telas internas da Personal dWallet fica bloqueado pela verificação de identidade sandbox quando não há envio de documento ou conclusão do KYC. Essa limitação deve ser representada no novo front-end GovBR como etapa obrigatória de validação de identidade antes da carteira interna.

### Business — tela pública e cadastro inicial

A tela pública da Business dWallet usa imagem de fundo em mercado/comércio, marca “dWallet Business”, chamada “Dados rendem. Resultados crescem.” e subtítulo “Seu Negócio. Sua Estratégia. O Valor dos Seus Dados.”. A navegação inicial contém botões “Criar Business dWallet”, “Login” e link “Ir para a Personal dWallet”. O cadastro inicia em `/enter-name` com tela “Identificação do usuário”, botão de voltar, campos “Nome” e “Sobrenome” e botão “Continuar”.

No cadastro Business, após nome e sobrenome, a aplicação direciona para `/enter-email` com a pergunta “Qual seu e-mail corporativo?”, texto explicativo sobre verificação de identidade e proteção de ativos empresariais, campo “E-mail corporativo” com placeholder `nome@empresa.com.br` e botão “Continuar”.

A etapa `/password` da Business dWallet apresenta o título “Defina a sua senha”, instrução para senha forte com pelo menos 12 caracteres incluindo letras, números e caracteres especiais, campos “Senha” e “Confirme a senha”, botões de visibilidade, aceite obrigatório de “Termos e Condições” e “Política de Privacidade”, além do botão “Continuar”.

No cadastro Business, os campos de senha e confirmação foram preenchidos com a senha sintética autorizada. O aceite de termos foi acionado no checkbox `terms-conditions`; visualmente a tela permaneceu na etapa `/password`, preservando o botão “Continuar” para submissão da criação da conta.

A criação da conta Business avançou para `/email-verification`. A tela apresenta o título “Confirme seu e-mail”, instrução informando que o código foi enviado ao e-mail corporativo cadastrado, seis campos de OTP, ação “Não recebi um código! Reenviar” e botão “Verificar”.

Na verificação de e-mail Business, o OTP recuperado da caixa descartável foi preenchido nos seis campos e a ação “Verificar” foi acionada. A interface passou a exibir estado de carregamento no botão de confirmação, indicando submissão da validação do código.

Após validar o OTP Business, a aplicação redirecionou para `/enter-business-information`. Esta primeira tela interna de onboarding empresarial solicita carregar logo da empresa, nome da empresa, CNPJ, CEP, endereço, informações adicionais, cidade, estado, telefone da empresa e cargo do usuário, com botão “Próximo”. A tela informa: “Para começar, precisamos verificar as informações da sua empresa”.

A etapa Business `/enter-business-information` foi preenchida com dados sintéticos de homologação: Empresa GovBR Teste, CNPJ de teste, CEP 01001-000, endereço Praça da Sé, complemento Sala 101, cidade São Paulo, estado São Paulo, telefone de teste e cargo Administrador. O botão “Próximo” permaneceu visível ao final da tela.

Após enviar as informações empresariais, a Business dWallet exibiu `/pre-verify` com a mensagem “Agora vamos confirmar sua identidade” e explicou que a conta foi criada, mas o usuário ainda não foi confirmado como responsável pela empresa. A ação “Confirmação de Identidade” levou para `/verify`, onde a tela apresentou estado “Retomando verificação...”, indicando o mesmo tipo de etapa KYC externa observada na Personal.

No fluxo KYC Business `/verify`, o provedor Persona sandbox exibiu aviso de ambiente de testes e a ação “Iniciar Verificação”. Após iniciar, apareceu o seletor de país com Brasil disponível e botão “Selecionar”. O controle “Pass verifications” estava visível no rodapé do iframe, indicando possibilidade de aprovação sandbox sem documentos reais.

Após selecionar Brasil no KYC Business, o Persona sandbox exibiu opções de documento: Carteira de motorista digital, Carteira de motorista e Carteira de identidade. Ao escolher Carteira de identidade, a tela passou para uma confirmação com opções “Carteira de Motorista” e “Carteira de Identidade”, mantendo o controle “Pass verifications” ativo no rodapé.

A etapa KYC Business avançou até a tela de envio de documento, com botões “Enviar arquivos” e “Continuar em outro dispositivo”. Foi tentado acionar o controle sandbox “Pass verifications” sem upload de documentos reais; o controle pertence ao iframe Persona e não foi exposto como elemento clicável normal da página hospedeira, portanto o mapeamento autenticado ficou documentado até essa etapa de bloqueio KYC.

A análise estática dos bundles públicos indicou telas e rótulos internos adicionais além do bloqueio KYC: painel de Data Savings Plan, criação de Plano Poupança de Dados, detalhes do plano, adesão a plano, configuração de contribuições de dados, conexão de datasets/databases, criação de produtos, carrinho, checkout, transações de campanha, gestão de ofertas, status de planos, remoção de produtos do carrinho, renovação automática, metas de ganho e explicações sobre como a Personal dWallet gera valor. Esses elementos serão usados como base para reproduzir os front-ends GovBR, com observação de que a navegação visual autenticada real ficou limitada pelo KYC Persona sem envio de documento real.
