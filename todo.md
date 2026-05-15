# Project TODO

- [x] Mapear a jornada de 17 passos do roteiro anexado para telas, ações de usuário e APIs correspondentes.
- [x] Registrar APIs ausentes ou não executáveis por passo da jornada, com motivo e impacto.
- [x] Criar estrutura de aplicação com duas experiências: Personal dWallet e Business dWallet.
- [x] Aplicar identidade visual e padrões de UX em português alinhados ao Design System gov.br.
- [x] Implementar página inicial institucional com entrada para Personal dWallet, Business dWallet e jornada de testes.
- [x] Implementar telas da Personal dWallet necessárias para cadastro, login, carteira, solicitações de dados, aceite, ofertas, carrinho, checkout, extrato e resgate.
- [x] Implementar telas da Business dWallet necessárias para cadastro empresarial, login, produtos, planos, ofertas, solicitações de dados, carrinho, checkout e acompanhamento de operações.
- [x] Criar camada segura no servidor para execução das APIs externas sem expor credenciais no frontend.
- [x] Adicionar configuração segura de ambiente para base URL, API key, client id e client secret da sandbox.
- [x] Integrar botões e formulários das telas aos endpoints das APIs correspondentes.
- [x] Exibir inputs enviados e respostas recebidas de forma sanitizada em cada etapa da jornada.
- [x] Criar trilha visual da jornada de 17 passos com status pendente, executando, concluído, falhou ou API ausente.
- [x] Implementar fallback simulado/registrado apenas para APIs identificadas como ausentes, deixando explícito que não houve chamada real.
- [x] Criar testes Vitest para mapeamento da jornada, sanitização de segredos e camada de execução de APIs.
- [x] Executar verificação de tipos, testes automatizados e validação de interface local.
- [x] Criar documentação de uso local, variáveis necessárias, escopo implementado e APIs faltantes.
- [x] Salvar checkpoint final do projeto após validação.
- [x] Adicionar tela/fluxo de planos na Business dWallet e conectá-lo aos endpoints de DSP/planos aplicáveis.
- [x] Adicionar validação de formulários e estados de erro visíveis na UI para falhas de mutation ou rede.
- [x] Criar testes Vitest para execução de ações Dataprev cobrindo sucesso/lacuna, falha e atualização/sanitização do estado.
- [x] Mapear telas, navegação e experiências autenticadas dos ambientes Personal e Business DrumWave informados pelo usuário.
- [x] Criar contas de teste nos ambientes Personal e Business somente após confirmação do usuário para submissão dos formulários externos.
- [x] Registrar achados de navegação, telas, menus, formulários e fluxos em arquivo de evidência antes de implementar.
- [x] Criar dois novos front-ends separados: Personal dWallet GovBR e Business dWallet GovBR, inspirados nas telas homologadas e com identidade visual governamental brasileira.
- [x] Implementar navegação própria de carteira digital para Personal dWallet GovBR com dashboard, dados, solicitações, ofertas, carteira, extrato e configurações conforme mapeamento.
- [x] Implementar navegação própria de carteira digital para Business dWallet GovBR com dashboard, empresa, produtos, planos, ofertas, solicitações de dados, carrinho, checkout e acompanhamento de operações.
- [x] Conectar ações das novas telas aos procedimentos Dataprev existentes quando houver API executável e registrar lacunas onde não houver API.
- [x] Validar responsividade, acessibilidade visual, TypeScript, testes Vitest e salvar novo checkpoint da entrega.
- [x] Mapear campos de cadastro e login das duas aplicações antes de submeter dados de teste em homologação.
- [x] Criar conta de homologação Personal dWallet com dados sintéticos aprovados pelo usuário e registrar credenciais usadas apenas para navegação de teste.
- [x] Criar conta de homologação Business dWallet com dados sintéticos aprovados pelo usuário e registrar credenciais usadas apenas para navegação de teste.
- [x] Navegar pelas áreas internas autenticadas das duas aplicações e documentar menus, dashboards, formulários, telas vazias, telas de dados, telas financeiras e jornadas de operação.
- [x] Reproduzir nos novos front-ends GovBR as telas internas mapeadas, além das telas públicas já observadas.
- [x] Executar e registrar validação verificável de responsividade e acessibilidade das rotas GovBR em breakpoints principais, navegação por teclado, foco e contraste visual básico.
- [x] Registrar explicitamente que as áreas internas pós-KYC foram inferidas por análise de bundles públicos e pela jornada de APIs, não navegadas autenticamente além do bloqueio Persona.
- [x] Salvar novo checkpoint final da versão GovBR após validação concluída.
- [x] Executar e registrar validação verificável de navegação por teclado nas rotas GovBR, incluindo ordem de tabulação, ativação por Enter/Espaço e foco visível.
- [x] Executar e registrar checagem básica de contraste visual e foco das áreas principais das rotas GovBR.
- [x] Executar e registrar teste verificável de teclado real nas rotas `/personal-govbr` e `/business-govbr`, cobrindo Tab/Shift+Tab, ordem real de foco e ativação por Enter/Espaço dos controles principais.
- [x] Executar e registrar teste real com Shift+Tab nas rotas `/personal-govbr` e `/business-govbr`, documentando a ordem real de foco reversa.
- [x] Executar e registrar ativação real por Enter e por Espaço nos controles principais de ambas as rotas GovBR.
- [x] Salvar checkpoint efetivo da versão GovBR com evidência de sucesso.
- [x] Executar e registrar ativação real por Enter em controle principal da rota `/business-govbr`, com evidência verificável do efeito resultante.
- [x] Mapear como os aplicativos Personal Wallet e Business Wallet acionam APIs atualmente e onde as respostas são armazenadas ou exibidas.
- [x] Exibir nas telas utilizadas pelo usuário as respostas sanitizadas das APIs acionadas na Personal Wallet, associadas ao fluxo e formulário correspondente.
- [x] Exibir nas telas utilizadas pelo usuário as respostas sanitizadas das APIs acionadas na Business Wallet, associadas ao fluxo e formulário correspondente.
- [x] Implementar estados visuais claros de carregamento, sucesso, erro e API ausente para cada ação executável nas duas wallets.
- [x] Atualizar ou criar testes automatizados que comprovem a renderização das respostas de API nos aplicativos Personal e Business.
- [x] Executar validação TypeScript, Vitest e verificação visual das telas alteradas antes de salvar novo checkpoint.
- [x] Investigar e corrigir retorno Forbidden na criação da Personal dWallet, verificando passo zero/token M2M, credenciais server-side e contrato da API.
- [x] Destravar investigação do Forbidden publicado na Personal dWallet, documentando causa provável, diferença local versus publicado e ação necessária para credenciais/token M2M.
- [x] Reexecutar `step2_person_signup` após a atualização das credenciais e registrar evidência verificável de sucesso ou falha atualizada.
- [x] Revalidar a rota publicada `/personal-govbr` após publicar o novo checkpoint, registrando se a criação Personal deixou de retornar 403 no runtime publicado — resultado: o contrato de `address` foi corrigido no publicado, mas a sandbox ainda retornou 403.
- [x] Registrar verificação específica do fluxo de signup Personal com credenciais corrigidas, além do teste leve de token M2M.
- [x] Criar interface para edição das variáveis de entrada dos testes de API, incluindo nome, sobrenome, endereço, estado, telefone, e-mail, senha, CNPJ, identificadores e valores reutilizados na jornada.
- [x] Conectar as variáveis editáveis às ações Personal dWallet e Business dWallet para que cada execução use os valores informados pelo usuário na tela.
- [x] Criar aba ou seção de credenciais e chaves com orientação clara para atualização segura de `DATAPREV_BASE_URL`, `DATAPREV_API_KEY`, `DATAPREV_CLIENT_ID` e `DATAPREV_CLIENT_SECRET`, sem expor segredos no frontend.
- [x] Atualizar testes automatizados para cobrir renderização dos campos editáveis, aplicação dos valores customizados nas chamadas e exibição segura da área de credenciais.
- [x] Revalidar a criação Personal dWallet na rota publicada `/personal-govbr` após publicação do checkpoint anterior — resultado: o 403 não foi removido no runtime público, indicando bloqueio de credencial/autorização/allowlist após a correção de schema.
- [x] Permitir edição direta das variáveis de teste nos formulários da tela atual das rotas Personal e Business GovBR, sem depender apenas da aba Variáveis de teste.
- [x] Sincronizar os campos editados diretamente no front-end emulado com a aba Variáveis de teste e com os payloads enviados às APIs Dataprev.
- [x] Atualizar testes automatizados para cobrir edição direta no formulário emulado e preservação da sanitização de senhas/credenciais.
- [x] Validar visualmente nas rotas `/personal-govbr` e `/business-govbr` que o usuário consegue alterar dados diretamente no aplicativo emulado.
- [x] Executar validação verificável de sincronização: alterar um campo na tela atual, abrir a aba Variáveis de teste e registrar evidência de propagação do mesmo valor.
- [x] Executar chamada de API após editar campos diretamente na tela atual e registrar evidência de que o payload sanitizado refletiu os novos valores.
- [x] Revisar testes atualizados para comprovar cobertura de edição direta no formulário emulado e sanitização de senha/credenciais.
- [x] Realizar interação real no navegador editando inputs em Personal e Business e registrar evidência da alteração bem-sucedida no front-end emulado.
- [x] Executar no navegador uma ação real a partir da tela atual após editar um campo direto e registrar evidência da própria UI com o payload sanitizado contendo o novo valor.
- [x] Adicionar cobertura automatizada do fluxo editar campo `direct-*` → acionar execução da tela → confirmar que `executeAction` recebe o estado consolidado atualizado.
- [x] Corrigir o payload da ação Entrada da Personal Wallet para remover campos `address.line1`, `address.city` e `address.zip` quando o contrato da Dataprev não os aceitar.
- [x] Explicar no relatório por que ocorreu o erro `address.property line1 should not exist` e qual alteração foi aplicada.
- [x] Validar as APIs executáveis da página Personal GovBR após a correção, registrando quais funcionam, quais retornam erro de negócio e quais permanecem ausentes por falta de endpoint.
- [x] Atualizar testes automatizados para impedir regressão no contrato de endereço da ação `step2_person_signup`.
- [x] Verificar se o checkpoint `a48d5bbb` está publicado e validar a rota pública `/personal-govbr` no domínio disponível.

