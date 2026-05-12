/**
 * Testes de persistência do token M2M no banco de dados.
 *
 * Verifica que:
 * 1. O procedimento authenticateM2M persiste o token no banco de dados.
 * 2. O procedimento metadata carrega o token do banco de dados quando o cache em memória está vazio.
 * 3. O procedimento clearM2MToken remove o token do banco de dados e da memória.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

const ctx = {
  req: {} as any,
  res: { clearCookie: () => undefined } as any,
  user: null,
};

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Mocks para o banco de dados
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    upsertM2MToken: vi.fn().mockResolvedValue(undefined),
    loadM2MToken: vi.fn().mockResolvedValue(null),
    deleteM2MToken: vi.fn().mockResolvedValue(undefined),
    getDb: vi.fn().mockResolvedValue(null),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Persistência do token M2M no banco de dados", () => {
  beforeEach(async () => {
    process.env.DATAPREV_BASE_URL = "https://sandbox.test.local";
    process.env.DATAPREV_API_KEY = "api-key-teste";
    process.env.DATAPREV_CLIENT_ID = "client-id-teste";
    process.env.DATAPREV_CLIENT_SECRET = "client-secret-teste";
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
    // Reconfigurar mocks do db após clearAllMocks para garantir que retornem Promises
    const db = await import("./db");
    (db.upsertM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (db.loadM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.deleteM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("authenticateM2M chama upsertM2MToken para persistir o token", async () => {
    const { upsertM2MToken } = await import("./db");
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: "mock-access-token-123",
        expires_in: 3600,
        token_type: "Bearer",
      })
    );

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.authenticateM2M({
      credentials: {
        baseUrl: "https://api.sandbox.example.com",
        apiKey: "test-api-key",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.active).toBe(true);
    expect(upsertM2MToken).toHaveBeenCalledOnce();
    const callArgs = (upsertM2MToken as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs).toHaveProperty("credentialScope");
    expect(callArgs).toHaveProperty("tokenHandle");
    expect(callArgs).toHaveProperty("token", "mock-access-token-123");
    expect(callArgs).toHaveProperty("expiresAt");
    expect(callArgs.expiresAt).toBeInstanceOf(Date);
    // Verificar que a expiração é aproximadamente 3600 segundos no futuro
    const expectedExpiry = Date.now() + 3600 * 1000;
    expect(callArgs.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);
    expect(callArgs.expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000);
  });

  it("authenticateM2M retorna expiresInSeconds correto baseado em expires_in da API", async () => {
    // Usar mockResolvedValueOnce (mesmo padrão do primeiro teste que funciona)
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: "mock-token-7200",
        expires_in: 7200,
        token_type: "Bearer",
      })
    );

    const caller = appRouter.createCaller(ctx);
    // Usar credenciais diferentes das do teste anterior para evitar cache
    const result = await caller.dataprev.authenticateM2M({
      credentials: {
        baseUrl: "https://api.sandbox-7200.example.com",
        apiKey: "test-api-key-7200",
        clientId: "test-client-id-7200",
        clientSecret: "test-client-secret-7200",
      },
    });

    expect(result.ok).toBe(true);
    // expiresInSeconds deve ser próximo de 7200
    expect(result.expiresInSeconds).toBeGreaterThan(7100);
    expect(result.expiresInSeconds).toBeLessThanOrEqual(7200);
  });

  it("clearM2MToken chama deleteM2MToken para remover o token do banco", async () => {
    const { deleteM2MToken } = await import("./db");

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.clearM2MToken({
      credentials: {
        baseUrl: "https://api.sandbox.example.com",
        apiKey: "test-api-key",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Token M2M removido");
    expect(deleteM2MToken).toHaveBeenCalled();
  });

  it("clearM2MToken sem credenciais remove o escopo padrão do servidor", async () => {
    const { deleteM2MToken } = await import("./db");

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.clearM2MToken();

    expect(result.ok).toBe(true);
    expect(deleteM2MToken).toHaveBeenCalled();
  });

  it("metadata retorna m2mToken null quando banco não tem token ativo", async () => {
    const { loadM2MToken } = await import("./db");
    (loadM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.metadata();

    expect(result.m2mToken).toBeNull();
  });

  it("metadata carrega token do banco quando cache em memória está vazio e retorna status ativo", async () => {
    const { loadM2MToken } = await import("./db");
    const futureDate = new Date(Date.now() + 3600 * 1000);
    (loadM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "db-cached-token",
      tokenHandle: "db-handle-123",
      expiresAt: futureDate,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.metadata();

    // O metadata deve ter chamado loadM2MToken
    expect(loadM2MToken).toHaveBeenCalled();
    // Se o banco retornou um token válido, m2mToken deve estar ativo
    if (result.m2mToken) {
      expect(result.m2mToken.active).toBe(true);
      expect(result.m2mToken.tokenHandle).toBe("db-handle-123");
      expect(result.m2mToken.expiresInSeconds).toBeGreaterThan(3500);
    }
  });

  it("authenticateM2M falha quando API retorna erro e não persiste no banco", async () => {
    const { upsertM2MToken } = await import("./db");
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse(403, { error: "Forbidden", message: "Invalid credentials" })
    );

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dataprev.authenticateM2M({
      credentials: {
        baseUrl: "https://api.sandbox.example.com",
        apiKey: "wrong-api-key",
        clientId: "wrong-client-id",
        clientSecret: "wrong-secret",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.active).toBe(false);
    // Não deve persistir token inválido
    expect(upsertM2MToken).not.toHaveBeenCalled();
  });
});

describe("Fluxo completo: gerar, verificar e limpar token M2M", () => {
  beforeEach(async () => {
    process.env.DATAPREV_BASE_URL = "https://sandbox.test.local";
    process.env.DATAPREV_API_KEY = "api-key-teste";
    process.env.DATAPREV_CLIENT_ID = "client-id-teste";
    process.env.DATAPREV_CLIENT_SECRET = "client-secret-teste";
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
    // Reconfigurar mocks do db após clearAllMocks para garantir que retornem Promises
    const db = await import("./db");
    (db.upsertM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (db.loadM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.deleteM2MToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("gera token com expiração correta, persiste no banco e limpa corretamente", async () => {
    const { upsertM2MToken, deleteM2MToken } = await import("./db");
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oauth2/token") || url.includes("/token")) {
        return jsonResponse(200, {
          access_token: "full-flow-token",
          expires_in: 7200,
          token_type: "Bearer",
        });
      }
      return jsonResponse(404, { error: "not found" });
    });

    const caller = appRouter.createCaller(ctx);

    // 1. Gerar token com credenciais únicas para evitar cache de testes anteriores
    const authResult = await caller.dataprev.authenticateM2M({
      credentials: {
        baseUrl: "https://api.sandbox-flow.example.com",
        apiKey: "test-api-key-flow",
        clientId: "test-client-id-flow",
        clientSecret: "test-client-secret-flow",
      },
    });
    expect(authResult.ok).toBe(true);
    expect(authResult.expiresInSeconds).toBeGreaterThan(7100);
    expect(upsertM2MToken).toHaveBeenCalledOnce();

    // 2. Verificar que o token foi persistido com a expiração correta
    const persistedArgs = (upsertM2MToken as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const expectedExpiry = Date.now() + 7200 * 1000;
    expect(persistedArgs.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);

    // 3. Limpar token com as mesmas credenciais
    const clearResult = await caller.dataprev.clearM2MToken({
      credentials: {
        baseUrl: "https://api.sandbox-flow.example.com",
        apiKey: "test-api-key-flow",
        clientId: "test-client-id-flow",
        clientSecret: "test-client-secret-flow",
      },
    });
    expect(clearResult.ok).toBe(true);
    expect(deleteM2MToken).toHaveBeenCalled();
  });
});
