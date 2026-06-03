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
      "drumwave.com",
      "drumwave.com.br",
      "k8s.int.dev.drumwave.com",
      // offers-service e dsp-api (confirmados no Slack por Mala/Meena)
      "offers-service.k8s.int.dev.drumwave.com",
      "dsp-api.k8s.int.dev.drumwave.com",
      "cart-service.k8s.int.dev.drumwave.com",
      "order-service.k8s.int.dev.drumwave.com",
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
      // IMPORTANT: wrap in JSON envelope so the caller can read the real upstream status
      res.status(200).json({
        upstreamStatus: upstream.status,
        body: (() => { try { return JSON.parse(responseText); } catch { return responseText; } })(),
      });
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
async function fetchDirect(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown }
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
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

async function fetchViaProxyEndpoint(
  proxyUrl: string,
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown }
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
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
  const envelope = await proxyResponse.json() as { upstreamStatus?: number; body?: unknown };
  const realStatus = envelope.upstreamStatus ?? proxyResponse.status;
  const parsedBody = envelope.body ?? {};
  return {
    ok: realStatus >= 200 && realStatus < 300,
    status: realStatus,
    json: async () => parsedBody,
  };
}

/**
 * Estratégia: sempre tenta chamada direta primeiro.
 * Se a chamada direta falhar com 403/401 (IP não autorizado) e houver DATAPREV_PROXY_URL
 * configurado, tenta via proxy como fallback.
 * Isso garante que tanto o sandbox (IP autorizado) quanto o servidor publicado
 * (IP pode não estar na allowlist) funcionem corretamente.
 */
export async function fetchViaProxy(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown }
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  // 1. Sempre tenta chamada direta primeiro
  try {
    const directResult = await fetchDirect(url, options);
    // Se a chamada direta funcionou (não é 401/403), retorna o resultado
    if (directResult.status !== 401 && directResult.status !== 403) {
      return directResult;
    }
    // Chamada direta retornou 401/403 — pode ser bloqueio de IP
    const proxyUrl = process.env.DATAPREV_PROXY_URL;
    if (!proxyUrl) {
      // Sem proxy configurado, retorna o resultado direto (mesmo que seja 403)
      return directResult;
    }
    // 2. Fallback: tenta via proxy
    console.log(`[DrumwaveProxy] Chamada direta retornou ${directResult.status}, tentando via proxy: ${proxyUrl}`);
    return await fetchViaProxyEndpoint(proxyUrl, url, options);
  } catch (directErr) {
    // Erro de rede na chamada direta — tenta via proxy se disponível
    const proxyUrl = process.env.DATAPREV_PROXY_URL;
    if (!proxyUrl) throw directErr;
    console.log(`[DrumwaveProxy] Erro na chamada direta (${directErr instanceof Error ? directErr.message : directErr}), tentando via proxy: ${proxyUrl}`);
    return await fetchViaProxyEndpoint(proxyUrl, url, options);
  }
}
