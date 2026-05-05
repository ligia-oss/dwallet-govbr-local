# Diagnóstico do Forbidden na criação da Personal dWallet

Data de investigação: 2026-05-04, horário GMT-3.

## Resumo executivo

A criação da **Personal dWallet** não falha por ausência completa do passo zero no código. O backend já possui implementação para obter token M2M quando a ação exige `requiresM2M`, e também já envia `x-api-key` em chamadas públicas de cadastro. A evidência coletada indica uma divergência entre o ambiente local de desenvolvimento e o ambiente publicado: a mesma chamada de cadastro Personal retorna **HTTP 201** localmente, mas retorna **HTTP 403 Forbidden** na aplicação publicada.

## Evidências coletadas

| Ambiente | Ação testada | Endpoint | Resultado observado | Interpretação |
|---|---:|---|---:|---|
| Local, via caller tRPC | `step2_person_signup` | `/v1/dwallet/person/signup` | HTTP 201 | Credenciais disponíveis no servidor local aceitas pela sandbox. |
| Publicado, via interface | `step2_person_signup` | `/v1/dwallet/person/signup` | HTTP 403 `{ "message": "Forbidden" }` | Ambiente publicado rejeitado pela sandbox. |
| Publicado, via curl tRPC | `step2_person_signup` | `/v1/dwallet/person/signup` | HTTP 403 `{ "message": "Forbidden" }` | O problema não é componente React; ocorre no backend publicado. |
| Publicado, via curl tRPC | `step1_employee_signup` | `/v1/dwallet/employee/signup` | HTTP 403 `{ "message": "Forbidden" }` | Não é exclusivo da Personal; afeta também signup Business com `x-api-key`. |
| Publicado, via curl tRPC | `step10_commercial_dsps` | endpoint com M2M | erro interno por `Falha ao obter token M2M: HTTP 403` | O passo zero existe, mas a sandbox rejeita as credenciais publicadas. |
| Publicado, metadata | `dataprev.metadata` | tRPC | `credentialsConfigured: true` | As variáveis existem no publicado, mas podem estar com valor inválido, antigo, divergente ou não autorizado. |

## Conclusão técnica

A causa mais provável é **credencial Dataprev/DrumWave divergente entre local e publicado**, especialmente `DATAPREV_API_KEY`, e possivelmente também `DATAPREV_CLIENT_ID` e `DATAPREV_CLIENT_SECRET`. Como o endpoint de token M2M também retorna 403 no publicado, a correção necessária é sincronizar/atualizar as credenciais server-side do ambiente publicado e republicar a versão após checkpoint.

## Resposta à pergunta sobre o passo zero

Sim, o passo zero é necessário para endpoints com `requiresM2M`; porém, para o cadastro `step2_person_signup`, a chamada observada usa `x-api-key` e não depende do bearer M2M. Mesmo assim, o teste de uma ação M2M no publicado confirmou que o passo zero também está sendo rejeitado com 403. Portanto, o problema prático não parece ser “faltou implementar o passo zero”, e sim **o ambiente publicado não está conseguindo autenticar contra a sandbox com as credenciais atuais**.

## Atualização após sincronização de credenciais

As variáveis `DATAPREV_API_KEY`, `DATAPREV_CLIENT_ID`, `DATAPREV_CLIENT_SECRET` e `DATAPREV_BASE_URL` foram atualizadas pelo fluxo seguro de segredos. Em seguida, foi executado o teste `server/dataprev.secrets.test.ts`, que valida a obtenção de token M2M diretamente contra a sandbox, e o resultado foi **1 arquivo de teste aprovado, 1 teste aprovado**. Isso confirma que o passo zero M2M está funcional no ambiente atual após a atualização.

Além disso, a camada Dataprev foi ajustada para transformar erros HTTP 401/403 em mensagens diagnósticas explícitas na tela, diferenciando falha de `x-api-key` em cadastro Personal/Business de falha no passo zero M2M.

## Reexecução específica do signup Personal

Após a sincronização de credenciais, o fluxo exato `step2_person_signup` foi reexecutado localmente com e-mail único `dataprev.pd.recheck.7943909928@example.com`. A resposta foi **HTTP 201**, `status: executed`, `ok: true`, confirmando que a criação da Personal dWallet funciona quando o backend usa as credenciais atualizadas.

