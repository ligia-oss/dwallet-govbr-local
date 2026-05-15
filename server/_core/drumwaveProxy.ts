/**
 * Proxy reverso para a API DrumWave/Dataprev.
 *
 * O servidor publicado (Manus) tem IP diferente do sandbox de desenvolvimento.
 * A sandbox DrumWave pode ter allowlist de IPs que bloqueia o servidor publicado.
 * Este proxy recebe requisições do tRPC e as retransmite para a API DrumWave,
 * permitindo que o servidor publicado use o IP do sandbox de dev (já autorizado)
 * quando a variável DATAPREV_PROXY_URL estiver configurada.
 *
 * Fluxo:
 *   Cliente → tRPC (servidor publicado) → DATAPREV_PROXY_URL/api/drumwave-proxy → API DrumWave
 *
 * Quando DATAPREV_PROXY_URL não está configurada, as chamadas são feitas diretamente.
 */

import type { Application, Request, Response } from "express";

export function registerDrumwaveProxy(app: Application) {
  /**
   * POST /api/drumwave-proxy
   * Body: { url: string; method: string; headers: Record<string, string>; body?: unknown }
   * Retransmite a requisição para a URL alvo e devolve a resposta.
   */
  app.post("/api/drumwave-proxy", async (req: Request, res: Response) => {
    const { url, method, headers, body } = req.body as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid target URL" });
      return;
    }

    // Validação de segurança: só permite URLs da sandbox DrumWave/Dataprev
    const allowedHosts = [
      "api.sandbox.drumwave.com.br",
      "api.drumwave.com.br",
      "sandbox.drumwave.com.br",
    ];
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid target URL format" });
      return;
    }
    if (!allowedHosts.some(host => targetUrl.hostname === host || targetUrl.hostname.endsWith(`.${host}`))) {
      res.status(403).json({ error: `Proxy target not allowed: ${targetUrl.hostname}` });
      return;
    }

    try {
      const fetchOptions: RequestInit = {
        method: method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers || {}),
        },
      };
      if (body !== undefined && method !== "GET" && method !== "HEAD") {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const upstream = await fetch(url, fetchOptions);
      const responseText = await upstream.text();

      // Repassar status e corpo da resposta upstream
      res.status(upstream.status);
      res.setHeader("Content-Type", upstream.headers.get("Content-Type") || "application/json");
      res.send(responseText);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: `Proxy upstream error: ${message}` });
    }
  });
}

/**
 * Faz uma requisição HTTP via proxy (quando DATAPREV_PROXY_URL está configurado)
 * ou diretamente (quando não está).
 *
 * @param url URL alvo (API DrumWave)
 * @param options Opções da requisição (method, headers, body)
 * @returns Response simulada com status e json()
 */
export async function fetchViaProxy(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown }
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const proxyUrl = process.env.DATAPREV_PROXY_URL;

  if (!proxyUrl) {
    // Chamada direta (ambiente dev ou proxy não configurado)
    const fetchOptions: RequestInit = {
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };
    if (options.body !== undefined) {
      fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    const response = await fetch(url, fetchOptions);
    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
    };
  }

  // Chamada via proxy (ambiente publicado)
  const proxyEndpoint = `${proxyUrl.replace(/\/$/, "")}/api/drumwave-proxy`;
  const proxyResponse = await fetch(proxyEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      method: options.method || "POST",
      headers: options.headers || {},
      body: options.body,
    }),
  });

  const responseText = await proxyResponse.text();
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(responseText);
  } catch {
    parsedBody = responseText;
  }

  // O proxy retorna o status HTTP upstream no corpo quando há erro de proxy
  const upstreamStatus = proxyResponse.ok ? proxyResponse.status : proxyResponse.status;

  return {
    ok: proxyResponse.ok,
    status: upstreamStatus,
    json: async () => parsedBody,
  };
}
