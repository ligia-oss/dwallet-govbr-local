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
- [x] Implementar navegação própria de carteira digital para Business dWallet GovBR com dashboard, empresa, produtos, solicitações, ofertas, operações, financeiro e configurações conforme mapeamento.
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
- [x] Adicionar botão “Passo 0 — Autenticar M2M” na página GovBR Wallet, antes das demais ações executáveis.
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
- [x] Atualizar testes Vitest para cobrir o mapeamento BTG, os novos procedimentos backend e a renderização das telas emuladas com APIs aplicáveis.
- [x] Executar validações técnicas, revisar checklist e salvar checkpoint da integração das APIs BTG.
- [x] Auditar todas as telas emuladas atuais da Personal dWallet e da Business dWallet para identificar elementos que parecem painel técnico em vez de aplicativo de usuário final.
- [x] Redesenhar o padrão visual das telas emuladas para formato de aplicativo móvel real, com cabeçalho, conteúdo, formulários, confirmação, estados de erro e navegação compatíveis com identidade visual governamental brasileira.
- [x] Separar visualmente a experiência do usuário final dos detalhes técnicos de API, mantendo payloads e respostas sanitizadas em áreas de confirmação/resultado sem expor tokens brutos.
- [x] Aplicar o novo padrão de tela real às jornadas Personal dWallet e Business dWallet, incluindo criação de conta, OTP, login, abertura de wallet, Pix, pagamentos, recebimentos, saldo e extrato quando aplicável.
- [x] Atualizar testes de UI para validar textos, ordem de jornada e presença do novo padrão de aplicativo emulado nas telas PdW e BdW.
- [x] Verificar por inspeção direta e testes adicionais a renderização das telas Pix, pagamentos, recebimentos, saldo e extrato com campos e respostas sanitizadas nas jornadas finais.
- [x] Adicionar cobertura automatizada de que o shell móvel gov.br está aplicado às telas de criação de conta, OTP, login e abertura de wallet nas jornadas Personal e Business.
- [x] Salvar checkpoint do estado atual após integração BTG, redesign gov.br e testes aprovados.

- [x] Corrigir o mockup de telefone para exibir a tela real de entrada do aplicativo antes da execução da API, sem painel técnico misturado ao fluxo do usuário.
- [x] Fazer o CTA da tela emulada representar o gatilho da API e, quando a resposta for OK, exibir a próxima tela real da jornada no telefone, por exemplo envio de código de validação após criação da PdW.
- [x] Aplicar o mesmo padrão sequencial às jornadas PdW e BdW, incluindo estados de erro como telas reais de falha/pendência do aplicativo.
- [x] Atualizar testes automatizados para garantir que respostas OK renderizem a tela seguinte da jornada, e não apenas um cartão genérico de resultado.

- [x] Permitir editar os dados diretamente dentro da tela do mockup de telefone, sincronizando os valores com o estado da jornada e com o formulário auxiliar.
- [x] Garantir que o CTA do próprio telefone use os dados editados no mockup para executar a API correspondente.
- [x] Criar um guia leigo dentro da aplicação explicando como testar a jornada, em que ordem executar os passos e como interpretar sucesso, erro e API ausente.
- [x] Atualizar testes automatizados para cobrir edição direta no mockup de telefone, sincronização dos valores e presença do passo a passo de testes.
- [x] Validar a implementação, revisar o checklist e salvar checkpoint da versão com edição direta no telefone e guia de testes.

- [x] Adicionar checklist visual interativo ao Guia de teste nas jornadas Personal e Business GovBR, com uma linha por etapa executável.
- [x] Sincronizar automaticamente o status do checklist visual com as execuções realizadas, diferenciando pendente, concluído, falhou e API ausente.
- [x] Permitir interação manual segura no checklist visual para o usuário marcar ou revisar etapas durante o teste leigo.
- [x] Atualizar testes automatizados para cobrir renderização, interação e atualização de progresso do checklist visual do guia.
- [x] Validar a implementação, revisar o checklist e salvar checkpoint da versão com acompanhamento visual de progresso.

