import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgeCheck } from "lucide-react";
import { AppEmulatedScreen, BeginnerTestGuide, buildExecuteActionInput, buildRequiredApiCredentialsMessage, btgFutureInfoFields, BtgFutureInfoPanel, businessScreens, clearCredentialResultState, compactRunState, CredentialsPanel, CredentialFolderPanel, DirectScreenVariablesPanel, EvidenceBox, getDataprevCredentialChecklist, getMissingM2MCredentialLabels, getVisualStatus, hasBtgFutureInfo, maskSecretPreview, M2MTokenPanel, personalScreens, ScreenApiInstructionPanel, TestVariablesPanel, updateRunStateValue, type Evidence, type M2MAuthResult } from "../client/src/pages/GovBRWalletApp";
import { clearPersistedDataprevCredentials, DATAPREV_CREDENTIALS_STORAGE_KEY, isM2MAuthResultActive, normalizeDataprevCredentials, persistDataprevCredentials, readPersistedDataprevCredentials } from "../client/src/lib/dataprevCredentials";

describe("GovBR Wallet API response panels", () => {
  it("renders pending, running and missing API states inside the user-facing panel", () => {
    const pending = renderToStaticMarkup(React.createElement(EvidenceBox, { actionId: "wallet.personal.check", status: "pending" }));
    const running = renderToStaticMarkup(React.createElement(EvidenceBox, { actionId: "wallet.personal.check", status: "running" }));
    const missing = renderToStaticMarkup(React.createElement(EvidenceBox, { status: "missing" }));

    expect(pending).toContain("aguardando ação");
    expect(pending).toContain("Nenhuma resposta de API foi carregada nesta tela");
    expect(running).toContain("consultando API");
    expect(running).toContain("exibirá o retorno sanitizado aqui");
    expect(missing).toContain("API ausente");
    expect(missing).toContain("Não há endpoint externo associado");
  });

  it("renders sanitized request and response payloads after a successful Personal Wallet API call", () => {
    const evidence: Evidence = {
      actionId: "personal-wallet-onboarding",
      actionTitle: "Criar conta Personal Wallet",
      status: "executed",
      ok: true,
      httpStatus: 200,
      requestBody: { cpf: "***000111**", canal: "personal-govbr" },
      responseBody: { applicantId: "app_123", status: "approved" },
      stateUpdates: { applicantId: "app_123", walletStatus: "ativa" },
      message: "Conta criada com retorno sanitizado.",
      executedAt: "2026-05-04T12:00:00.000Z",
    };

    const html = renderToStaticMarkup(React.createElement(EvidenceBox, { evidence, status: "done", actionId: evidence.actionId }));

    expect(html).toContain("Resposta recebida");
    expect(html).toContain("HTTP 200");
    expect(html).toContain("Resultado utilizado pelo aplicativo");
    expect(html).toContain("Requisição enviada pela tela");
    expect(html).toContain("Resposta da API exibida ao usuário");
    expect(html).toContain("app_123");
    expect(html).toContain("walletStatus: ativa");
  });

  it("renders API absence and failure status without hiding the returned diagnostic message", () => {
    const evidence: Evidence = {
      actionId: "business-wallet-products",
      actionTitle: "Consultar produtos empresariais",
      status: "not_executable",
      ok: false,
      requestBody: { cnpj: "00000000000191" },
      responseBody: { reason: "Endpoint Dataprev não configurado para este fluxo" },
      missingReason: "Endpoint ausente no mapeamento atual.",
      executedAt: "2026-05-04T12:00:00.000Z",
    };

    const html = renderToStaticMarkup(React.createElement(EvidenceBox, { evidence, status: "failed", actionId: evidence.actionId }));

    expect(html).toContain("API ausente");
    expect(html).toContain("Endpoint ausente no mapeamento atual");
    expect(html).toContain("Endpoint Dataprev não configurado para este fluxo");
  });

  it("renders the automatic technical authentication panel with sanitized token metadata and no explicit execution button", () => {
    const result: M2MAuthResult = {
      status: "executed",
      ok: true,
      method: "POST",
      url: "https://sandbox.test.local/v1/auth/token/iam/authn/services/oauth2/token",
      httpStatus: 200,
      tokenHandle: "opaque-token-handle",
      expiresAt: "2026-05-05T15:30:00.000Z",
      expiresInSeconds: 1800,
      active: true,
      responseBody: { tokenHandle: "opaque-token-handle", tokenBruto: "<REDACTED>", tokenArmazenado: true },
      message: "Autenticação técnica executada: token M2M armazenado no servidor até a expiração.",
      executedAt: "2026-05-05T15:00:00.000Z",
    };

    const html = renderToStaticMarkup(React.createElement(M2MTokenPanel, {
      result,
      isRunning: false,
    }));

    expect(html).toContain("Autenticação técnica automática");
    expect(html).toContain("solicitam ou renovam o token automaticamente");
    expect(html).not.toContain("Execução manual de autenticação");
    expect(html).toContain("API URL");
    expect(html).toContain("API ID / x-api-key");
    expect(html).toContain("Secret ID / Client secret");
    expect(html).toContain("ativo no servidor");
    expect(html).toContain("opaque-token-handle");
    expect(html).toContain("&lt;REDACTED&gt;");
    expect(html).not.toContain("eyJ");
  });

  it("renders editable test variables and credential guidance for operators", () => {
    const variablesHtml = renderToStaticMarkup(React.createElement(TestVariablesPanel, {
      variables: [
        { key: "personEmail", label: "E-mail", section: "Pessoa física", placeholder: "cidadao@example.com", type: "email", description: "Identificador principal para cadastro." },
        { key: "personPassword", label: "Senha de teste", section: "Pessoa física", placeholder: "SecurePass123!", type: "password", sensitive: true, description: "Senha enviada ao cadastro/login." },
      ],
      values: { personEmail: "teste@example.com", personPassword: "<REDACTED>" },
      onChange: () => undefined,
      onReset: () => undefined,
    }));
    const credentialsHtml = renderToStaticMarkup(React.createElement(CredentialsPanel, {
      baseUrl: "https://sandbox.test.local",
      configured: true,
      btgBaseUrl: "https://btg.test.local",
      btgConfigured: true,
      credentials: { baseUrl: "", apiKey: "", clientId: "", clientSecret: "" },
      onChange: () => undefined,
      onClear: () => undefined,
    }));

    expect(variablesHtml).toContain("Variáveis de entrada editáveis");
    expect(variablesHtml).toContain("teste@example.com");
    expect(variablesHtml).toContain("redigido");
    expect(credentialsHtml).toContain("Credenciais e chaves");
    expect(credentialsHtml).toContain("DATAPREV_CLIENT_SECRET");
    expect(credentialsHtml).toContain("BTG_ACCESS_TOKEN");
    expect(credentialsHtml).toContain("Credenciais temporárias Dataprev");
    expect(credentialsHtml).toContain("Checklist do item recebido via 1Password");
    expect(credentialsHtml.indexOf("Credenciais temporárias Dataprev")).toBeLessThan(credentialsHtml.indexOf("Checklist do item recebido via 1Password"));
    expect(credentialsHtml).toContain("0 de 4 preenchidas");
    expect(credentialsHtml).toContain("No 1Password: Base URL ou API URL");
    expect(credentialsHtml).toContain("Para homologar exatamente com o item recebido via 1Password");
    expect(credentialsHtml).toContain("Para usar credenciais temporárias");
    expect(credentialsHtml).toContain("API URL");
    expect(credentialsHtml).not.toContain("Base URL opcional");
    expect(credentialsHtml).toContain("API ID / x-api-key");
    expect(credentialsHtml).toContain("Secret ID / Client secret");
    expect(credentialsHtml).not.toContain("Execução manual de autenticação");
    expect(credentialsHtml).toContain("Limpar Dataprev");
  });

  it("identifica o progresso do checklist de credenciais recebido via 1Password", () => {
    const emptyChecklist = getDataprevCredentialChecklist({ baseUrl: "", apiKey: "", clientId: "", clientSecret: "" });
    const partialChecklist = getDataprevCredentialChecklist({ baseUrl: "https://api.example.local", apiKey: "x-api-key", clientId: "", clientSecret: "" });

    expect(emptyChecklist).toHaveLength(4);
    expect(emptyChecklist.map(item => item.onePasswordName)).toEqual(["Base URL ou API URL", "x-api-key", "Client ID", "Client Secret"]);
    expect(emptyChecklist.every(item => item.filled)).toBe(false);
    expect(partialChecklist.filter(item => item.filled).map(item => item.key)).toEqual(["baseUrl", "apiKey"]);
  });

  it("mostra o preenchimento das quatro credenciais como primeiro passo da ordem recomendada", () => {
    const source = fs.readFileSync("/home/ubuntu/dwallet-govbr-local/client/src/pages/Home.tsx", "utf8");

    expect(source).toContain("Ordem recomendada");
    expect(source).toContain("Preencha na aba Credenciais a Base URL/API URL, x-api-key/API ID, Client ID e Client Secret antes de executar qualquer API");
    expect(source.indexOf("<strong>1.</strong> Preencha na aba Credenciais")).toBeLessThan(source.indexOf("<strong>2.</strong> Abra a Business dWallet"));
  });

  it("apresenta Business dWallet antes da Personal e oferece atalho para adicionar credenciais", () => {
    const source = fs.readFileSync("/home/ubuntu/dwallet-govbr-local/client/src/pages/Home.tsx", "utf8");

    expect(source).toContain("Primeiro passo de homologação");
    expect(source).toContain("Adicionar credenciais");
    expect(source).toContain("/business-govbr?tab=credenciais");
    expect(source.indexOf("Business dWallet GovBR")).toBeLessThan(source.indexOf("Personal dWallet GovBR"));
  });

  it("permite abrir diretamente a aba Credenciais por parâmetro de URL", () => {
    const source = fs.readFileSync("/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx", "utf8");

    expect(source).toContain('new URLSearchParams(window.location.search).get("tab") === "credenciais"');
    expect(source).toContain("<Tabs defaultValue={initialTab}");
  });

  it("identifica credenciais obrigatórias faltantes antes de executar qualquer API", () => {
    expect(getMissingM2MCredentialLabels({ baseUrl: "", apiKey: "", clientId: "", clientSecret: "" })).toEqual([
      "API URL",
      "API ID / x-api-key",
      "Client ID",
      "Secret ID / Client secret",
    ]);

    expect(getMissingM2MCredentialLabels({ baseUrl: "https://endpoint/token", apiKey: "api-id", clientId: "", clientSecret: "secret-id" })).toEqual(["Client ID"]);
    expect(getMissingM2MCredentialLabels({ baseUrl: "", apiKey: " api-id ", clientId: " client-id ", clientSecret: " secret-id " })).toEqual(["API URL"]);
    expect(getMissingM2MCredentialLabels({ baseUrl: " https://endpoint/token ", apiKey: " api-id ", clientId: " client-id ", clientSecret: " secret-id " })).toEqual([]);

    expect(buildRequiredApiCredentialsMessage(["API URL", "Client ID"])).toContain("Antes de executar qualquer API");
    expect(buildRequiredApiCredentialsMessage(["API URL", "Client ID"])).toContain("API URL, Client ID");
  });

  it("persiste e recarrega as quatro credenciais Dataprev ao alternar páginas na mesma aba", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    };
    const credentials = normalizeDataprevCredentials({ baseUrl: "https://api.example.local", apiKey: "api-key", clientId: "client-id", clientSecret: "client-secret" });

    persistDataprevCredentials(credentials, storage);

    expect(memory.has(DATAPREV_CREDENTIALS_STORAGE_KEY)).toBe(true);
    expect(readPersistedDataprevCredentials(storage)).toEqual(credentials);

    clearPersistedDataprevCredentials(storage);
    expect(readPersistedDataprevCredentials(storage)).toEqual({ baseUrl: "", apiKey: "", clientId: "", clientSecret: "" });
  });

  it("documenta no componente que o Passo 0 M2M roda automaticamente antes da primeira API Dataprev", () => {
    const source = fs.readFileSync("/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx", "utf8");
    const activeResult: M2MAuthResult = {
      status: "executed",
      ok: true,
      method: "POST",
      url: "https://api.example.local/token",
      active: true,
      tokenHandle: "token-handle",
      expiresAt: "2026-05-06T20:00:00.000Z",
      responseBody: { tokenArmazenado: true },
      message: "Token ativo.",
      executedAt: "2026-05-06T17:00:00.000Z",
    };

    expect(isM2MAuthResultActive(activeResult, Date.parse("2026-05-06T19:00:00.000Z"))).toBe(true);
    expect(source).toContain("const authResult = await runM2MAuthentication();");
    expect(source.indexOf("const authResult = await runM2MAuthentication();")).toBeLessThan(source.indexOf("await executeAction.mutateAsync"));
    expect(source).toContain("Passo 0 — autenticação técnica automática");
  });

  it("renders generated API outputs in the credential folder for reuse between steps", () => {
    const html = renderToStaticMarkup(React.createElement(CredentialFolderPanel, {
      items: [{ key: "businessWalletId", value: "bdw_123", source: "Criar Business dWallet", savedAt: "2026-05-05T20:00:00.000Z", purpose: "Use como entrada em solicitações da Personal dWallet." }],
      values: { requestId: "req_456" },
      onClear: () => undefined,
    }));

    expect(html).toContain("Pasta de credenciais");
    expect(html).toContain("bdw_123");
    expect(html).toContain("requestId");
    expect(html).toContain("solicitações da Personal dWallet");
    expect(html).toContain("abra a BdW para gerar o ID da BdW");
    expect(html).toContain("Limpar pasta");
  });

  it("renders the BTG future information panel without requiring a token today", () => {
    const html = renderToStaticMarkup(React.createElement(BtgFutureInfoPanel, {
      values: {
        btgBaseUrl: "https://btg.example.local",
        btgCompanyId: "company-123",
        btgAccessToken: "btg-token-value-123456",
        btgAccountId: "account-456",
      },
      serverBaseUrl: undefined,
      serverConfigured: false,
      onChange: () => undefined,
      onClear: () => undefined,
    }));

    expect(html).toContain("Informações BTG para testes futuros");
    expect(html).toContain("Token Bearer");
    expect(html).toContain("Saldo:");
    expect(html).toContain("Extrato:");
    expect(html).toContain("Pagamentos:");
    expect(html).toContain("btg-••••3456");
    expect(html).toContain("Limpar BTG");
    expect(html).toContain('type="password"');
    expect(btgFutureInfoFields.map(field => field.key)).toContain("btgAccessToken");
    expect(hasBtgFutureInfo({})).toBe(false);
    expect(hasBtgFutureInfo({ btgCompanyId: "company-123" })).toBe(true);
    expect(maskSecretPreview("abcdef123456")).toBe("abcd••••3456");
  });

  it("includes typed BTG future information in the compacted execution state", () => {
    const input = buildExecuteActionInput("btg_get_balance", {
      btgBaseUrl: "https://btg.example.local",
      btgCompanyId: "company-123",
      btgAccessToken: "token-real-futuro",
      btgAccountId: "account-456",
      optionalUnset: undefined,
    }, { baseUrl: "", apiKey: "", clientId: "", clientSecret: "" });

    expect(input.state).toMatchObject({
      btgBaseUrl: "https://btg.example.local",
      btgCompanyId: "company-123",
      btgAccessToken: "token-real-futuro",
      btgAccountId: "account-456",
    });
    expect(input.state).not.toHaveProperty("optionalUnset");
  });

  it("renders the Personal API execution guide with five ordered steps and expected result cards", () => {
    const html = renderToStaticMarkup(React.createElement(BeginnerTestGuide, { walletKind: "personal" }));

    expect(html).toContain("Guia de execução das APIs");
    expect(html).toContain("Antes de começar");
    expect(html).toContain("minmax(180px,1fr)");
    expect(html).toContain("Quando a API exigir autenticação técnica");
    expect(html).not.toContain("Execução manual de autenticação");
    expect(html).toContain("Criar e validar Personal dWallet");
    expect(html).toContain("Abrir a BdW antes de solicitar dados");
    expect(html).toContain("Solicitar informações na PdW");
    expect(html).toContain("abra a Business dWallet");
    expect(html).toContain("Executar telas finais e financeiras");
    expect(html).toContain("Resultado esperado OK");
    expect(html).toContain("Resultado esperado com pendência");
    expect(html).toContain("Quando usar Variáveis de teste");
    expect(personalScreens.some(screen => screen.actionId === "step2_person_signin")).toBe(true);
  });

  it("renders mandatory Business ID guidance above the mockup for the Personal data request screen", () => {
    const screen = personalScreens.find(item => item.actionId === "step6_create_data_request");
    expect(screen).toBeDefined();

    const html = renderToStaticMarkup(React.createElement(ScreenApiInstructionPanel, {
      screen: screen!,
      stepNumber: 6,
      totalSteps: personalScreens.length,
      status: "pending",
      m2mReady: true,
    }));

    expect(html).toContain("Como testar esta tela antes de usar o mockup");
    expect(html).toContain("Ordem obrigatória");
    expect(html).toContain("abra a Business dWallet primeiro");
  });

  it("removes undefined values before sending frontend state to tRPC mutations", () => {
    expect(compactRunState({ personTokenHandle: undefined, businessId: "biz_123", consent: true, amount: null })).toEqual({ businessId: "biz_123", consent: true, amount: null });
    expect(buildExecuteActionInput("step2_person_signin", { personEmail: "teste@example.com", personTokenHandle: undefined }, { baseUrl: "", apiKey: "", clientId: "", clientSecret: "" }).state).toEqual({ personEmail: "teste@example.com" });
  });

  it("clears persisted credential-tab test results without deleting unrelated manual inputs", () => {
    const cleaned = clearCredentialResultState(
      {
        personEmail: "manual@example.com",
        businessId: "biz_123",
        employeeTokenHandle: "tok_123",
        m2mTokenHandle: "m2m_abc",
        btgCompanyId: "btg_manual",
      },
      [
        { key: "businessId", value: "biz_123", source: "Criar Business dWallet", savedAt: "2026-05-05T00:00:00.000Z", purpose: "Identificador gerado pela API" },
      ],
      {
        step1_employee_signin: {
          actionId: "step1_employee_signin",
          actionTitle: "Login do colaborador",
          status: "executed",
          ok: true,
          stateUpdates: { employeeTokenHandle: "tok_123" },
          executedAt: "2026-05-05T00:00:00.000Z",
        },
      }
    );

    expect(cleaned).toEqual({ personEmail: "manual@example.com", btgCompanyId: "btg_manual" });
  });

  it("renders the Business beginner guide with business-specific ordered steps", () => {
    const html = renderToStaticMarkup(React.createElement(BeginnerTestGuide, { walletKind: "business" }));

    expect(html).toContain("Business dWallet");
    expect(html).toContain("Criar Business dWallet");
    expect(html).toContain("ID da BdW");
    expect(html).toContain("Abrir e validar a BdW");
    expect(html).toContain("Produtos, schemas e solicitações");
    expect(html).toContain("Operações financeiras");
    expect(html).not.toContain("Criar Personal dWallet");
  });

  it("renders an interactive visual checklist with automatic and manual progress markers", () => {
    const signupScreen = personalScreens.find(screen => screen.actionId === "step2_person_signup");
    const sendCodeScreen = personalScreens.find(screen => screen.actionId === "step2_person_send_code");
    expect(signupScreen).toBeDefined();
    expect(sendCodeScreen).toBeDefined();
    const evidence: Evidence = {
      actionId: "step2_person_signup",
      actionTitle: "Criar Personal dWallet",
      status: "executed",
      ok: true,
      httpStatus: 201,
      message: "Cadastro criado.",
      executedAt: "2026-05-05T20:00:00.000Z",
    };

    const html = renderToStaticMarkup(React.createElement(BeginnerTestGuide, {
      walletKind: "personal",
      screens: [signupScreen!, sendCodeScreen!],
      evidences: { step2_person_signup: evidence },
      m2mCompleted: true,
      reviewedSteps: { [sendCodeScreen!.id]: true },
      onToggleReviewed: () => undefined,
      onOpenStep: () => undefined,
    }));

    expect(html).toContain("Checklist visual de progresso");
    expect(html).toContain("Cada linha representa uma etapa da execução");
    expect(html).toContain("2 de 2 revisadas");
    expect(html).toContain("100% do roteiro acompanhado nesta sessão");
    expect(html).not.toContain("guide-check-personal-m2m");
    expect(html).toContain(`guide-check-personal-${signupScreen!.id}`);
    expect(html).toContain(`guide-check-personal-${sendCodeScreen!.id}`);
    expect(html).toContain("revisada manualmente");
    expect(html).toContain("Abrir etapa");
  });

  it("renders editable variables directly inside the emulated Dataprev app screen", () => {
    const html = renderToStaticMarkup(React.createElement(DirectScreenVariablesPanel, {
      variables: [
        { key: "personName", label: "Nome", section: "Pessoa física", placeholder: "Maria", description: "Nome enviado no cadastro." },
        { key: "personEmail", label: "E-mail", section: "Pessoa física", placeholder: "cidadao@example.com", type: "email", description: "E-mail de login." },
        { key: "personalWalletId", label: "Wallet ID", section: "Identificadores da jornada", placeholder: "wallet_123", description: "Identificador retornado pela API." },
      ],
      values: { personName: "Ana Teste", personEmail: "ana@example.com", personalWalletId: "wallet_abc" },
      activeFields: [{ key: "personEmail", label: "E-mail", placeholder: "cidadao@example.com", type: "email", required: true }],
      screenId: "cadastro",
      screenTitle: "Cadastro Personal dWallet",
      group: "onboarding",
      onChange: () => undefined,
      errors: { personEmail: "Campo obrigatório" },
    }));

    expect(html).toContain("Campos editáveis nesta tela emulada");
    expect(html).toContain("Ana Teste");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("Campo obrigatório");
    expect(html).toContain("Variáveis de teste");
  });

  it("propagates a direct screen edit to the shared variables state used by the consolidated tab", () => {
    const variables = [
      { key: "businessName", label: "Razão/nome empresarial", section: "Empresa", placeholder: "Empresa Dataprev Local", description: "Nome enviado na criação da Business dWallet." },
    ];
    const values = updateRunStateValue({ businessName: "Empresa Dataprev Local" }, "businessName", "Empresa Direta Validada");

    const directHtml = renderToStaticMarkup(React.createElement(DirectScreenVariablesPanel, {
      variables,
      values,
      activeFields: [{ key: "businessName", label: "Razão/nome empresarial", placeholder: "Empresa Dataprev Local", required: true }],
      screenId: "entrada",
      screenTitle: "Entrada da Business dWallet",
      group: "acesso",
      onChange: () => undefined,
    }));
    const consolidatedHtml = renderToStaticMarkup(React.createElement(TestVariablesPanel, {
      variables,
      values,
      onChange: () => undefined,
      onReset: () => undefined,
    }));

    expect(values.businessName).toBe("Empresa Direta Validada");
    expect(directHtml).toContain("direct-entrada-businessName");
    expect(directHtml).toContain("Empresa Direta Validada");
    expect(consolidatedHtml).toContain("test-var-businessName");
    expect(consolidatedHtml).toContain("Empresa Direta Validada");
  });

  it("builds the executeAction input with values edited in direct screen fields", () => {
    const initialState = { personEmail: "antes@example.com", personFirstName: "Maria" };
    const directEditedState = updateRunStateValue(initialState, "personEmail", "direto-ui@example.com");
    const input = buildExecuteActionInput("step2_person_signup", directEditedState);

    expect(input.actionId).toBe("step2_person_signup");
    expect(input.state.personEmail).toBe("direto-ui@example.com");
    expect(input.state.personFirstName).toBe("Maria");
  });

  it("places employee account creation and login before BdWallet opening in the Business journey metadata", () => {
    const orderedActionIds = businessScreens.map(screen => screen.actionId).filter(Boolean);
    const employeeSignupIndex = orderedActionIds.indexOf("step1_employee_signup");
    const employeeSendCodeIndex = orderedActionIds.indexOf("step1_employee_send_code");
    const employeeVerifyCodeIndex = orderedActionIds.indexOf("step1_employee_verify_code");
    const employeeSigninIndex = orderedActionIds.indexOf("step1_employee_signin");
    const businessCreateIndex = orderedActionIds.indexOf("step1_business_create");

    expect(employeeSignupIndex).toBeGreaterThanOrEqual(0);
    expect(employeeSendCodeIndex).toBeGreaterThan(employeeSignupIndex);
    expect(employeeVerifyCodeIndex).toBeGreaterThan(employeeSendCodeIndex);
    expect(employeeSigninIndex).toBeGreaterThan(employeeVerifyCodeIndex);
    expect(businessCreateIndex).toBeGreaterThan(employeeSigninIndex);

    const businessCreateScreen = businessScreens.find(screen => screen.actionId === "step1_business_create");
    expect(businessCreateScreen?.apiHint).toContain("conta do empregado");
    expect(businessCreateScreen?.appEmulation?.footerNote).toContain("conta do empregado já criada e autenticada");
  });

  it("reuses employee account state when building the subsequent BdWallet opening action", () => {
    const employeeSignupState = updateRunStateValue({ businessName: "Empresa Dataprev Local" }, "employeeEmail", "colaborador@example.com");
    const employeeLoginState = {
      ...employeeSignupState,
      employeePassword: "Senha123!",
      employeeTokenHandle: "opaque-employee-token",
      employeeUserId: "usr_employee_123",
    };
    const businessCreateInput = buildExecuteActionInput("step1_business_create", employeeLoginState);

    expect(businessCreateInput.actionId).toBe("step1_business_create");
    expect(businessCreateInput.state.employeeEmail).toBe("colaborador@example.com");
    expect(businessCreateInput.state.employeeTokenHandle).toBe("opaque-employee-token");
    expect(businessCreateInput.state.businessName).toBe("Empresa Dataprev Local");
  });

  it("renders the employee account flow before BdWallet opening and shows app-like input/response screens", () => {
    const loginInput = buildExecuteActionInput("step1_employee_signin", { employeeEmail: "colaborador@example.com", employeePassword: "Senha123!" });
    const evidence: Evidence = {
      actionId: "step1_business_create",
      actionTitle: "Abrir BdWallet empresarial",
      status: "executed",
      ok: true,
      httpStatus: 201,
      responseBody: { businessId: "biz_123", status: "created" },
      stateUpdates: { businessId: "biz_123" },
      message: "BdWallet criada com sucesso.",
      executedAt: "2026-05-05T16:00:00.000Z",
    };
    const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: {
        id: "empresa",
        route: "/enter-business-information",
        title: "Abrir BdWallet empresarial",
        subtitle: "Formulário do aplicativo para cadastrar a empresa.",
        group: "onboarding",
        icon: BadgeCheck,
        actionId: "step1_business_create",
        apiLabel: "Criar empresa",
        apiHint: "Depende da conta do empregado criada e autenticada.",
        primaryCta: "Abrir BdWallet",
        fields: [
          { key: "businessName", label: "Nome empresarial", placeholder: "DrumWave Brasil", required: true },
          { key: "businessCnpj", label: "CNPJ", placeholder: "00000000000100", required: true },
        ],
        observedFrom: "br.business.drumwave.me/enter-business-information",
        appEmulation: { kind: "input-response", header: "Abrir Business dWallet", lead: "Preencha as informações da empresa.", responseEmpty: "Aguardando API." },
      },
      values: { businessName: "Empresa Direta Validada", businessCnpj: "00000000000100" },
      evidence,
      status: "done",
    }));

    expect(loginInput.actionId).toBe("step1_employee_signin");
    expect(html).toContain("Carteira de dados");
    expect(html).toContain("gov.br");
    expect(html).toContain("Pessoa jurídica");
    expect(html).toContain("CNPJ verificado");
    expect(html).toContain("Compartilhamento seguro");
    expect(html).toContain("Navegação inferior do aplicativo Gov.BR");
    expect(html).toContain("Abrir Business dWallet");
    expect(html).toContain("Empresa Direta Validada");
    expect(html).toContain("Resultado no app");
    expect(html).toContain("businessId: biz_123");
  });

  it("renders Personal dWallet creation as the real opening form and advances to the send-code screen after API OK", () => {
    const signupScreen = personalScreens.find(screen => screen.actionId === "step2_person_signup");
    const sendCodeScreen = personalScreens.find(screen => screen.actionId === "step2_person_send_code");
    expect(signupScreen).toBeDefined();
    expect(sendCodeScreen).toBeDefined();

    const inputHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: signupScreen!,
      nextScreen: sendCodeScreen!,
      values: {
        personFirstName: "Ana",
        personLastName: "Cidadã",
        personEmail: "ana.cidada@example.com",
        personPhone: "+55 11 99999-0002",
        personState: "SP",
        personPassword: "Senha123!",
      },
      status: "pending",
    }));

    expect(inputHtml).toContain("Criar sua Personal dWallet");
    expect(inputHtml).toContain("Ana");
    expect(inputHtml).toContain("Cidadã");
    expect(inputHtml).toContain("ana.cidada@example.com");
    expect(inputHtml).toContain("Seguir");
    expect(inputHtml).toContain("Toque em Seguir para enviar o cadastro");

    const evidence: Evidence = {
      actionId: "step2_person_signup",
      actionTitle: "Criar Personal dWallet",
      status: "executed",
      ok: true,
      httpStatus: 201,
      responseBody: { userId: "usr_person_123", status: "created" },
      stateUpdates: { personUserId: "usr_person_123" },
      message: "Cadastro criado. Envie o código de validação para continuar.",
      executedAt: "2026-05-05T18:00:00.000Z",
    };
    const responseHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: signupScreen!,
      nextScreen: sendCodeScreen!,
      values: { personEmail: "ana.cidada@example.com" },
      evidence,
      status: "done",
    }));

    expect(responseHtml).toContain("Resposta OK · fluxo avançado");
    expect(responseHtml).toContain("Envio do código de e-mail");
    expect(responseHtml).toContain("Próxima tela do aplicativo");
    expect(responseHtml).toContain("Enviar código");
    expect(responseHtml).not.toContain("userId: usr_person_123");
  });

  it("renders Business dWallet employee creation as a sequential app flow after API OK", () => {
    const employeeSignupScreen = businessScreens.find(screen => screen.actionId === "step1_employee_signup");
    const employeeSendCodeScreen = businessScreens.find(screen => screen.actionId === "step1_employee_send_code");
    expect(employeeSignupScreen).toBeDefined();
    expect(employeeSendCodeScreen).toBeDefined();

    const evidence: Evidence = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta do empregado",
      status: "executed",
      ok: true,
      httpStatus: 201,
      responseBody: { userId: "usr_employee_123", status: "created" },
      stateUpdates: { employeeUserId: "usr_employee_123" },
      message: "Conta criada. Envie o código para validar o e-mail corporativo.",
      executedAt: "2026-05-05T18:10:00.000Z",
    };
    const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: employeeSignupScreen!,
      nextScreen: employeeSendCodeScreen!,
      values: { employeeEmail: "colaborador@example.com", employeePassword: "Senha123!" },
      evidence,
      status: "done",
    }));

    expect(html).toContain("Resposta OK · fluxo avançado");
    expect(html).toContain("Próxima tela do aplicativo");
    expect(html).toContain(employeeSendCodeScreen!.title);
    expect(html).toContain(employeeSendCodeScreen!.primaryCta);
    expect(html).not.toContain("employeeUserId: usr_employee_123");
  });

  it("renders pending and error states as user-facing app screens instead of technical panels", () => {
    const signupScreen = personalScreens.find(screen => screen.actionId === "step2_person_signup");
    expect(signupScreen).toBeDefined();

    const pendingHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: signupScreen!,
      values: { personFirstName: "Ana", personEmail: "ana@example.com" },
      status: "pending",
    }));
    expect(pendingHtml).toContain("Criar sua Personal dWallet");
    expect(pendingHtml).toContain("Resultado no app:");
    expect(pendingHtml).toContain("Toque em Seguir");

    const failedEvidence: Evidence = {
      actionId: "step2_person_signup",
      actionTitle: "Criar Personal dWallet",
      status: "executed",
      ok: false,
      httpStatus: 403,
      message: "Não foi possível abrir a carteira com os dados informados.",
      responseBody: { reason: "forbidden" },
      executedAt: "2026-05-05T18:15:00.000Z",
    };
    const failedHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: signupScreen!,
      values: { personFirstName: "Ana", personEmail: "ana@example.com" },
      evidence: failedEvidence,
      status: "failed",
    }));
    expect(failedHtml).toContain("Não foi possível continuar");
    expect(failedHtml).toContain("Revise os dados e tente novamente");
    expect(failedHtml).toContain("Não foi possível abrir a carteira");
  });

  it("renders verification-code screens with dedicated OTP input and mapped Dataprev action ids", () => {
    const personalSendInput = buildExecuteActionInput("step2_person_send_code", { personEmail: "cidadao@example.com" });
    const businessVerifyInput = buildExecuteActionInput("step1_employee_verify_code", { employeeEmail: "colaborador@example.com", employeeVerificationCode: "123456" });
    const personalHtml = renderToStaticMarkup(React.createElement(DirectScreenVariablesPanel, {
      variables: [
        { key: "personEmail", label: "E-mail", section: "Pessoa física", placeholder: "cidadao@example.com", type: "email", description: "Identificador para envio de código." },
        { key: "personVerificationCode", label: "Código de verificação", section: "Pessoa física", placeholder: "000000", description: "OTP recebido por e-mail." },
      ],
      values: { personEmail: "cidadao@example.com", personVerificationCode: "654321" },
      activeFields: [{ key: "personVerificationCode", label: "Código de verificação", placeholder: "000000", required: true }],
      screenId: "verificacao-email",
      screenTitle: "Verificação de e-mail",
      group: "onboarding",
      onChange: () => undefined,
    }));

    expect(personalSendInput.actionId).toBe("step2_person_send_code");
    expect(businessVerifyInput.actionId).toBe("step1_employee_verify_code");
    expect(businessVerifyInput.state.employeeVerificationCode).toBe("123456");
    expect(personalHtml).toContain("Código de verificação");
    expect(personalHtml).toContain("654321");
    expect(personalHtml).toContain("direct-verificacao-email-personVerificationCode");
  });

  it("maps Business financial app screens to BTG APIs and keeps Pix key registration gap explicit", () => {
    const orderedActionIds = businessScreens.map(screen => screen.actionId).filter(Boolean);
    expect(orderedActionIds).toContain("btg_get_balance");
    expect(orderedActionIds).toContain("btg_get_statement");
    expect(orderedActionIds).toContain("btg_create_pix_instant_collection");
    expect(orderedActionIds).toContain("btg_create_payment");
    expect(orderedActionIds).toContain("btg_register_pix_key_gap");

    const pixKeyScreen = businessScreens.find(screen => screen.actionId === "btg_register_pix_key_gap");
    expect(pixKeyScreen?.title).toContain("Gerenciar chave Pix");
    expect(pixKeyScreen?.apiHint).toContain("não expõe endpoint");

    const paymentInput = buildExecuteActionInput("btg_create_payment", { btgBarcode: "800800", btgAmount: "1.10", btgPaymentDate: "2026-05-05" });
    expect(paymentInput.actionId).toBe("btg_create_payment");
    expect(paymentInput.state.btgBarcode).toBe("800800");
  });

  it("renders BTG financial response in the same user-facing mobile app shell", () => {
    const screen = businessScreens.find(item => item.actionId === "btg_get_statement");
    expect(screen).toBeDefined();
    const evidence: Evidence = {
      actionId: "btg_get_statement",
      actionTitle: "Extrato empresarial",
      status: "executed",
      ok: true,
      httpStatus: 200,
      requestBody: { accountId: "acc_123", startDate: "2026-04-05", endDate: "2026-05-05" },
      responseBody: { items: [{ description: "PIX RECEBIDO", amount: 1.1 }], nextPage: null },
      stateUpdates: { btgLastStatementStatus: "consultado" },
      message: "Extrato BTG consultado com retorno sanitizado.",
      executedAt: "2026-05-05T16:30:00.000Z",
    };
    const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: screen!,
      values: { btgAccountId: "acc_123", btgStartDate: "2026-04-05", btgEndDate: "2026-05-05" },
      evidence,
      status: "done",
    }));

    expect(html).toContain("Carteira de dados");
    expect(html).toContain("Extrato");
    expect(html).toContain("acc_123");
    expect(html).toContain("Extrato BTG consultado");
    expect(html).toContain("btgLastStatementStatus: consultado");
  });

  it("renders Personal financial screens for balance, statement, Pix receiving, Pix key gap and payment inside the mobile shell", () => {
    const required = [
      { actionId: "btg_get_balance", label: "Saldo da carteira", valueKey: "btgAccountId", value: "acc_person_123" },
      { actionId: "btg_get_statement", label: "Extrato", valueKey: "btgStartDate", value: "2026-04-05" },
      { actionId: "btg_register_pix_key_gap", label: "Cadastrar chave Pix", valueKey: "btgPixKey", value: "cidadao@example.com" },
      { actionId: "btg_create_pix_instant_collection", label: "Receber Pix", valueKey: "btgAmount", value: "1.10" },
      { actionId: "btg_create_payment", label: "Pagar conta", valueKey: "btgBarcode", value: "800800" },
    ];

    for (const item of required) {
      const screen = personalScreens.find(screen => screen.actionId === item.actionId && screen.appEmulation);
      expect(screen, `Personal screen for ${item.actionId}`).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
        screen: screen!,
        values: { btgAccountId: "acc_person_123", btgStartDate: "2026-04-05", btgEndDate: "2026-05-05", btgPixKey: "cidadao@example.com", btgAmount: "1.10", btgBarcode: "800800", btgPaymentDate: "2026-05-05" },
        status: "pending",
      }));

      expect(html).toContain("gov.br");
      expect(html).toContain("Carteira de dados");
      expect(html).toContain(item.label);
      expect(html).toContain(String(item.value));
      expect(html).toContain("Resultado no app");
    }
  });

  it("renders Business financial screens for balance, statement, Pix receiving, Pix key gap and payment inside the mobile shell", () => {
    const required = [
      { actionId: "btg_get_balance", label: "Saldo empresarial", value: "acc_biz_123" },
      { actionId: "btg_get_statement", label: "Extrato", value: "2026-05-05" },
      { actionId: "btg_register_pix_key_gap", label: "Chaves Pix", value: "financeiro@empresa.gov.br" },
      { actionId: "btg_create_pix_instant_collection", label: "Receber Pix", value: "1.10" },
      { actionId: "btg_create_payment", label: "Enviar pagamento", value: "800800" },
    ];

    for (const item of required) {
      const screen = businessScreens.find(screen => screen.actionId === item.actionId && screen.appEmulation);
      expect(screen, `Business screen for ${item.actionId}`).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
        screen: screen!,
        values: { btgAccountId: "acc_biz_123", btgStartDate: "2026-04-05", btgEndDate: "2026-05-05", btgPixKey: "financeiro@empresa.gov.br", btgAmount: "1.10", btgBarcode: "800800", btgPaymentDate: "2026-05-05" },
        status: "pending",
      }));

      expect(html).toContain("gov.br");
      expect(html).toContain("Carteira de dados");
      expect(html).toContain(item.label);
      expect(html).toContain(String(item.value));
      expect(html).toContain("Resultado no app");
    }
  });

  it("keeps the mobile gov.br shell on account creation, OTP, login and wallet-opening screens across Personal and Business", () => {
    const personalRequired = ["step2_person_signup", "step2_person_send_code", "step2_person_verify_code"];
    const businessRequired = ["step1_employee_signup", "step1_employee_send_code", "step1_employee_verify_code", "step1_employee_signin", "step1_business_create"];

    for (const actionId of personalRequired) {
      const screen = personalScreens.find(screen => screen.actionId === actionId);
      expect(screen, `Personal shell screen for ${actionId}`).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
        screen: screen!,
        values: { personEmail: "cidadao@example.com", personVerificationCode: "123456" },
        status: "pending",
      }));

      expect(html).toContain("gov.br");
      expect(html).toContain("Carteira de dados");
      expect(html).toContain(screen!.primaryCta);
      expect(html).toContain("Resultado no app");
    }

    for (const actionId of businessRequired) {
      const screen = businessScreens.find(screen => screen.actionId === actionId);
      expect(screen, `Business shell screen for ${actionId}`).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
        screen: screen!,
        values: { employeeEmail: "colaborador@example.com", employeePassword: "Senha123!", employeeVerificationCode: "123456", businessName: "Empresa GovBR", businessCnpj: "00000000000100" },
        status: "pending",
      }));

      expect(html).toContain("gov.br");
      expect(html).toContain("Carteira de dados");
      expect(html).toContain(screen!.primaryCta);
      expect(html).toContain("Resultado no app");
    }
  });

  it("derives visual status from the active action, evidence and API availability", () => {
    const executableScreen = { actionId: "wallet.run" };
    const localScreen = {};

    expect(getVisualStatus(executableScreen as never, undefined, "wallet.run")).toBe("running");
    expect(getVisualStatus(localScreen as never, undefined, undefined)).toBe("missing");
    expect(getVisualStatus(executableScreen as never, undefined, undefined)).toBe("pending");
    expect(getVisualStatus(executableScreen as never, { ok: true, status: "executed" } as Evidence, undefined)).toBe("done");
    expect(getVisualStatus(executableScreen as never, { ok: false, status: "failed" } as Evidence, undefined)).toBe("failed");
  });
});