- [x] Adicionar procedimento tRPC `dataprev.authenticateM2M` para executar autenticação M2M explícita, armazenar o token em cache até a expiração e retornar apenas metadados sanitizados.
- [x] Adicionar botão "Passo 0 — Autenticar M2M" na página GovBR Wallet, antes das demais ações executáveis.
- [x] Exibir na interface o status sanitizado do token M2M, incluindo handle opaco, validade e indicação ativo/expirado sem revelar o token bruto.
- [x] Garantir que as demais chamadas Dataprev reutilizem o token M2M em cache quando válido e renovem apenas quando necessário.
- [x] Atualizar testes Vitest para cobrir autenticação M2M explícita, sanitização do retorno e integração da UI do Passo 0.
- [x] Executar validações técnicas do projeto após a implementação do Passo 0 e salvar checkpoint.

- [x] Acessar o link Postman informado e extrair método, URL, headers, body e respostas das APIs de envio e validação de código de verificação.
- [x] Mapear corretamente as APIs de envio de código e input/validação do código para os fluxos de criação da Personal dWallet e Business dWallet.
- [x] Adicionar ações backend Dataprev para executar envio de código e validação de código com evidências sanitizadas e reutilização do token M2M quando aplicável.
- [x] Incluir telas/etapas de verificação de código no passo de criação de cada wallet GovBR, com campos editáveis, botões de execução e status visual.
- [x] Atualizar testes Vitest para cobrir o mapeamento dos endpoints de verificação, payloads esperados, sanitização e renderização das novas telas.
- [x] Salvar novo checkpoint da integração de envio/validação de código OTP após testes, build e revisão do checklist.