- [x] Criar frontend no aplicativo para informar credenciais Dataprev/DrumWave necessárias ao Passo 0 M2M, sem exibir segredos após digitados.
- [x] Integrar as credenciais informadas na aplicação ao procedimento de autenticação M2M do Passo 0, preservando fallback para credenciais server-side.
- [x] Atualizar testes automatizados para cobrir o formulário de credenciais, sanitização visual e envio controlado ao Passo 0.
- [x] Testar o Passo 0 com as credenciais disponíveis e registrar sucesso ou explicar claramente o motivo do erro.
- [x] Validar TypeScript, Vitest, status do projeto e salvar checkpoint da versão com frontend de credenciais.

- [x] Mapear todas as APIs executáveis atualmente disponíveis nas jornadas Personal e Business GovBR para teste via frontend.
- [x] Inserir instruções de teste didáticas logo acima do mockup das telas da aplicação, explicando ordem de execução, uso de credenciais e leitura dos resultados.
- [x] Executar via frontend todas as ações de API disponíveis, registrando sucesso, erro de negócio, API ausente ou falha técnica.
- [x] Corrigir erros de payload, contrato, estado ou exibição identificados durante a execução das APIs pelo frontend.
- [x] Atualizar testes automatizados para cobrir as instruções acima do mockup e regressões das APIs corrigidas.
- [x] Validar TypeScript, Vitest, status do projeto e salvar checkpoint da versão com APIs testadas via frontend.

- [x] Corrigir actionIds Dataprev obsoletos nas telas frontend, substituindo `step10_list_dsps` e `step4_create_product` por ações existentes no roteador.
- [x] Garantir que o frontend envie estado de execução sem campos `undefined` e que o backend não devolva `stateUpdates` inválidos.
- [x] Adicionar tela/ação de login Personal GovBR (`step2_person_signin`) ao frontend para que as APIs dependentes de token de usuário possam ser testadas pela jornada.

- [x] Identificar todas as variáveis de ambiente BTG exigidas pelo backend para saldo, extrato, cobranças e pagamentos.
- [x] Solicitar as credenciais reais BTG por formulário seguro de segredos, sem expor valores no frontend ou no código — substituído pelo fluxo de cadastro futuro no frontend porque o token ainda não está disponível.
- [x] Validar que as credenciais BTG foram carregadas pelo backend com teste automatizado ou existente — adiado para quando houver token real BTG; a versão atual valida o painel futuro e a propagação de estado.
- [x] Reexecutar as ações BTG de saldo, extrato e pagamentos via cliente frontend e registrar sucesso, erro de negócio ou pendência de contrato — pendência registrada para execução real futura quando houver token BTG.
- [x] Corrigir eventuais incompatibilidades de payload, headers ou configuração BTG encontradas na execução real — sem execução real nesta rodada por ausência de token; fluxo preparado para teste futuro.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint da versão com credenciais BTG configuradas — substituído por checkpoint da versão com cadastro frontend de informações BTG futuras.

- [x] Criar seção frontend para informar futuramente dados BTG de teste, incluindo base URL, Company ID, token, conta, agência, linha digitável e período de extrato.
- [x] Explicar na interface que o token BTG ainda não é obrigatório para preparar os dados, mas será necessário para executar chamadas reais.
- [x] Conectar os dados BTG informados no frontend ao estado usado pelas ações de saldo, extrato, cobranças e pagamentos.
- [x] Preservar sanitização visual do token BTG nas instruções, resumos e evidências, mantendo o campo como senha quando for necessário enviá-lo localmente ao backend de teste.
- [x] Atualizar testes automatizados para cobrir o novo painel de informações BTG e a propagação dos dados para as ações financeiras.
- [x] Validar Vitest, build/status, revisar checklist e salvar checkpoint da versão com cadastro frontend de informações BTG.

