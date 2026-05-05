import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

const ctx = {
  req: {} as any,
  res: {
    clearCookie: () => undefined,
  } as any,
  user: null,
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

describe("btgRouter", () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...previousEnv };
    delete process.env.BTG_BASE_URL;
    delete process.env.BTG_BASE_PATH;
    delete process.env.BTG_COMPANY_ID;
    delete process.env.BTG_ACCESS_TOKEN;
    delete process.env.BTG_BEARER_TOKEN;
    delete process.env.BTG_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...previousEnv };
  });

  it("expõe metadados das ações BTG aplicáveis à jornada financeira", async () => {
    const caller = appRouter.createCaller(ctx);
    const metadata = await caller.btg.metadata();
    const ids = metadata.actions.map(action => action.id);

    expect(metadata.credentialsConfigured).toBe(false);
    expect(metadata.initialState).toHaveProperty("btgAccountId");
    expect(ids).toContain("btg_get_balance");
    expect(ids).toContain("btg_get_statement");
    expect(ids).toContain("btg_create_pix_instant_collection");
    expect(ids).toContain("btg_create_payment");
    expect(ids).toContain("btg_register_pix_key_gap");
  });

  it("registra a lacuna de cadastro de chave Pix sem tentar chamada externa", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const caller = appRouter.createCaller(ctx);
    const evidence = await caller.btg.executeAction({
      actionId: "btg_register_pix_key_gap",
      state: { btgCompanyId: "company_123", btgAccessToken: "token-super-secreto", btgBaseUrl: "https://btg.example.test" },
    });

    expect(evidence.provider).toBe("BTG Pactual");
    expect(evidence.status).toBe("not_executable");
    expect(evidence.ok).toBe(true);
    expect(evidence.message).toContain("Endpoint de cadastro/gestão de chave Pix");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retorna pré-requisito não atendido quando extrato não recebe conta BTG", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const caller = appRouter.createCaller(ctx);
    const evidence = await caller.btg.executeAction({
      actionId: "btg_get_statement",
      state: { btgCompanyId: "company_123", btgAccessToken: "token-super-secreto", btgBaseUrl: "https://btg.example.test" },
    });

    expect(evidence.status).toBe("not_executable");
    expect(evidence.ok).toBe(false);
    expect(evidence.message).toContain("Conta BTG é obrigatório");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("executa pagamento BTG mockado com headers e resposta sanitizados", async () => {
    process.env.BTG_BASE_URL = "https://btg.example.test";
    process.env.BTG_COMPANY_ID = "company_123";
    process.env.BTG_ACCESS_TOKEN = "token-super-secreto";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      paymentId: "pay_123",
      authorization: "Bearer token-super-secreto",
      token: "token-super-secreto",
      status: "CREATED",
    }, { status: 201 }));

    const caller = appRouter.createCaller(ctx);
    const evidence = await caller.btg.executeAction({
      actionId: "btg_create_payment",
      state: {
        btgBarcode: "800800000000000000000000000000000000000000000000",
        btgAmount: 12.34,
        btgPaymentDate: "2026-05-05",
        btgDebitBranchCode: "50",
        btgDebitAccountNumber: "000000001",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/company_123/banking/payments");
    expect(evidence.status).toBe("executed");
    expect(evidence.httpStatus).toBe(201);
    expect(evidence.requestHeaders?.Authorization).toBe("<REDACTED>");
    expect(JSON.stringify(evidence.responseBody)).not.toContain("token-super-secreto");
    expect(JSON.stringify(evidence.responseBody)).toContain("<REDACTED>");
    expect(evidence.requestBody).toMatchObject({
      items: [expect.objectContaining({ amount: 12.34, paymentDate: "2026-05-05" })],
    });
  });
});
