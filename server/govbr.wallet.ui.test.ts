import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvidenceBox, getVisualStatus, type Evidence } from "../client/src/pages/GovBRWalletApp";

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
