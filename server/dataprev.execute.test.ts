import { createHmac } from "node:crypto";
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

  it("usa variáveis editáveis no cadastro Personal e redige senha na evidência", async () => {
    const caller = appRouter.createCaller(ctx);
    let capturedBody: any;
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(201, { id: "person-1" });
    }) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step2_person_signup",
      state: {
        runId: "129",
        personEmail: "ana.teste@example.com",
        personFirstName: "Ana",
        personLastName: "Teste",
        personPhone: "+551188887777",
        personPassword: "SenhaVariavel123!",
        personAddressLine: "Avenida Teste 10",
        personCity: "Brasília",
        personState: "DF",
        personZip: "70000-000",
      },
    });

    expect(evidence.ok).toBe(true);
    expect(capturedBody).toEqual(expect.objectContaining({
      email: "ana.teste@example.com",
      firstName: "Ana",
      lastName: "Teste",
      phoneNumber: "+551188887777",
      password: "SenhaVariavel123!",
    }));
    expect(capturedBody.address).toEqual({ state: "DF" });
    expect(capturedBody.address).not.toHaveProperty("line1");
    expect(capturedBody.address).not.toHaveProperty("city");
    expect(capturedBody.address).not.toHaveProperty("zip");
    expect(JSON.stringify(evidence.requestBody)).not.toContain("SenhaVariavel123!");
    expect(JSON.stringify(evidence.requestBody)).toContain("<REDACTED>");
  });

  it("envia somente a UF no endereço dos cadastros Business para respeitar o contrato da sandbox", async () => {
    const caller = appRouter.createCaller(ctx);
    const capturedBodies: any[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oauth2/token")) return jsonResponse(200, { access_token: "m2m-token", expires_in: 3600 });
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (url.includes("/v1/dwallet/auth/signin")) return jsonResponse(200, { accessToken: "eyJemployee.token.jwt", dWalletId: "employee-dwallet" });
      if (parsedBody) capturedBodies.push(parsedBody);
      return jsonResponse(201, { id: "business-1" });
    }) as any;

    await caller.dataprev.executeAction({
      actionId: "step1_employee_signup",
      state: { runId: "130", employeeEmail: "colaborador-address@example.com", businessAddressLine: "Rua Removida", businessCity: "Curitiba", businessState: "PR", businessZip: "80000-000" },
    });
    const signin = await caller.dataprev.executeAction({
      actionId: "step1_employee_signin",
      state: { runId: "131", employeeEmail: "colaborador-address@example.com" },
    });
    await caller.dataprev.executeAction({
      actionId: "step1_business_create",
      state: { runId: "132", employeeTokenHandle: signin.stateUpdates?.employeeTokenHandle, businessCnpj: "11222333000181", businessAddressLine: "Rua Removida", businessCity: "Curitiba", businessState: "PR", businessZip: "80000-000" },
    });

    expect(capturedBodies).toHaveLength(2);
    expect(capturedBodies[0].address).toEqual({ state: "PR" });
    expect(capturedBodies[1].address).toEqual({ state: "PR" });
    for (const body of capturedBodies) {
      expect(body.address).not.toHaveProperty("line1");
      expect(body.address).not.toHaveProperty("city");
      expect(body.address).not.toHaveProperty("zip");
    }
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

  it("executa explicitamente o Passo 0 M2M, armazena o token em cache e retorna apenas metadados sanitizados", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(200, { access_token: "eyJm2m.token.jwt", expires_in: 1800, token_type: "Bearer" })) as any;

    const result = await caller.dataprev.authenticateM2M();
    const metadata = await caller.dataprev.metadata();

    expect(result.status).toBe("executed");
    expect(result.ok).toBe(true);
    expect(result.active).toBe(true);
    expect(result.tokenHandle).toEqual(expect.any(String));
    expect(result.expiresAt).toEqual(expect.any(String));
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(metadata.m2mToken?.tokenHandle).toBe(result.tokenHandle);
    expect(metadata.m2mToken?.active).toBe(true);
    expect(JSON.stringify(result)).not.toContain("eyJm2m.token.jwt");
    expect(JSON.stringify(result)).not.toContain("api-key-teste");
    expect(JSON.stringify(result)).not.toContain("client-secret-teste");
    expect(result.message).toContain("armazenado no servidor");
  });

  it("mapeia o envio de código Personal com Accept-Language e payload da coleção Postman", async () => {
    const caller = appRouter.createCaller(ctx);
    const calls: Array<{ url: string; headers: Record<string, string>; body?: any }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, headers: init?.headers as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.includes("/oauth2/token")) return jsonResponse(200, { access_token: "eyJm2m.send.jwt", expires_in: 3600 });
      return jsonResponse(200, { delivery: "email", status: "sent" });
    }) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step2_person_send_code",
      state: { personEmail: "cidadao@example.com" },
    });

    expect(evidence.status).toBe("executed");
    expect(evidence.ok).toBe(true);
    expect(calls[1].url).toBe("https://sandbox.test.local/v1/auth/token/iam/idp/users/send-code");
    expect(calls[1].headers["Accept-Language"]).toBe("pt-br");
    expect(calls[1].body).toEqual({ value: "cidadao@example.com", attribute: "email" });
    expect(JSON.stringify(evidence)).not.toContain("eyJm2m.send.jwt");
  });

  it("mapeia a confirmação de código Business com secretHash server-side e evidência sanitizada", async () => {
    const caller = appRouter.createCaller(ctx);
    let verifyBody: any;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oauth2/token")) return jsonResponse(200, { access_token: "eyJm2m.verify.jwt", expires_in: 3600 });
      verifyBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      return jsonResponse(200, { verified: true });
    }) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step1_employee_verify_code",
      state: { employeeEmail: "colaborador@example.com", employeeVerificationCode: "123456" },
    });

    const expectedHash = createHmac("sha256", "client-secret-teste").update("colaborador@example.comclient-id-teste").digest("base64");
    expect(evidence.status).toBe("executed");
    expect(verifyBody).toEqual({ attribute: "email", value: "colaborador@example.com", code: "123456", refreshToken: "", secretHash: expectedHash, clientId: "client-id-teste" });
    expect(JSON.stringify(evidence.requestBody)).toContain("<REDACTED>");
    expect(JSON.stringify(evidence.requestBody)).not.toContain(expectedHash);
    expect(JSON.stringify(evidence)).not.toContain("client-secret-teste");
  });

  it("bloqueia validação OTP sem código antes de chamar a API externa", async () => {
    const caller = appRouter.createCaller(ctx);
    globalThis.fetch = vi.fn(async () => jsonResponse(200, { access_token: "nao-deveria-ser-usado", expires_in: 3600 })) as any;

    const evidence = await caller.dataprev.executeAction({
      actionId: "step2_person_verify_code",
      state: { personEmail: "cidadao@example.com" },
    });

    expect(evidence.status).toBe("not_executable");
    expect(evidence.ok).toBe(false);
    expect(evidence.message).toContain("código recebido");
    expect(globalThis.fetch).not.toHaveBeenCalled();
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