- [x] Reordenar a jornada da BdWallet para que o passo de criação da conta do empregado apareça antes das etapas de abertura da BdWallet.
- [x] Garantir que as informações produzidas pela criação da conta do empregado alimentem as telas e chamadas seguintes da jornada BdWallet.
- [x] Separar visualmente o Passo 0 de autenticação M2M como pré-requisito técnico de sandbox, sem apresentá-lo como parte da experiência do usuário final.
- [x] Criar telas emuladas do aplicativo para as etapas aplicáveis da BdWallet, com campos de entrada equivalentes aos dados que o usuário informaria no app.
- [x] Criar telas de resposta emuladas do aplicativo para exibir, quando aplicável, as respostas sanitizadas recebidas pelas APIs.
- [x] Atualizar testes Vitest para cobrir a ordem da jornada BdWallet, a presença da criação da conta do empregado e a renderização das telas emuladas.
- [x] Salvar checkpoint da reorganização da jornada BdWallet após testes, build e revisão do checklist.

- [x] Extrair da coleção `BTGPactualEmpresarUSER.postman_collection.json` os contratos de APIs BTG para recebimento, envio de pagamentos, Pix e visualização de extrato.
- [x] Mapear as APIs BTG extraídas aos passos da jornada dWallet que atualmente não possuem API e são aplicáveis, incluindo tela de extrato, cadastramento de Pix, recebimento e envio de pagamento.
- [x] Criar documentação interna de mapeamento entre passos da jornada, endpoints BTG, payloads esperados, headers e respostas sanitizadas.
- [x] Implementar no backend procedimentos para executar ou emular chamadas BTG aplicáveis com entrada controlada, evidências sanitizadas e tratamento de configuração ausente.
- [x] Atualizar as telas emuladas do aplicativo para Pix, pagamentos, recebimentos e extrato, exibindo campos de entrada e telas de resposta da API quando aplicável.
- [x] Atualizar testes Vitest para cobrir o mapeamento BTG, os novos procedimentos backend e a renderização das telas emuladas com APIs
 aplicáveis.