A mesma ação foi chamada diretamente no endpoint tRPC da versão publicada `https://dwalletgovbr-mmipedog.manus.space/api/trpc/dataprev.executeAction?batch=1` com e-mail único `dataprev.pd.published.recheck.7943954458@example.com`. A resposta de transporte foi HTTP 200, mas a evidência da ação retornou **HTTP 403** da sandbox em `/v1/dwallet/person/signup`. A mensagem retornada ainda foi a mensagem antiga genérica, o que confirma que a versão publicada ainda não recebeu o novo checkpoint/código e/ou ainda está com o conjunto antigo de segredos no runtime publicado.

Portanto, a correção está validada no ambiente atual do projeto, mas a versão pública precisa ser atualizada via novo checkpoint e publicação para receber os diagnósticos e as credenciais sincronizadas.

## Atualização de usabilidade para testes de API — 2026-05-04

Foi adicionada uma aba **Variáveis de teste** nas rotas `/personal-govbr` e `/business-govbr`, permitindo alterar valores usados durante as execuções das APIs, incluindo nome, sobrenome, e-mail, telefone, senha de teste, endereço, cidade, UF, CEP, dados empresariais, CNPJ e identificadores reutilizados na jornada. Também foi adicionada a aba **Credenciais**, que lista as variáveis server-side relevantes (`DATAPREV_BASE_URL`, `DATAPREV_API_KEY`, `DATAPREV_CLIENT_ID`, `DATAPREV_CLIENT_SECRET`) sem expor valores sensíveis no cliente e orienta a atualização pelo painel seguro de Secrets antes de publicar novo checkpoint.

Validação executada: `pnpm test` resultou em 6 arquivos aprovados e 16 testes aprovados; `pnpm exec tsc --noEmit` terminou sem erros; a prévia local foi verificada visualmente em `/personal-govbr` e `/business-govbr`, confirmando a presença das abas **Tela atual**, **Variáveis de teste** e **Credenciais**.

## Validação de edição direta no app emulado — Personal

Na prévia local de `/personal-govbr`, o campo direto `direct-entrada-personFirstName` foi alterado de `João` para `Ana Teste Direto` dentro da própria tela emulada **Entrada da Personal dWallet**. Em seguida, a aba **Variáveis de teste** foi aberta e o campo consolidado `test-var-personFirstName` exibiu o mesmo valor `Ana Teste Direto`, comprovando sincronização visual entre o formulário principal emulado e o painel de variáveis.

## Validação de edição direta no app emulado — Business

Na prévia local de `/business-govbr`, o campo direto `direct-entrada-businessName` foi alterado no próprio fluxo emulado **Entrada da Business dWallet** para `Empresa Direta Validada`. A alteração ficou visível imediatamente no input da tela atual, comprovando que o front-end emulado empresarial aceita edição inline sem depender exclusivamente da aba **Variáveis de teste**.
Ao abrir a aba **Variáveis de teste** na mesma rota `/business-govbr`, o campo consolidado `test-var-businessName` exibiu `Empresa Direta Validada`, o mesmo valor inserido no campo direto `direct-entrada-businessName`. Essa verificação confirma a sincronização bidirecional esperada entre o formulário principal emulado e o painel consolidado de variáveis para o fluxo Business.

## Validação automatizada final — edição direta e sanitização

Após a revisão do checklist, foi adicionada cobertura automatizada explícita para a propagação de valores editados em campos diretos do formulário emulado para o mesmo estado compartilhado usado pela aba **Variáveis de teste**. O teste `server/govbr.wallet.ui.test.ts` agora verifica o valor `Empresa Direta Validada` tanto no input direto `direct-entrada-businessName` quanto no input consolidado `test-var-businessName` após atualização do estado compartilhado.

A validação final executada em 2026-05-04 resultou em `pnpm test` com **6 arquivos aprovados e 18 testes aprovados**. Em seguida, `pnpm exec tsc --noEmit` terminou sem erros. A cobertura de sanitização de senha e credenciais permanece validada pelos testes de execução Dataprev e sanitização de evidências.
