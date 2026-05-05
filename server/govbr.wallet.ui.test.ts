import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildExecuteActionInput, CredentialsPanel, DirectScreenVariablesPanel, EvidenceBox, getVisualStatus, M2MTokenPanel, TestVariablesPanel, updateRunStateValue, type Evidence, type M2MAuthResult } from "../client/src/pages/GovBRWalletApp";

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

  it("renders the Passo 0 M2M panel with sanitized token metadata and explicit authentication button", () => {
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
      message: "Passo 0 executado: token M2M armazenado no servidor até a expiração.",
      executedAt: "2026-05-05T15:00:00.000Z",
    };

    const html = renderToStaticMarkup(React.createElement(M2MTokenPanel, {
      result,
      isRunning: false,
      onAuthenticate: () => undefined,
    }));

    expect(html).toContain("Passo 0");
    expect(html).toContain("Passo 0 — Autenticar M2M");
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
    const credentialsHtml = renderToStaticMarkup(React.createElement(CredentialsPanel, { baseUrl: "https://sandbox.test.local", configured: true }));

    expect(variablesHtml).toContain("Variáveis de entrada editáveis");
    expect(variablesHtml).toContain("teste@example.com");
    expect(variablesHtml).toContain("redigido");
    expect(credentialsHtml).toContain("Credenciais e chaves");
    expect(credentialsHtml).toContain("DATAPREV_CLIENT_SECRET");
    expect(credentialsHtml).toContain("Settings → Secrets");
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