- [x] Investigar por que o Passo 0 M2M funciona no Postman, mas falha pela aplicação web.
- [x] Corrigir o contrato de autenticação M2M usado pelo backend/frontend para gerar a chave M2M pela interface.
- [x] Validar a geração da chave M2M pelo site e atualizar testes automatizados para impedir regressão.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint da correção do Passo 0.
- [x] Corrigir o Passo 0 M2M para funcionar pela interface web, com diagnóstico claro quando o ambiente publicado usar secrets divergentes do Postman/local.

- [x] Manter na navegação apenas os links para as experiências com mockup visual gov.br, removendo os caminhos antigos Personal e Business baseados somente em evidências.
- [x] Remover da interface referências ao usuário como “leigo” e substituir por linguagem de teste clara e profissional.
- [x] Deixar explícita a ordem de execução das APIs e as dependências entre etapas, incluindo quais identificadores devem ser guardados para uso posterior.
- [x] Salvar automaticamente na área de credenciais as informações geradas por respostas de API que possam ser usadas como input em outras etapas.
- [x] Atualizar as telas de avatar, montagem de telas e fluxos similares para exibir no mockup exemplos visuais concretos da tela montada.
- [x] Atualizar testes automatizados para cobrir navegação apenas GovBR, instruções de ordem/dependência, persistência na pasta de credenciais e exemplos visuais no mockup.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint dos ajustes de experiência GovBR com mockup.

- [x] Criar botão na interface para limpar os retornos/evidências das APIs já executadas sem apagar credenciais persistidas.
- [x] Retestar o Passo 0 M2M com as credenciais informadas na interface e registrar a falha real observada.
- [x] Corrigir a causa da falha do Passo 0 M2M, garantindo que o contrato usado pelo site gere a chave M2M quando as credenciais estiverem corretas.
- [x] Atualizar testes automatizados para cobrir a limpeza de retornos de API e a nova validação do Passo 0 M2M.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint da correção de limpeza e Passo 0.

- [x] Incluir instrução na aba Credenciais para preencher Client ID, API ID/API Key e Secret ID/Client Secret antes de executar o Passo 0 M2M.
- [x] Bloquear a execução do Passo 0 pela interface quando credenciais essenciais estiverem vazias, exibindo mensagem orientando a pessoa responsável pela homologação a preencher os campos faltantes na aba Credenciais.
- [x] Atualizar testes automatizados para cobrir instrução de credenciais obrigatórias e bloqueio preventivo do Passo 0 sem chamada à API.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint da validação preventiva do Passo 0.

- [x] Renomear a credencial "Base URL opcional" para "API URL" e tratá-la como campo essencial para execução do Passo 0 M2M.
- [x] Atualizar a validação preventiva do Passo 0 para bloquear a execução quando API URL, API ID / x-api-key, Client ID ou Secret ID / Client secret estiverem vazios.
- [x] Revisar e corrigir o layout do quadro que orienta a ordem de execução das ações do Passo 0 para evitar desconfiguração visual.
- [x] Adicionar botões de limpeza para todos os blocos de dados da aba Credenciais, sem apagar blocos não relacionados.
- [x] Atualizar testes automatizados para cobrir API URL obrigatória, novo rótulo, layout de orientação e limpeza por bloco.
- [x] Executar Vitest/build/status, revisar checklist e salvar checkpoint dos ajustes da aba Credenciais.

- [x] Localizar a coleção JSON do Postman informada no projeto e extrair API URL, API ID / x-api-key, Client ID e Secret ID / Client secret sem expor valores no relatório — API key e client secret estão como placeholders na coleção encontrada.
- [x] Testar o Passo 0 M2M pelo frontend usando as credenciais da coleção Postman e registrar evidência sanitizada de sucesso ou falha — frontend executou a chamada, mas a API recusou por credenciais placeholder/inválidas.
- [x] Atualizar checklist e validar status do projeto após o teste real do Passo 0 pelo frontend.
