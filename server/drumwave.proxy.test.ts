/**
 * Testes para o módulo drumwaveProxy.ts
 *
 * Valida:
 * 1. fetchViaProxy sem DATAPREV_PROXY_URL → chamada direta
 * 2. fetchViaProxy com DATAPREV_PROXY_URL → chamada via proxy
 * 3. registerDrumwaveProxy → endpoint Express retransmite corretamente
 * 4. registerDrumwaveProxy → bloqueia hosts não autorizados
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import { fetchViaProxy, registerDrumwaveProxy } from "./_core/drumwaveProxy";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeMockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
    headers: { get: () => "application/json" },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// fetchViaProxy — modo direto (sem DATAPREV_PROXY_URL)
// ──────────────────────────────────────────────────────────────────────────────

describe("fetchViaProxy — modo direto", () => {
  const originalEnv = process.env.DATAPREV_PROXY_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.DATAPREV_PROXY_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATAPREV_PROXY_URL = originalEnv;
    } else {
      delete process.env.DATAPREV_PROXY_URL;
    }
    globalThis.fetch = originalFetch;
  });

  it("deve chamar a URL alvo diretamente quando DATAPREV_PROXY_URL não está configurado", async () => {
    const mockFetch = makeMockFetch(200, { access_token: "tok123" });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchViaProxy("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token", {
      method: "POST",
      headers: { "x-api-key": "key123" },
      body: { client_id: "cid", client_secret: "csec", grant_type: "client_credentials" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl] = mockFetch.mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect((body as { access_token: string }).access_token).toBe("tok123");
  });

  it("deve retornar ok: false quando a API retorna status 403", async () => {
    const mockFetch = makeMockFetch(403, { message: "Forbidden" });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchViaProxy("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token", {
      method: "POST",
      headers: { "x-api-key": "bad-key" },
      body: { client_id: "x", client_secret: "y", grant_type: "client_credentials" },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// fetchViaProxy — modo proxy (com DATAPREV_PROXY_URL)
// ──────────────────────────────────────────────────────────────────────────────

describe("fetchViaProxy — modo proxy", () => {
  const originalEnv = process.env.DATAPREV_PROXY_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.DATAPREV_PROXY_URL = "https://dev-sandbox.example.com";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATAPREV_PROXY_URL = originalEnv;
    } else {
      delete process.env.DATAPREV_PROXY_URL;
    }
    globalThis.fetch = originalFetch;
  });

  it("deve chamar o endpoint proxy em vez da URL alvo diretamente", async () => {
    const mockFetch = makeMockFetch(200, { access_token: "proxied-tok" });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchViaProxy("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token", {
      method: "POST",
      headers: { "x-api-key": "key123" },
      body: { client_id: "cid", client_secret: "csec", grant_type: "client_credentials" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    // Deve chamar o proxy, não a URL alvo
    expect(calledUrl).toBe("https://dev-sandbox.example.com/api/drumwave-proxy");
    // O body do proxy deve conter a URL alvo
    const proxyBody = JSON.parse(calledInit.body as string) as { url: string; method: string };
    expect(proxyBody.url).toBe("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token");
    expect(proxyBody.method).toBe("POST");
    expect(result.ok).toBe(true);
    const body = await result.json();
    expect((body as { access_token: string }).access_token).toBe("proxied-tok");
  });

  it("deve retornar ok: false quando o proxy retorna status 403", async () => {
    const mockFetch = makeMockFetch(403, { message: "Forbidden" });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchViaProxy("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token", {
      method: "POST",
      headers: {},
      body: {},
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// registerDrumwaveProxy — endpoint Express
// ──────────────────────────────────────────────────────────────────────────────

describe("registerDrumwaveProxy — endpoint Express", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    const app = express();
    app.use(express.json());
    registerDrumwaveProxy(app);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    globalThis.fetch = originalFetch;
  });

  it("deve retornar 400 quando a URL alvo está ausente", async () => {
    const res = await fetch(`http://localhost:${port}/api/drumwave-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "POST" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Missing or invalid target URL/i);
  });

  it("deve retornar 403 quando o host alvo não está na allowlist", async () => {
    const res = await fetch(`http://localhost:${port}/api/drumwave-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://evil.example.com/steal-data",
        method: "POST",
        headers: {},
        body: {},
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Proxy target not allowed/i);
  });

  it("deve retransmitir a requisição para a URL alvo e devolver a resposta", async () => {
    // O servidor Express usa o fetch nativo para chamar a URL alvo.
    // Usamos node-fetch real aqui — apenas verificamos que a resposta do handler
    // contém os dados corretos (status 200 e corpo JSON válido).
    // Para evitar chamada real à API DrumWave, mockamos o fetch DENTRO do handler
    // substituindo globalmente após o servidor já estar escutando.
    const mockUpstream = makeMockFetch(200, { access_token: "tok-from-upstream" });

    // Instalar o mock após o servidor estar pronto para que o handler use o mock
    const savedFetch = globalThis.fetch;
    globalThis.fetch = mockUpstream as unknown as typeof fetch;

    try {
      // Usar http nativo para não passar pelo mock ao fazer a requisição ao servidor
      const http = await import("http");
      const responseData = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const postBody = JSON.stringify({
          url: "https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token",
          method: "POST",
          headers: { "x-api-key": "key123" },
          body: { client_id: "cid", client_secret: "csec", grant_type: "client_credentials" },
        });
        const req = http.request({
          hostname: "localhost",
          port,
          path: "/api/drumwave-proxy",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postBody) },
        }, (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
        });
        req.on("error", reject);
        req.write(postBody);
        req.end();
      });

      expect(responseData.status).toBe(200);
      const parsed = JSON.parse(responseData.body) as { access_token: string };
      expect(parsed.access_token).toBe("tok-from-upstream");

      // O mock deve ter sido chamado com a URL alvo (não o localhost)
      expect(mockUpstream).toHaveBeenCalledOnce();
      const [calledUrl] = mockUpstream.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toBe("https://api.sandbox.drumwave.com.br/v1/auth/token/iam/authn/services/oauth2/token");
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it("deve retornar 400 quando a URL alvo tem formato inválido", async () => {
    const res = await fetch(`http://localhost:${port}/api/drumwave-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "not-a-valid-url",
        method: "POST",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Invalid target URL format/i);
  });
});