- [x] Executar validações técnicas, revisar checklist e salvar checkpoint da integração das APIs BTG.

## Mockup de Celular no /homologacao

- [x] Criar componente PhoneMockup com shell de celular gov.br (barra de status, header com logo, conteúdo scrollável, barra de navegação inferior)
- [x] Mapear campos de entrada editáveis por passo (0–17): quais variáveis o usuário preencheria no app real para cada ação
- [x] Mapear tela de resultado por passo: como o app exibiria a resposta da API (cards, listas, confirmações, erros)
- [x] Integrar PhoneMockup ao painel de detalhes do passo selecionado, exibindo tela de entrada antes da execução
- [x] Mostrar tela de loading/aguardando dentro do celular durante execução da API
- [x] Exibir tela de resultado montada com dados reais da resposta da API após execução bem-sucedida
- [x] Exibir tela de erro dentro do celular quando a API retornar falha
- [x] Sincronizar campos editáveis do mockup com o runState da jornada (valores usados nas chamadas reais)
- [x] Executar testes, build, verificar status e salvar checkpoint do mockup de celular no /homologacao

## Botão Executar no Mockup de Celular

- [x] Conectar onExecute do mockup ao handleExecuteAction da página /homologacao
- [x] Garantir que campos editados no mockup são propagados para o runState antes da execução
- [x] Desabilitar botão CTA do mockup durante execução (isExecuting) e exibir "Enviando…"
- [x] Adicionar indicador de progresso de sub-etapas para passos com múltiplas ações (ex: Passo 2 com 4 ações)
- [x] Calcular automaticamente a próxima ação pendente para passos com múltiplas ações
- [x] Adicionar sub-telas por ação para passos 2, 7 e 10 com campos e textos específicos
- [x] Executar testes, build e salvar checkpoint

## Correção do Passo 0 no site publicado

- [x] Diagnosticar por que o Passo 0 não funciona quando acionado pelo site publicado — causa raiz: status de falha (ok: false) não era persistido no m2mStatus, portanto a UI não exibia nenhum feedback de erro
- [x] Corrigir normalizePersistedM2MTokenStatus e persistM2MTokenStatus para aceitar e preservar status de falha com message, responseBody e httpStatus
- [x] Atualizar readPersistedM2MTokenStatus para não remover status de falha do storage
- [x] Atualizar Step0Panel para exibir painel vermelho com código HTTP, mensagem de erro e resposta da API expansível quando ok === false
- [x] Validar visualmente no navegador que o token M2M é gerado com sucesso (ambiente dev funciona; site publicado retorna 403 por IP não estar na allowlist da API DrumWave)
- [x] Executar testes (125 passando), build e salvar checkpoint
