import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

const ctx = {
  req: {} as any,
  res: {
    clearCookie: () => undefined,
  } as any,
  user: null,
};

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("execução Dataprev", () => {
  beforeEach(() => {
    process.env.DATAPREV_BASE_URL = "https://sandbox.test.local";
    process.env.DATAPREV_API_KEY = "api-key-teste";
    process.env.DATAPREV_CLIENT_ID = "client-id-teste";
    process.env.DATAPREV_CLIENT_SECRET = "client-secret-teste";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("executa uma ação externa com sucesso e sanitiza cabeçalhos sensíveis", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(201, { id: "employee-1", tokens: { accessToken: "eyJabc.def.ghi" } })) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step1_employee_signup",
      state: { runId: "123", employeeEmail: "colaborador@example.com" },
    });

    expect(evidence.status).toBe("executed");
    expect(evidence.ok).toBe(true);
    expect(evidence.httpStatus).toBe(201);
    expect(evidence.requestHeaders?.["x-api-key"]).toBe("<REDACTED>");
    expect(JSON.stringify(evidence.responseBody)).not.toContain("eyJabc.def.ghi");
  });

  it("preserva evidência de falha quando a API responde fora da faixa esperada", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(500, { error: "sandbox indisponível" })) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step1_employee_signup",
      state: { runId: "124", employeeEmail: "erro@example.com" },
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.ok).toBe(false);
    expect(evidence.httpStatus).toBe(500);
    expect(evidence.responseBody).toEqual({ error: "sandbox indisponível" });
  });

  it("explica Forbidden em cadastro como provável divergência de DATAPREV_API_KEY", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(403, { message: "Forbidden" })) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step2_person_signup",
      state: { runId: "126", personEmail: "forbidden@example.com" },
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.ok).toBe(false);
    expect(evidence.httpStatus).toBe(403);
    expect(evidence.message).toContain("DATAPREV_API_KEY");
    expect(evidence.message).toContain("publicado");
  });

  it("retorna evidência sanitizada quando o passo zero M2M é recusado", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(403, { message: "Forbidden" })) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step10_commercial_dsps",
      state: { runId: "127" },
    });

    expect(evidence.status).toBe("failed");
    expect(evidence.ok).toBe(false);
    expect(evidence.httpStatus).toBe(403);
    expect(evidence.message).toContain("passo zero");
    expect(evidence.responseBody).toEqual(expect.objectContaining({ etapa: "passo_zero_m2m" }));
    expect(JSON.stringify(evidence)).not.toContain("api-key-teste");
  });

  it("atualiza o estado com identificadores opacos quando o login retorna token", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/token")) return jsonResponse(200, { access_token: "m2m-token", expires_in: 3600 });
      return jsonResponse(200, { accessToken: "eyJuser.token.jwt", dWalletId: "dwallet-123" });
    }) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step1_employee_signin",
      state: { runId: "125", employeeEmail: "login@example.com" },
    });

    expect(evidence.status).toBe("executed");
    expect(evidence.stateUpdates?.employeeTokenHandle).toEqual(expect.any(String));
    expect(evidence.stateUpdates?.employeeDwalletId).toBe("dwallet-123");
    expect(JSON.stringify(evidence)).not.toContain("eyJuser.token.jwt");
  });
});
