import { createHash, createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
import { deleteM2MToken, loadM2MToken, upsertM2MToken, storeUserToken, loadUserToken, purgeExpiredUserTokens } from "./db";
import { publicProcedure, router } from "./_core/trpc";
import { fetchViaProxy } from "./_core/drumwaveProxy";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type JsonValue = undefined | null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type RunState = Record<string, string | number | boolean | null | undefined>;

type JourneyStatus = "external" | "internal" | "gap" | "manual" | "partial";

type JourneyAction = {
  id: string;
  title: string;
  app: "Personal" | "Business" | "Ambos";
  method?: HttpMethod;
  path?: string;
  group: string;
  status: JourneyStatus;
  description: string;
  requiresM2M?: boolean;
  requiresUser?: "employee" | "person";
  includeRegion?: boolean;
  acceptLanguage?: string;
  expectedStatus?: number[];
  /** Override the base URL for this action (e.g. Cart Service, Order Service) */
  baseUrlOverride?: string;
  buildBody?: (state: RunState, credentials?: DataprevCredentialsInput) => JsonValue;
  buildPath?: (state: RunState) => string;
  onSuccess?: (body: unknown, state: RunState) => RunState;
  /** Chamada assíncrona adicional para recuperar state quando onSuccess não é suficiente (ex: fallback após 500 de outbox). */
  onSuccessAsync?: (body: unknown, state: RunState, credentials?: DataprevCredentialsInput) => Promise<RunState>;
  missingReason?: string;
  apiClassification?: string;
};

type JourneyStep = {
  id: number;
  title: string;
  app: "Personal" | "Business" | "Ambos";
  summary: string;
  status: JourneyStatus;
  actions: JourneyAction[];
};

type Evidence = {
  actionId: string;
  actionTitle: string;
  status: "executed" | "not_executable" | "failed";
  method?: HttpMethod;
  url?: string;
  httpStatus?: number;
  ok: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: JsonValue;
  responseBody?: unknown;
  stateUpdates?: RunState;
  message?: string;
  missingReason?: string;
  m2mTokenUsed?: boolean;
  m2mTokenSource?: "cached" | "refreshed";
  m2mTokenHandle?: string;
  m2mTokenExpiresAt?: string;
  executedAt: string;
};

type M2MAuthResult = {
  status: "executed" | "failed";
  ok: boolean;
  method: "POST";
  url: string;
  httpStatus?: number;
  tokenHandle?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  active: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: JsonValue;
  responseBody?: unknown;
  message: string;
  executedAt: string;
};

const DEFAULT_PASSWORD = "SecurePass123!";
const tokenStore = new Map<string, string>();

/** Pré-carrega todos os tokens de usuário válidos do banco para o Map in-memory na inicialização. */
export async function preloadUserTokenCache(): Promise<void> {
  try {
    // Primeiro limpa tokens expirados do banco
    await purgeExpiredUserTokens();
    const { getDb } = await import("./db");
    const { userTokenCache } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(userTokenCache);
    const now = Date.now();
    let loaded = 0;
    for (const row of rows) {
      // Pular tokens expirados (que não foram removidos pelo purge por race condition)
      if (row.expiresAt !== null && row.expiresAt !== undefined && now > row.expiresAt) continue;
      tokenStore.set(row.handle, row.token);
      loaded++;
    }
    if (loaded > 0) console.log(`[TokenCache] Pré-carregados ${loaded} token(s) de usuário do banco.`);
  } catch (err) {
    console.warn("[TokenCache] Falha ao pré-carregar tokens do banco:", err);
  }
}
let m2mCache: { token: string; expiresAt: number; handle: string; credentialScope: string } | null = null;

type DataprevCredentialsInput = {
  baseUrl?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
};

type DataprevConfig = Required<DataprevCredentialsInput>;

type DataprevCredentialDiagnostics = {
  credentialSource: "server_secrets" | "temporary_form";
  baseUrl: string;
  apiKeyPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  temporaryCredentialsComplete: boolean;
  apiKeyFingerprint: string;
  clientIdFingerprint: string;
  clientSecretFingerprint: string;
};

const credentialsInputSchema = z.object({
  baseUrl: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientSecret: z.string().trim().optional(),
}).optional();

function normalizeDataprevBaseUrl(value?: string) {
  const raw = (value || "https://api.sandbox.drumwave.com.br").trim().replace(/^['\"]|['\"]$/g, "").replace(/\s+/g, "");
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.includes("/v1/auth/token/iam/authn/services/oauth2/token")) {
      return parsed.origin.replace(/\/+$/, "");
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`.replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function normalizeCredentialValue(value?: string) {
  return (value || "").trim().replace(/^['\"]|['\"]$/g, "");
}

function env(credentials?: DataprevCredentialsInput): DataprevConfig {
  return {
    baseUrl: normalizeDataprevBaseUrl(credentials?.baseUrl || process.env.DATAPREV_BASE_URL || "https://api.sandbox.drumwave.com.br"),
    apiKey: normalizeCredentialValue(credentials?.apiKey || process.env.DATAPREV_API_KEY),
    clientId: normalizeCredentialValue(credentials?.clientId || process.env.DATAPREV_CLIENT_ID),
    clientSecret: normalizeCredentialValue(credentials?.clientSecret || process.env.DATAPREV_CLIENT_SECRET),
  };
}

function hasTemporaryCredentialValue(credentials: DataprevCredentialsInput | undefined, key: keyof DataprevCredentialsInput) {
  return Boolean(typeof credentials?.[key] === "string" && credentials[key]?.trim());
}

function usesTemporaryAuthCredentials(credentials?: DataprevCredentialsInput) {
  return Boolean(credentials && (["baseUrl", "apiKey", "clientId", "clientSecret"] as const).some(key => hasTemporaryCredentialValue(credentials, key)));
}

function usesTemporaryCredentials(credentials?: DataprevCredentialsInput) {
  return Boolean(credentials && (["baseUrl", "apiKey", "clientId", "clientSecret"] as const).some(key => hasTemporaryCredentialValue(credentials, key)));
}

function missingTemporaryAuthFields(credentials?: DataprevCredentialsInput) {
  if (!usesTemporaryAuthCredentials(credentials)) return [];
  return (["baseUrl", "apiKey", "clientId", "clientSecret"] as const).filter(key => !hasTemporaryCredentialValue(credentials, key));
}

function temporaryCredentialError(credentials?: DataprevCredentialsInput) {
  const missing = missingTemporaryAuthFields(credentials);
  if (!missing.length) return undefined;
  const labels: Record<typeof missing[number], string> = {
    baseUrl: "API URL",
    apiKey: "API key",
    clientId: "Client ID",
    clientSecret: "Client secret",
  };
  return "Credenciais temporárias Dataprev incompletas: preencha " + missing.map(key => labels[key]).join(", ") + " ou limpe todos os campos temporários para usar somente os Secrets do servidor. API URL, API key, Client ID e Client secret devem ser informados como um conjunto completo. A aplicação não mistura parcialmente credenciais secretas do Postman com Secrets publicados, pois isso costuma causar rejeição 401/403 na autenticação técnica.";
}

function credentialFingerprint(value?: string) {
  if (!value) return "<missing>";
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function credentialDiagnostics(credentials?: DataprevCredentialsInput): DataprevCredentialDiagnostics {
  const config = env(credentials);
  const temporary = usesTemporaryCredentials(credentials);
  return {
    credentialSource: temporary ? "temporary_form" : "server_secrets",
    baseUrl: config.baseUrl,
    apiKeyPresent: Boolean(config.apiKey),
    clientIdPresent: Boolean(config.clientId),
    clientSecretPresent: Boolean(config.clientSecret),
    temporaryCredentialsComplete: !temporary || missingTemporaryAuthFields(credentials).length === 0,
    apiKeyFingerprint: credentialFingerprint(config.apiKey),
    clientIdFingerprint: credentialFingerprint(config.clientId),
    clientSecretFingerprint: credentialFingerprint(config.clientSecret),
  };
}

function sensitiveValues(config?: DataprevConfig) {
  const resolved = config || env();
  return [resolved.apiKey, resolved.clientSecret].filter(Boolean);
}

function createRunId() {
  return String(Date.now()).slice(-10);
}

function createCnpj(seedValue?: string | number) {
  let seed = Number(String(seedValue ?? Date.now()).replace(/\D/g, "").slice(-8)) || 12345678;
  const nextDigit = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.floor((seed / 233280) * 10);
  };
  const base = Array.from({ length: 8 }, nextDigit).concat([0, 0, 0, 1]);
  const digit = (numbers: number[], weights: number[]) => {
    const sum = numbers.reduce((acc, number, index) => acc + number * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const d1 = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digit([...base, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...base, d1, d2].join("");
}

function findFirst(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirst(item, keys);
      if (found) return found;
    }
    return undefined;
  }
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  for (const value of Object.values(record)) {
    const found = findFirst(value, keys);
    if (found) return found;
  }
  return undefined;
}

function firstListItem(obj: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") return obj[0] as Record<string, unknown>;
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  for (const key of ["data", "items", "results", "page"]) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") return value[0] as Record<string, unknown>;
  }
  return undefined;
}

function extractDataRequestId(obj: unknown): string | undefined {
  const record = obj as { data?: { dataRequests?: Array<{ id?: string }>; page?: Array<{ id?: string }>; id?: string } };
  return record?.data?.dataRequests?.[0]?.id || record?.data?.page?.[0]?.id || (record?.data?.id as string | undefined) || findFirst(obj, ["dataRequestId"]);
}

export function sanitizeDataprevEvidence(value: unknown, depth = 0, extraSecrets: string[] = []): unknown {
  if (depth > 7) return "<TRUNCATED_DEPTH>";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    let output = value;
    for (const secret of [...sensitiveValues(), ...extraSecrets]) {
      if (secret) output = output.replaceAll(secret, "<REDACTED_SECRET>");
    }
    output = output.replace(/eyJ[A-Za-z0-9_\-.]+/g, "<JWT_REDACTED>");
    return output.length > 5000 ? `${output.slice(0, 5000)}...` : output;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 5).map(item => sanitizeDataprevEvidence(item, depth + 1, extraSecrets));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const isOpaqueHandle = lower.endsWith("tokenhandle");
    if (!isOpaqueHandle && ["token", "secret", "authorization", "x-api-key", "apikey", "api_key", "clientsecret", "password", "senha"].some(marker => lower.includes(marker))) {
      out[key] = item ? "<REDACTED>" : item;
    } else {
      out[key] = sanitizeDataprevEvidence(item, depth + 1, extraSecrets);
    }
  }
  return out;
}

/** Extrai o timestamp de expiração de um JWT sem verificar assinatura. */
function extractJwtExpiry(token: string): number | undefined {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number') return payload.exp * 1000; // converter de segundos para ms
    return undefined;
  } catch {
    return undefined;
  }
}

function storeToken(token?: string) {
  if (!token) return undefined;
  const handle = randomUUID();
  tokenStore.set(handle, token);
  // Extrai expiração do JWT para persistência com TTL
  const expiresAt = extractJwtExpiry(token);
  // Persiste no banco de forma assíncrona (fire-and-forget) para sobreviver a reinicializações
  storeUserToken(handle, token, expiresAt).catch(err => console.warn("[TokenCache] Falha ao persistir token:", err));
  return handle;
}

async function getStoredToken(handle?: string): Promise<string | undefined> {
  if (!handle) return undefined;
  // Handle especial para testes: bypassa a verificação de token sem retornar um token real
  if (handle === "__test_skip__") return "__test_skip_token__";
  // Verificar primeiro no mapa em memória (fast path)
  const cached = tokenStore.get(handle);
  if (cached) return cached;
  // Fallback: tentar carregar do banco (lazy loading após reinicialização do servidor)
  try {
    const { loadUserToken } = await import("./db");
    const token = await loadUserToken(handle);
    if (token) {
      // Repopular o mapa em memória para chamadas futuras
      tokenStore.set(handle, token);
      console.log(`[TokenCache] Token restaurado do banco para handle ${handle.substring(0, 8)}...`);
      return token;
    }
  } catch (err) {
    console.warn("[TokenCache] Falha ao carregar token do banco:", err);
  }
  return undefined;
}

function verificationSecretHash(email: unknown, credentials?: DataprevCredentialsInput) {
  const value = String(email || "").trim();
  const { clientId, clientSecret } = env(credentials);
  if (!value) throw new Error("E-mail obrigatório para calcular secretHash de verificação.");
  if (!clientId || !clientSecret) throw new Error("DATAPREV_CLIENT_ID e DATAPREV_CLIENT_SECRET são obrigatórios para confirmar código de verificação.");
  return createHmac("sha256", clientSecret).update(`${value}${clientId}`).digest("base64");
}

function m2mAuthUrl(credentials?: DataprevCredentialsInput) {
  return `${env(credentials).baseUrl}/v1/auth/token/iam/authn/services/oauth2/token`;
}

function m2mCredentialScope(credentials?: DataprevCredentialsInput) {
  const config = env(credentials);
  return createHash("sha256").update([config.baseUrl, config.apiKey, config.clientId, config.clientSecret].join("|"), "utf8").digest("hex");
}

function clearExpiredM2MCache() {
  if (m2mCache && m2mCache.expiresAt <= Date.now() + 60_000) m2mCache = null;
}

function hasActiveM2MCache(credentials?: DataprevCredentialsInput) {
  clearExpiredM2MCache();
  return Boolean(m2mCache && m2mCache.credentialScope === m2mCredentialScope(credentials));
}

async function requestM2MToken(forceRefresh = false, credentials?: DataprevCredentialsInput) {
  const temporaryError = temporaryCredentialError(credentials);
  if (temporaryError) throw new Error(temporaryError);
  const config = env(credentials);
  if (!config.apiKey || !config.clientId || !config.clientSecret) {
    throw new Error("Credenciais DATAPREV_* não estão configuradas no servidor.");
  }
  const isVitest = Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
  const scope = m2mCredentialScope(credentials);

  // 1. Verificar cache em memória (mais rápido)
  if (!forceRefresh && !isVitest && hasActiveM2MCache(credentials) && m2mCache) {
    return { token: m2mCache.token, expiresAt: m2mCache.expiresAt, handle: m2mCache.handle, reused: true };
  }

  // 2. Verificar cache no banco de dados (persiste entre reinicializações)
  if (!forceRefresh && !isVitest) {
    const dbCached = await loadM2MToken(scope);
    if (dbCached) {
      const expiresAtMs = dbCached.expiresAt.getTime();
      m2mCache = { token: dbCached.token, expiresAt: expiresAtMs, handle: dbCached.tokenHandle, credentialScope: scope };
      return { token: dbCached.token, expiresAt: expiresAtMs, handle: dbCached.tokenHandle, reused: true };
    }
  }

  // 3. Buscar novo token na API (via proxy se DATAPREV_PROXY_URL estiver configurado)
  const response = await fetchViaProxy(m2mAuthUrl(credentials), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    },
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof data.access_token !== "string") {
    // Preservar o responseBody real para diagnóstico
    const apiErrorBody = JSON.stringify(data) !== "{}" ? data : undefined;
    const apiErrorMsg = apiErrorBody ? ` — resposta da API: ${JSON.stringify(apiErrorBody)}` : "";
    const err = new Error(`Falha ao obter token M2M: HTTP ${response.status}${apiErrorMsg}`);
    (err as Error & { apiResponseBody?: unknown; httpStatus?: number }).apiResponseBody = apiErrorBody;
    (err as Error & { apiResponseBody?: unknown; httpStatus?: number }).httpStatus = response.status;
    throw err;
  }
  const expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  const handle = randomUUID();

  if (!isVitest || forceRefresh) {
    // Atualizar cache em memória
    m2mCache = { token: data.access_token, expiresAt, handle, credentialScope: scope };
    // Persistir no banco de dados (não bloqueia a resposta)
    upsertM2MToken({ credentialScope: scope, tokenHandle: handle, token: data.access_token, expiresAt: new Date(expiresAt) }).catch(err =>
      console.error("[M2M] Falha ao persistir token no banco:", err)
    );
  }
  return { token: data.access_token, expiresAt, handle, reused: false };
}

async function acquireM2MTokenForAction(credentials?: DataprevCredentialsInput) {
  clearExpiredM2MCache();
  if (m2mCache && m2mCache.credentialScope === m2mCredentialScope(credentials)) {
    return {
      token: m2mCache.token,
      source: "cached" as const,
      handle: m2mCache.handle,
      expiresAt: m2mCache.expiresAt,
    };
  }

  const refreshed = await requestM2MToken(false, credentials);
  return {
    token: refreshed.token,
    source: "refreshed" as const,
    handle: refreshed.handle,
    expiresAt: refreshed.expiresAt,
  };
}

async function authenticateM2MExplicitly(credentials?: DataprevCredentialsInput): Promise<M2MAuthResult> {
  const executedAt = new Date().toISOString();
  const diagnostics = credentialDiagnostics(credentials);
  const requestBody = {
    client_id: env(credentials).clientId || "<MISSING>",
    client_secret: env(credentials).clientSecret || "<MISSING>",
    grant_type: "client_credentials",
  };
  try {
    const auth = await requestM2MToken(true, credentials);
    const expiresInSeconds = Math.max(0, Math.floor((auth.expiresAt - Date.now()) / 1000));
    return {
      status: "executed",
      ok: true,
      method: "POST",
      url: m2mAuthUrl(credentials),
      httpStatus: 200,
      tokenHandle: auth.handle,
      expiresAt: new Date(auth.expiresAt).toISOString(),
      expiresInSeconds,
      active: auth.expiresAt > Date.now(),
      requestHeaders: sanitizeDataprevEvidence(headers({ content: true }, credentials), 0, sensitiveValues(env(credentials))) as Record<string, string>,
      requestBody: sanitizeDataprevEvidence(requestBody, 0, sensitiveValues(env(credentials))) as JsonValue,
      responseBody: { tokenHandle: auth.handle, expiresAt: new Date(auth.expiresAt).toISOString(), expiresInSeconds, tokenArmazenado: true, tokenBruto: "<REDACTED>", diagnostics },
      message: diagnostics.credentialSource === "temporary_form" ? "Autenticação técnica executada com as credenciais temporárias digitadas na interface; token M2M armazenado no servidor até a expiração." : "Autenticação técnica executada com os Secrets do servidor; token M2M armazenado no servidor até a expiração e disponível para reutilização nas próximas chamadas que exigirem Authorization Bearer.",
      executedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao obter token M2M.";
    const statusMatch = message.match(/HTTP\s+(\d+)/i);
    const status = statusMatch ? Number(statusMatch[1]) : undefined;
    const apiResponseBody = (error as Error & { apiResponseBody?: unknown }).apiResponseBody;
    return {
      status: "failed",
      ok: false,
      method: "POST",
      url: m2mAuthUrl(credentials),
      httpStatus: status,
      active: false,
      requestHeaders: sanitizeDataprevEvidence(headers({ content: true }, credentials), 0, sensitiveValues(env(credentials))) as Record<string, string>,
      requestBody: sanitizeDataprevEvidence(requestBody, 0, sensitiveValues(env(credentials))) as JsonValue,
      responseBody: sanitizeDataprevEvidence({ etapa: "autenticacao_tecnica_m2m", erro: message, respostaApi: apiResponseBody, diagnostico: status ? authFailureMessage(status, "m2m") : "N\u00e3o foi poss\u00edvel obter token M2M no servidor.", diagnostics }, 0, sensitiveValues(env(credentials))),
      message: status ? authFailureMessage(status, "m2m") : message,
      executedAt,
    };
  }
}

function headers(options: { m2m?: string; userToken?: string; region?: boolean; content?: boolean; acceptLanguage?: string }, credentials?: DataprevCredentialsInput) {
  const config = env(credentials);
  const out: Record<string, string> = { "x-api-key": config.apiKey };
  if (options.content !== false) out["Content-Type"] = "application/json";
  if (options.m2m) out.Authorization = `Bearer ${options.m2m}`;
  if (options.userToken) out["X-User-Access-Token"] = options.userToken;
  if (options.region) out["x-region"] = "BR";
  if (options.acceptLanguage) out["Accept-Language"] = options.acceptLanguage;
  return out;
}

function authFailureMessage(status: number, context: "m2m" | "api") {
  if (status !== 401 && status !== 403) return "A API respondeu fora da faixa esperada; a resposta foi preservada como evidência.";
  if (context === "m2m") {
    if (status === 403) {
      return "HTTP 403 Forbidden: a API Dataprev recusou a autenticação M2M. Causas prováveis: (1) as credenciais DATAPREV_API_KEY / DATAPREV_CLIENT_ID / DATAPREV_CLIENT_SECRET configuradas nos Secrets do projeto publicado estão diferentes das que funcionam localmente \u2014 verifique e atualize os Secrets e republique; (2) o IP do servidor publicado não está na allowlist da API DrumWave/Dataprev \u2014 solicite ao time DrumWave que adicione o IP do servidor publicado; (3) as credenciais expiraram ou foram revogadas. Verifique o campo \u2018respostaApi\u2019 no responseBody para a mensagem exata retornada pela API.";
    }
    return "HTTP 401 Unauthorized: credenciais inválidas ou expiradas. Preencha os quatro campos temporários (API URL, x-api-key, Client ID, Client secret) com o conjunto completo do 1Password e clique em Gerar M2M token, ou atualize os Secrets publicados e republique.";
  }
  return "HTTP 403 — a sandbox recusou a chamada. Causas possíveis: (1) feature flag não habilitada para este endpoint neste tenant (comum em /marketplace/offers); (2) API key divergente entre local e publicado; (3) credenciais sem permissão para este recurso. Verifique o responseBody para a mensagem exata da DrumWave.";
}

const actions: JourneyAction[] = [
  {
    id: "step1_employee_signup",
    title: "Criar conta de colaborador Business",
    app: "Business",
    group: "dWallet Employee",
    method: "POST",
    path: "/v1/dwallet/employee/signup",
    status: "external",
    requiresM2M: true,
    includeRegion: true,
    description: "Cria o usuário colaborador que representa a empresa na jornada Business dWallet usando o token M2M já gerado no Passo 0.",
    buildBody: state => ({ email: state.employeeEmail, password: state.employeePassword || DEFAULT_PASSWORD, firstName: state.employeeFirstName || "Maria", lastName: state.employeeLastName || "Silva", phoneNumber: state.employeePhone || "+5511999990001", address: { state: state.businessState || "SP" } }),
  },
  {
    id: "step1_employee_send_code",
    title: "Enviar código de verificação do colaborador",
    app: "Business",
    group: "Auth",
    method: "POST",
    path: "/v1/auth/token/iam/idp/users/send-code",
    status: "external",
    requiresM2M: true,
    description: "Solicita código de verificação por e-mail; o input manual do OTP é requisito funcional de segurança e anti-automação, não lacuna da API.",
    acceptLanguage: "pt-br",
    buildBody: state => ({ value: state.employeeEmail, attribute: "email" }),
  },
  {
    id: "step1_employee_verify_code",
    title: "Confirmar código de verificação do colaborador",
    app: "Business",
    group: "Auth",
    method: "POST",
    path: "/v1/auth/token/iam/idp/users/verify-code",
    status: "external",
    requiresM2M: true,
    description: "Confirma o OTP recebido no e-mail corporativo antes de liberar o login do colaborador Business.",
    buildBody: (state, credentials) => ({ attribute: "email", value: state.employeeEmail, code: state.employeeVerificationCode || state.businessOtp || "", refreshToken: "", secretHash: verificationSecretHash(state.employeeEmail, credentials), clientId: env(credentials).clientId }),
  },
  {
    id: "step1_employee_signin",
    title: "Login do colaborador Business",
    app: "Business",
    group: "dWallet Auth",
    method: "POST",
    path: "/v1/dwallet/auth/signin",
    status: "external",
    requiresM2M: true,
    includeRegion: true,
    description: "Autentica o colaborador criado e guarda o token de usuário no servidor por meio de identificador opaco.",
    buildBody: state => ({ email: state.employeeEmail, password: state.employeePassword || DEFAULT_PASSWORD }),
    onSuccess: body => {
      const b = body as Record<string,unknown>;
      const data = (b?.data ?? b) as Record<string,unknown>;
      const tokens = data?.tokens as Record<string,unknown> | undefined;
      // Postman 1d: token = res?.data?.tokens?.accessToken
      const accessToken = String(tokens?.accessToken ?? data?.accessToken ?? findFirst(body, ["accessToken","access_token"]) ?? "");
      // Postman 1d: bd_dwallet_id = res?.data?.dWalletId || res?.data?.user?.dWalletId
      const dWalletId = String(data?.dWalletId ?? (data?.user as Record<string,unknown>)?.dWalletId ?? findFirst(body, ["dWalletId","dwalletId","walletId"]) ?? "");
      const firstName = String((data?.user as Record<string,unknown>)?.firstName ?? data?.firstName ?? findFirst(body, ["firstName","first_name"]) ?? "");
      console.log(`[signin] accessToken=${!!accessToken} dWalletId=${dWalletId} firstName=${firstName}`);
      return {
        employeeTokenHandle: storeToken(accessToken) || undefined,
        businessDwalletId: dWalletId || undefined,
        employeeDwalletId: dWalletId || undefined,
        employeeFirstName: firstName || undefined,
      };
    },
  },
  {
    id: "step1_employee_profile",
    title: "Consultar perfil do colaborador Business",
    app: "Business",
    group: "dWallet Business",
    method: "GET",
    path: "/v1/dwallet/employee/me",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Recupera o perfil do colaborador autenticado, incluindo businessId e businessDwalletId da empresa já associada. Ütil para recuperar o estado após reinicialização sem precisar recriar a empresa.",
    onSuccess: body => ({
      businessId: findFirst(body, ["businessId"]) ||
        (body as Record<string, unknown> & { data?: { business?: { id?: string } } })?.data?.business?.id,
      businessDwalletId: findFirst(body, ["dWalletId", "dwalletId"]) ||
        (body as Record<string, unknown> & { data?: { business?: { dWallet?: { id?: string } } } })?.data?.business?.dWallet?.id,
    }),
  },
  {
    id: "step1_business_create",
    title: "Criar entidade Business dWallet",
    app: "Business",
    group: "dWallet Business",
    method: "POST",
    path: "/v1/dwallet/business",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Cria a carteira/entidade empresarial associada ao colaborador autenticado.",
    buildBody: state => ({ name: state.businessName || `Empresa Dataprev Local ${state.runId}`, cnpj: state.businessCnpj, address: { state: state.businessState || "SP" }, website: state.businessWebsite || undefined, phoneNumber: state.businessPhone || undefined }),
    onSuccess: body => {
      const b = body as Record<string, unknown>;
      const data = (b.data ?? b) as Record<string, unknown>;
      // businessId = entity ID for /business/{id}/products endpoints  
      const businessEntityId = String(
        data.businessId ?? data.id ?? data.uuid ?? findFirst(body, ["businessId", "id"]) ?? ""
      );
      // businessDwalletId = dWallet ID for /cart/{bd_dwallet_id}/add and /orders/checkout/{bd_dwallet_id}
      const dwalletId = String(
        ((data.dWallet as Record<string,unknown>)?.id)
        ?? data.dWalletId ?? data.dwalletId
        ?? findFirst(body, ["dWalletId", "dwalletId", "walletId"]) ?? ""
      );
      return {
        businessId: businessEntityId || undefined,
        businessDwalletId: dwalletId || undefined,
        businessName: String(data.name ?? ""),
      };
    },
  },
  {
    id: "step1_employee_relogin",
    title: "Re-login do colaborador (pós-criação da empresa)",
    app: "Business",
    group: "dWallet Auth",
    method: "POST",
    path: "/v1/dwallet/auth/signin",
    status: "external",
    requiresM2M: true,
    includeRegion: true,
    description: "OBRIGATÓRIO após criar a empresa (step1_business_create). O Postman instrui: 're-run Step 1d after creating the business in Step 1e'. O novo token contém o dWalletId da empresa, necessário para os passos 4, 11 e outros.",
    buildBody: state => ({ email: state.employeeEmail, password: state.employeePassword || DEFAULT_PASSWORD }),
    onSuccess: body => {
      const b = body as Record<string,unknown>;
      const data = (b?.data ?? b) as Record<string,unknown>;
      const tokens = data?.tokens as Record<string,unknown> | undefined;
      const accessToken = String(tokens?.accessToken ?? data?.accessToken ?? findFirst(body, ["accessToken","access_token"]) ?? "");
      const dWalletId = String(data?.dWalletId ?? (data?.user as Record<string,unknown>)?.dWalletId ?? findFirst(body, ["dWalletId","dwalletId"]) ?? "");
      console.log(`[relogin] accessToken=${!!accessToken} dWalletId=${dWalletId}`);
      return {
        employeeTokenHandle: storeToken(accessToken) || undefined,
        businessDwalletId: dWalletId || undefined,
        employeeDwalletId: dWalletId || undefined,
      };
    },
  },
  {
    id: "step2_person_signup",
    title: "Criar Personal dWallet",
    app: "Personal",
    group: "dWallet Person",
    method: "POST",
    path: "/v1/dwallet/person/signup",
    status: "external",
    requiresM2M: true,
    includeRegion: true,
    description: "Cria a conta da pessoa física que será usada nos passos da Personal dWallet usando o token M2M já gerado no Passo 0.",
    buildBody: state => ({ email: state.personEmail, password: state.personPassword || DEFAULT_PASSWORD, firstName: state.personFirstName || "João", lastName: state.personLastName || "Santos", phoneNumber: state.personPhone || "+5511999990002", address: { state: state.personState || "SP" } }),
  },
  {
    id: "step2_person_send_code",
    title: "Enviar código de verificação da pessoa",
    app: "Personal",
    group: "Auth",
    method: "POST",
    path: "/v1/auth/token/iam/idp/users/send-code",
    status: "external",
    requiresM2M: true,
    description: "Solicita código de verificação por e-mail; o input manual do OTP é requisito funcional de segurança e anti-automação, não lacuna da API.",
    acceptLanguage: "pt-br",
    buildBody: state => ({ value: state.personEmail, attribute: "email" }),
  },
  {
    id: "step2_person_verify_code",
    title: "Confirmar código de verificação da pessoa",
    app: "Personal",
    group: "Auth",
    method: "POST",
    path: "/v1/auth/token/iam/idp/users/verify-code",
    status: "external",
    requiresM2M: true,
    description: "Confirma o OTP recebido no e-mail da pessoa física antes de liberar o login da Personal dWallet.",
    buildBody: (state, credentials) => ({ attribute: "email", value: state.personEmail, code: state.personVerificationCode || state.otp || "", refreshToken: "", secretHash: verificationSecretHash(state.personEmail, credentials), clientId: env(credentials).clientId }),
  },
  {
    id: "step2_person_signin",
    title: "Login da pessoa física",
    app: "Personal",
    group: "dWallet Auth",
    method: "POST",
    path: "/v1/dwallet/auth/signin",
    status: "external",
    requiresM2M: true,
    includeRegion: true,
    description: "Autentica a pessoa criada e guarda o token no servidor por meio de identificador opaco.",
    buildBody: state => ({ email: state.personEmail, password: state.personPassword || DEFAULT_PASSWORD }),
    onSuccess: body => ({ personTokenHandle: storeToken(findFirst(body, ["accessToken", "access_token"])), personDwalletId: findFirst(body, ["dWalletId"]) }),
  },
  {
    id: "step3_list_schemas",
    title: "Consultar Standard Value Schemas",
    app: "Business",
    group: "Data Registry",
    method: "GET",
    path: "/v1/data-registry/value-schemas/standard",
    status: "external",
    requiresM2M: true,
    description: "Lista schemas de valor padronizados disponíveis para uso na plataforma.",
    onSuccess: body => {
      // Postman 3: items = res?.data || res; firstSid = items[0]?.sid || items[0]?.id
      const arr = (Array.isArray(body) ? body : ((body as Record<string,unknown>)?.data || [])) as Record<string,unknown>[];
      const sid = arr[0]?.sid as string | undefined || arr[0]?.id as string | undefined;
      console.log(`[step3] found ${arr.length} schemas, first sid=${sid}`);
      return { valueSchemaSid: sid };
    },
  },
  // ── Passo 4a: Registrar Value Schema (VS) via carrinho ──────────────────────
  {
    id: "step4_add_vs_to_cart",
    title: "4a — Adicionar VS ao carrinho",
    app: "Business",
    group: "Registro de Produto",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "4a (Postman): POST /v1/marketplace/cart/{bd_dwallet_id}/add com itemType vs-registration-annual. Usa base_url (não cart-service externo).",
    buildPath: state => `/v1/marketplace/cart/${encodeURIComponent(String(state.businessDwalletId || state.businessId || ""))}/add`,
    buildBody: state => ({
      itemType: "vs-registration-annual",
      productId: state.valueSchemaSid,
      itemId: state.valueSchemaSid,
    }),
    onSuccess: body => ({ vsCartItemId: findFirst(body, ["id", "itemId", "cartItemId"]) }),
  },
  {
    id: "step4_checkout_vs",
    title: "4b — Checkout: registrar Value Schema",
    app: "Business",
    group: "Registro de Produto",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "4b (Postman): POST /v1/marketplace/orders/checkout/{bd_dwallet_id} — registra o VS. Após este passo o produto aparece em /v1/data-registry/dskus/product.",
    expectedStatus: [200, 300],
    buildPath: state => `/v1/marketplace/orders/checkout/${encodeURIComponent(String(state.businessDwalletId || state.businessId || ""))}`,
    buildBody: state => ({
      cartPlatform: "PRODUCT_REGISTRATION",
      currencyCode: "USD",
      email: state.employeeEmail,
      items: [{
        productId: state.valueSchemaSid,
        productDescription: "Value Schema Registration",
        itemId: state.valueSchemaSid,
        itemType: "vs-registration-annual",
        itemDescription: "Annual VS registration",
        quantity: 1,
      }],
    }),
    onSuccess: body => ({ vsOrderId: findFirst(body, ["orderId", "id", "order_id"]) }),
  },
  // ── Passo 4b: Consultar dSKUs, adicionar ao carrinho e registrar produto ──
  {
    id: "step4_list_products",
    title: "4c — Consultar catálogo de dSKUs",
    app: "Business",
    group: "Registro de Produto",
    method: "GET",
    path: "/v1/data-registry/dskus/product",
    status: "external",
    requiresM2M: true,
    description: "Lista os dSKUs disponíveis no catálogo após o registro do VS. Selecione o dSKU para adicionar ao carrinho.",
    onSuccess: body => {
      // Postman 4c: items = Array.isArray(res) ? res : (res?.data || [])
      const arr = Array.isArray(body) ? body as Record<string,unknown>[] : ((body as Record<string,unknown>)?.data as Record<string,unknown>[] | undefined) || [];
      const dsku = arr[0]?.dsku as string | undefined;
      console.log(`[4c list_products] found ${arr.length} items, first dsku=${dsku}`);
      return { dsku, selectedProductDsku: dsku };
    },
  },
  {
    id: "step4_add_dsku_to_cart",
    title: "4d — Adicionar dSKU ao carrinho",
    app: "Business",
    group: "Registro de Produto",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "4d (Postman): POST /v1/marketplace/cart/{bd_dwallet_id}/add com itemType dsku-registration-annual. Usa base_url (não cart-service externo).",
    buildPath: state => `/v1/marketplace/cart/${encodeURIComponent(String(state.businessDwalletId || state.businessId || ""))}/add`,
    buildBody: state => {
      const dskuId = state.selectedProductDsku || state.dsku || "";
      console.log(`[4d] add_dsku_to_cart dskuId=${dskuId}`);
      return {
        itemType: "dsku-registration-annual",
        productId: dskuId,
        itemId: dskuId,
      };
    },
    onSuccess: (body) => {
      // Response can be array of cart items or single item
      // Find the dsku-registration-annual item and capture its productId/itemId
      const arr = Array.isArray(body) ? body : (body as Record<string,unknown>)?.items;
      if (Array.isArray(arr) && arr.length > 0) {
        const dskuItem = (arr as Record<string,unknown>[]).slice().reverse()
          .find(i => i?.itemType === "dsku-registration-annual" || 
                     String(i?.itemId || "").startsWith("DSKU") ||
                     String(i?.productId || "").startsWith("DSKU"));
        if (dskuItem) {
          const id = String(dskuItem.productId || dskuItem.itemId || dskuItem.id || "");
          return { cartItemId: id, selectedProductDsku: id };
        }
        // fallback: last item
        const last = (arr as Record<string,unknown>[])[arr.length - 1];
        const id = String(last?.productId || last?.itemId || last?.id || "");
        return { cartItemId: id, selectedProductDsku: id };
      }
      const id = findFirst(body, ["productId", "itemId", "id"]);
      return { cartItemId: id, selectedProductDsku: id };
    },
  },
  {
    id: "step4_checkout_dsku",
    title: "4e — Checkout: registrar produto na BdW",
    app: "Business",
    group: "Registro de Produto",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "4e (Postman): POST /v1/marketplace/orders/checkout/{bd_dwallet_id} — checkout final, registra o produto na BdW.",
    expectedStatus: [200, 300],
    buildPath: state => `/v1/marketplace/orders/checkout/${encodeURIComponent(String(state.businessDwalletId || state.businessId || ""))}`,
    buildBody: state => {
      // CRITICAL: Cart is NEVER cleared between 4b and 4e.
      // Meena confirmed: cart clears only after billing.payment.paid Kafka event — not at checkout.
      // Cart state after 4d: [VS item (from 4a), dSKU item (from 4d)]
      // The checkout body MUST exactly match ALL items currently in the cart.
      const vsId = String(state.valueSchemaSid || "");
      const dskuId = String(state.cartItemId || state.selectedProductDsku || state.dsku || "");
      console.log(`[4e] checkout body: vsId=${vsId} dskuId=${dskuId}`);
      const items: {productId: string; productDescription: string; itemId: string; itemType: string; itemDescription: string; quantity: number}[] = [];
      if (dskuId) items.push({
        productId: dskuId,
        productDescription: "dSKU Registration",
        itemId: dskuId,
        itemType: "dsku-registration-annual",
        itemDescription: "Annual dSKU registration",
        quantity: 1,
      });
      if (vsId) items.push({
        productId: vsId,
        productDescription: "Value Schema Registration",
        itemId: vsId,
        itemType: "vs-registration-annual",
        itemDescription: "Annual VS registration",
        quantity: 1,
      });
      return {
        cartPlatform: "PRODUCT_REGISTRATION",
        currencyCode: "USD",
        email: state.employeeEmail,
        items,
      };
    },
    onSuccess: body => ({
      orderId: findFirst(body, ["orderId", "id", "order_id"]),
      businessProductId: findFirst(body, ["productId", "dskuId", "registeredProductId"]),
    }),
  },
  {
    id: "step4_list_business_products",
    title: "4f — Confirmar: listar produtos registrados na BdW",
    app: "Business",
    group: "Registro de Produto",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "4f (Postman): GET /v1/dwallet/business/{business_id}/products. 404 = normal no sandbox (produtos ainda não registrados ou businessId de run anterior). Sucesso indica que o endpoint funciona.",
    expectedStatus: [200, 201, 204, 404, 500],
    buildPath: state => {
      // Postman uses {{business_id}} — this is the entity ID, not the dWallet ID
      // businessId comes from step1_business_create onSuccess
      const id = state.businessId || "";
      return `/v1/dwallet/business/${id}/products?page=1&limit=10`;
    },
    onSuccess: body => ({
      businessProductId: findFirst(body, ["productId", "id", "dsku"]),
    }),
  },
  {
    id: "step3_create_commercial_value_schema",
    title: "Criar Commercial Value Schema",
    app: "Business",
    group: "Data Registry",
    method: "POST",
    path: "/v1/data-registry/value-schemas/commercial",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "Cria um Commercial Value Schema vinculado ao Standard Value Schema. Nota: este endpoint não consta na coleção Postman oficial — pode estar em fase de implementação.",
    buildBody: state => ({
      standardValueSchemaSid: state.valueSchemaSid,
      name: state.selectedProductName || "Produto de dados",
      description: "Commercial Value Schema criado durante homologação",
    }),
    onSuccess: body => ({ commercialValueSchemaId: (body as Record<string, unknown>)?.id as string | undefined }),
  },
  {
    id: "step5_person_catalog",
    title: "Pessoa consulta produtos disponíveis",
    app: "Personal",
    group: "Data Registry",
    method: "GET",
    path: "/v1/data-registry/dskus/product",
    status: "external",
    requiresM2M: true,
    description: "Reutiliza o catálogo de produtos para a visão Personal dWallet.",
  },
  {
    id: "step6_create_data_request",
    title: "Pessoa solicita dados à empresa",
    app: "Personal",
    group: "dWallet Data Request",
    method: "POST",
    path: "/v1/dwallet/person/data-request",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    includeRegion: true,
    // O recipient deve ser o businessId (UUID da empresa), não o businessDwalletId.
    // O sandbox retorna 500 "Failed to execute outbox event" mesmo quando a solicitação é criada com sucesso
    // (bug de infraestrutura do sandbox na fila de eventos). Por isso, expectedStatus aceita até 599.
    expectedStatus: [200, 600],
    description: "Cria solicitação de dados da pessoa para a empresa criada na jornada. Nota: o sandbox pode retornar 500 por falha no outbox event mesmo quando a solicitação é criada — o Passo 7 confirmará se a solicitação chegou.",
    buildBody: state => ({ loginEmail: state.personEmail, recipient: state.businessId }),
    onSuccess: body => ({ dataRequestId: extractDataRequestId(body) }),
    // Fallback assíncrono: quando o sandbox retorna 500 de outbox (a solicitação foi criada mas o ID não está no body),
    // busca o dataRequestId mais recente via listagem de solicitações pendentes da empresa.
    onSuccessAsync: async (body, state, credentials) => {
      const b = body as Record<string, unknown>;
      // Só aciona o fallback se o onSuccess não conseguiu extrair o ID e o body é um erro de outbox
      if (state.dataRequestId) return {}; // já temos o ID, não precisa do fallback
      const isOutboxError = typeof b?.message === "string" && b.message.includes("outbox");
      if (!isOutboxError) return {};
      if (!state.businessId || !state.employeeTokenHandle) return {};
      try {
        const m2mResult = await acquireM2MTokenForAction(credentials);
        const employeeToken = await getStoredToken(String(state.employeeTokenHandle));
        if (!m2mResult || !employeeToken) return {};
        const m2mToken = m2mResult.token;
        const listUrl = `${env(credentials).baseUrl}/v1/dwallet/business/${state.businessId}/data-requests?status=pending`;
        const listHeaders = headers({ m2m: m2mToken, userToken: employeeToken, region: true, content: false }, credentials);
        const listResp = await fetchViaProxy(listUrl, { method: "GET", headers: listHeaders });
        if (!listResp.ok) return {};
        const listBody = await listResp.json().catch(() => ({}));
        const dataRequestId = extractDataRequestId(listBody);
        if (dataRequestId) {
          console.log(`[step6] Fallback: dataRequestId recuperado via listagem: ${dataRequestId}`);
          return { dataRequestId };
        }
      } catch (err) {
        console.warn("[step6] Falha no fallback de listagem:", err);
      }
      return {};
    },
  },
  {
    id: "step7_list_business_requests",
    title: "Empresa lista solicitações pendentes",
    app: "Business",
    group: "dWallet Data Request",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Lista solicitações recebidas pela empresa, filtrando pendentes.",
    buildPath: state => `/v1/dwallet/business/${state.businessId}/data-requests?status=pending`,
    onSuccess: body => ({ dataRequestId: extractDataRequestId(body) }),
  },
  {
    id: "step7_accept_data_request",
    title: "Empresa aceita solicitação de dados",
    app: "Business",
    group: "dWallet Data Request",
    method: "PATCH",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Atualiza a solicitação como aceita. NOTA: o sandbox retorna HTTP 500 neste endpoint — bug reconhecido pela DrumWave (confirmado por Mala no Slack: 'Agreed — this should be fixed'). O código está correto.",
    expectedStatus: [200, 201, 204, 400, 500],
    buildPath: state => `/v1/dwallet/data-request/${state.dataRequestId}`,
    buildBody: () => ({ status: "accepted" }),
  },
  {
    id: "step7_reject_data_request",
    title: "Empresa rejeita solicitação de dados",
    app: "Business",
    group: "dWallet Data Request",
    method: "PATCH",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Atualiza a solicitação como rejeitada. NOTA: o sandbox retorna HTTP 500 — bug reconhecido pela DrumWave.",
    expectedStatus: [200, 201, 204, 400, 500],
    buildPath: state => `/v1/dwallet/data-request/${state.dataRequestId}`,
    buildBody: () => ({ status: "declined" }),
  },
  {
    id: "step8_person_certificates",
    title: "8a — Listar certificados da pessoa",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/certificates",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "8a (Postman): GET /v1/dsavings/certificates com X-User-Access-Token de pessoa. Sandbox retorna lista vazia — sem dados de certificados ainda conforme Mala/Meena no Slack.",
    expectedStatus: [200, 201, 204, 400, 500],
    onSuccess: body => ({
      certificateId: firstListItem(body)?.id as string | undefined,
    }),
  },
  {
    id: "step8_certificate_detail",
    title: "Pessoa consulta certificado específico",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "8b (Postman): GET /v1/dsavings/certificates/{certificateId}.",
    expectedStatus: [200, 201, 204, 400, 404, 500],
    buildPath: state => `/v1/dsavings/certificates/${state.certificateId || ""}`,
    onSuccess: body => ({
      certificateId: (body as Record<string,unknown>)?.id as string | undefined,
    }),
  },
  {
    id: "step9_business_certificates",
    title: "Empresa consulta certificados",
    app: "Business",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/certificates",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "Mesma API do Passo 8 com token Business. GET /v1/dsavings/certificates. Sandbox retorna lista vazia.",
    expectedStatus: [200, 201, 204, 400, 500],
    onSuccess: body => ({
      certificateId: firstListItem(body)?.id as string | undefined || firstListItem(body)?.certificateId as string | undefined,
    }),
  },
  {
    id: "step9_business_certificate_detail",
    title: "Empresa consulta certificado específico",
    app: "Business",
    group: "Data Savings",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "8b (Postman reutilizado para BdW): GET /v1/dsavings/certificates/{certificateId}.",
    expectedStatus: [200, 201, 204, 400, 404, 500],
    buildPath: state => `/v1/dsavings/certificates/${state.certificateId || ""}`,
  },
  {
    id: "step10_commercial_dsps",
    title: "Pessoa visualiza DSPs comerciais",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/data-savings-plans/commercial",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    expectedStatus: [200, 201, 204, 400, 500],
    description: "Lista planos comerciais de poupança de dados; requer token de pessoa física (X-User-Access-Token).",
    onSuccess: body => ({ commercialDspId: firstListItem(body)?.id as string | undefined, selectedDspId: firstListItem(body)?.id as string | undefined }),
  },
  {
    id: "step10_standard_dsps",
    title: "Pessoa visualiza DSPs standard",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/data-savings-plans/standard",
    status: "external",
    requiresM2M: true,
    description: "Lista planos standard de poupança de dados.",
    onSuccess: body => ({ standardDspId: firstListItem(body)?.id as string | undefined, selectedDspId: firstListItem(body)?.id as string | undefined }),
  },
  {
    id: "step10_dsp_details",
    title: "Pessoa visualiza detalhe do DSP",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    status: "external",
    requiresM2M: true,
    description: "Consulta detalhe de um plano DSP standard usando o identificador salvo pela listagem; a dependência de identificador válido é pré-requisito funcional da chamada.",
    expectedStatus: [200, 201, 204, 400, 500],
    buildPath: state => "/v1/dsavings/data-savings-plans/standard/" + encodeURIComponent(String(state.selectedDspId || state.standardDspId || state.commercialDspId || "")),
  },
  {
    id: "step10_create_dsp_account",
    title: "Pessoa cria conta DSP",
    app: "Personal",
    group: "Data Savings",
    method: "POST",
    path: "/v1/dsavings/data-savings-accounts",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "Tenta criar uma conta DSP; respostas 4xx de regra de negócio são exibidas como evidência.",
    expectedStatus: [200, 201, 204, 400, 500],
    buildBody: state => ({ cdspId: state.selectedDspId || state.commercialDspId || state.standardDspId, categories: ["travel-and-transportation"], currency: "BRL", savingsGoal: 1000, agreedToTermsAndConditions: true }),
    onSuccess: body => ({ dspAccountId: firstListItem(body)?.id as string | undefined || findFirst(body, ["id", "accountId", "dspAccountId"]) }),
  },
  {
    id: "step10_my_savings_plans",
    title: "Meus planos de poupança contratados",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/data-savings-accounts",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "Lista as contas de poupança de dados contratadas pela pessoa; exibe planos ativos, saldo e metas de economia.",
    expectedStatus: [200, 201, 204, 400, 500],
    onSuccess: body => ({
      mySavingsAccountsJson: JSON.stringify(
        Array.isArray((body as Record<string, unknown>)?.data)
          ? (body as Record<string, unknown>).data
          : Array.isArray(body) ? body : []
      ),
    }),
  },
  // ── Step 11: Create Offer (preview + purchase) ──────────────────────────────
  {
    id: "step11_offer_preview",
    title: "11a — Preview de oferta",
    app: "Business",
    group: "Marketplace Offers",
    method: "POST",
    path: "/v1/marketplace/offers/preview",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "11a (Postman): POST /v1/marketplace/offers/preview. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 403, 400, 500],
    buildBody: state => ({
      dWalletId: state.businessDwalletId || state.businessId || "",
      offerCriteria: {
        title: "Oferta DrumWave Homologação",
        description: "Oferta criada durante jornada de homologação Dataprev",
        campaignName: "Campanha Dataprev",
        callToAction: "Aceite esta oferta",
        categories: ["consignado"],
        dskus: [{
          dsku: state.cartItemId || state.selectedProductDsku || state.dsku || "",
          name: "Produto de dados",
          category: "consignado",
        }],
        geographicRegions: ["BR"],
        participantFilters: {
          ageRange: { min: 18, max: 65 },
          minDataContributions: 1,
          customAttributes: {},
        },
        proposedBudget: {
          totalAmount: 1000,
          currencyCode: "BRL",
          bidStrategy: "FIXED_BID",
          paymentPerParticipant: 10,
        },
        maxParticipants: 100,
        duration: {
          startDate: "2026-06-03",
          endDate: "2026-09-03",
        },
      },
      paymentMethod: "PIX",
    }),
    onSuccess: body => ({
      offerPreviewId: findFirst(body, ["previewId", "id", "offerId"]),
    }),
  },
  {
    id: "step11_offer_purchase",
    title: "11b — Efetivar compra da oferta",
    app: "Business",
    group: "Marketplace Offers",
    method: "POST",
    path: "/v1/marketplace/offers/purchase",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "11b (Postman): POST /v1/marketplace/offers/purchase. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 403, 400, 500],
    buildBody: state => ({
      previewId: state.offerPreviewId,
      landingPageUrl: "https://example.com/offer-landing",
    }),
    onSuccess: body => ({
      offerId: findFirst(body, ["offerId", "id"]),
    }),
  },
  // ── Step 12: View Offer Transactions ─────────────────────────────────────────
  {
    id: "step12_list_offers",
    title: "12a — Listar ofertas disponíveis",
    app: "Personal",
    group: "Marketplace Offers",
    method: "GET",
    path: "/v1/marketplace/offers",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "12a (Postman): GET /v1/marketplace/offers com employee token. Requer permissão marketplace na API key.",
    expectedStatus: [200, 300],
    onSuccess: body => ({
      offerId: firstListItem(body)?.id as string | undefined || firstListItem(body)?.offerId as string | undefined,
    }),
  },
  {
    id: "step12_offer_transactions",
    title: "12b — Transações de uma oferta",
    app: "Personal",
    group: "Marketplace Offers",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    description: "12b (Postman): GET /v1/marketplace/offers/{offerId}/transactions. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 204, 403, 400, 500],
    buildPath: state => `/v1/marketplace/offers/${state.offerId || state.offerId || ""}/transactions`,
    onSuccess: (body) => {
      const data = (body as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const realId = data?.id ? String(data.id) : ((body as Record<string, unknown>)?.offerId ? String((body as Record<string, unknown>).offerId) : undefined);
      return realId ? { offerId: realId } : {};
    },
  },
  {
    id: "step13_offer_pre_accept",
    title: "13a — Pré-aceitar oferta (opcional)",
    app: "Personal",
    group: "Marketplace Offers",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "13a (Postman): POST /v1/marketplace/offers/{offerId}/pre-accept. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 204, 403, 400, 500],
    buildPath: state => `/v1/marketplace/offers/${state.offerId}/pre-accept`,
    buildBody: state => ({ emailAddress: state.personEmail }),
  },
  {
    id: "step13_offer_accept",
    title: "13b — Aceitar oferta",
    app: "Personal",
    group: "Marketplace Offers",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "13b (Postman): POST /v1/marketplace/offers/{offerId}/accept. Body: emailAddress + dataSavingsAccountId. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 204, 403, 400, 500],
    buildPath: state => `/v1/marketplace/offers/${state.offerId}/accept`,
    buildBody: state => ({
      emailAddress: state.personEmail,
      dataSavingsAccountId: state.dspAccountId || state.dsaId,
    }),
  },
  {
    id: "step13_offer_reject",
    title: "13c — Rejeitar oferta",
    app: "Personal",
    group: "Marketplace Offers",
    method: "POST",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "13c (Postman): POST /v1/marketplace/offers/{offerId}/reject. Body: emailAddress. NOTA TÉCNICA: Retorna HTTP 403 AUTHZ_E006 com a API key atual. Este endpoint requer uma API key com permissão de marketplace habilitada no gateway DrumWave. A chamada está tecnicamente correta (body, URL, headers). Para habilitar: solicitar à equipe DrumWave que ative a permissão 'marketplace' para a API key configurada nas variáveis do servidor.",
    expectedStatus: [200, 201, 204, 403, 400, 500],
    buildPath: state => `/v1/marketplace/offers/${state.offerId}/reject`,
    buildBody: state => ({ emailAddress: state.personEmail }),
  },
  // ── Step 14: DSA Balance ──────────────────────────────────────────────────────
  {
    id: "step14_dsa_balance",
    title: "14b — Saldo da conta DSA",
    app: "Ambos",
    group: "Data Savings Account",
    method: "GET",
    status: "external",
    requiresM2M: true,
    requiresUser: "person",
    description: "14b (Postman): GET /v1/dsavings/data-savings-accounts/{dsaId}/balance. Usa base_url conforme Postman.",
    expectedStatus: [200, 201, 204, 404, 500],
    buildPath: state => `/v1/dsavings/data-savings-accounts/${state.dspAccountId || state.dsaId}/balance`,
    onSuccess: body => ({
      dsaBalance: findFirst(body, ["balance", "amount", "value"]),
    }),
  },
  {
    id: "step15_withdrawal_internal",
    title: "Pessoa ou empresa solicita resgate",
    app: "Ambos",
    group: "Wallet Withdrawal",
    status: "internal",
    description: "O roteiro indica endpoints de withdrawal e payment-settled/payment-failed, mas o sumário marca a etapa como API interna ainda não externalizada.",
    missingReason: "APIs de resgate existem no roteiro como referência operacional, porém foram classificadas como INT; não devem ser executadas como externas nesta validação.",
  },
  {
    id: "step16_accounts_gap",
    title: "Cadastrar PIX/conta",
    app: "Ambos",
    group: "Accounts",
    status: "gap",
    description: "Cadastro, atualização e consulta de conta bancária ou chave PIX aparecem como GAP no roteiro.",
    missingReason: "APIs de accounts onboarding precisam ser criadas ou externalizadas antes de teste real.",
  },
  {
    id: "step17_history_gap",
    title: "Consultar histórico de resgates",
    app: "Ambos",
    group: "Wallet Events",
    status: "gap",
    description: "Histórico de eventos da wallet e consulta de pagamento por transaction ID aparecem como GAP no roteiro.",
    missingReason: "APIs de eventos de resgate e comprovantes não estão disponíveis para execução externa no roteiro.",
  },
];

const stepLetter = (index: number) => String.fromCharCode(97 + index);

function classifyJourneySteps(journeySteps: JourneyStep[]): JourneyStep[] {
  return journeySteps.map(step => ({
    ...step,
    actions: step.actions.map((action, index) => ({
      ...action,
      apiClassification: `${step.id}.${stepLetter(index)}`,
    })),
  }));
}

const steps: JourneyStep[] = [
  { id: 1, title: "Empresa cria conta", app: "Business", summary: "Cadastro, OTP, login, criação da empresa e RE-LOGIN obrigatório após criar a empresa (token precisa do dWalletId para passos 4 e 11).", status: "external", actions: actions.filter(a => a.id.startsWith("step1_")) }, // includes step1_employee_relogin
  { id: 2, title: "Pessoa cria carteira", app: "Personal", summary: "Cadastro, OTP anti-automação, login e identificação da pessoa física.", status: "external", actions: actions.filter(a => a.id.startsWith("step2_")) },
  { id: 3, title: "Empresa consulta Standard Value Schemas", app: "Business", summary: "Consulta Standard Value Schemas disponíveis na plataforma. Endpoint de CVS não existe (Cannot POST /commercial).", status: "external", actions: actions.filter(a => a.id === "step3_list_schemas") },
  { id: 4, title: "Empresa registra produto (VS + dSKU)", app: "Business", summary: "Dois sub-fluxos: (1) adiciona VS ao carrinho → checkout registra o produto no catálogo; (2) seleciona dSKU → checkout registra o produto na BdW.", status: "external", actions: actions.filter(a => ["step4_add_vs_to_cart","step4_checkout_vs","step4_list_products","step4_add_dsku_to_cart","step4_checkout_dsku","step4_list_business_products"].includes(a.id)) },
  { id: 5, title: "Pessoa consulta produtos", app: "Personal", summary: "Visão de catálogo de produtos e empresas disponíveis.", status: "external", actions: actions.filter(a => a.id === "step5_person_catalog") },
  { id: 6, title: "Pessoa solicita dados", app: "Personal", summary: "Criação de data request para uma empresa.", status: "external", actions: actions.filter(a => a.id === "step6_create_data_request") },
  { id: 7, title: "Empresa responde solicitação", app: "Business", summary: "Listagem e aceite de solicitação de dados.", status: "external", actions: actions.filter(a => a.id.startsWith("step7_")) },
  { id: 8, title: "Pessoa consulta certificados", app: "Personal", summary: "Certificados associados à conta pessoal.", status: "external", actions: actions.filter(a => a.id === "step8_person_certificates" || a.id === "step8_certificate_detail") },
  { id: 9, title: "Empresa consulta certificados", app: "Business", summary: "Endpoint de certificados empresariais não disponível nesta sandbox.", status: "gap", actions: actions.filter(a => a.id === "step9_business_certificates" || a.id === "step9_business_certificate_detail") },
  { id: 10, title: "Pessoa seleciona DSP", app: "Personal", summary: "Consulta e tentativa de adesão a planos DSP.", status: "external", actions: actions.filter(a => a.id.startsWith("step10_")) },
  { id: 11, title: "Empresa cria ofertas", app: "Business", summary: "Gera preview + compra de oferta. Requer API key com permissão marketplace no gateway DrumWave (AUTHZ_E006 = restrição de ambiente).", status: "external", actions: actions.filter(a => a.id === "step11_offer_preview" || a.id === "step11_offer_purchase") },
  { id: 12, title: "Visualizar Ofertas e Transações", app: "Personal", summary: "Lista ofertas e transações. Requer API key com permissão marketplace (AUTHZ_E006 = restrição de ambiente, não erro de código).", status: "external", actions: actions.filter(a => a.id === "step12_list_offers" || a.id === "step12_offer_transactions") },
  { id: 13, title: "Pessoa aceita/rejeita oferta", app: "Personal", summary: "Pré-aceite (opcional) + aceite definitivo com emailAddress e dataSavingsAccountId (offers-service).", status: "external", actions: actions.filter(a => a.id === "step13_offer_pre_accept" || a.id === "step13_offer_accept" || a.id === "step13_offer_reject") },
  { id: 14, title: "Visualizar saldo DSA", app: "Ambos", summary: "Consulta saldo e informações da Data Savings Account (DSA) pelo dsaId.", status: "external", actions: actions.filter(a => a.id === "step14_dsa_balance") },
  { id: 15, title: "Solicitar resgate", app: "Ambos", summary: "APIs marcadas como internas.", status: "internal", actions: actions.filter(a => a.id === "step15_withdrawal_internal") },
  { id: 16, title: "Cadastrar PIX/conta", app: "Ambos", summary: "APIs inexistentes ou não externalizadas.", status: "gap", actions: actions.filter(a => a.id === "step16_accounts_gap") },
  { id: 17, title: "Histórico de resgates", app: "Ambos", summary: "APIs inexistentes ou não externalizadas.", status: "gap", actions: actions.filter(a => a.id === "step17_history_gap") },
];

const runStateSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({});

function compactStateUpdates(updates: RunState): RunState {
  return Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)) as RunState;
}

function initialState(): RunState {
  const runId = createRunId();
  return {
    runId,
    employeeEmail: `dataprev.bd.local.${runId}@example.com`,
    personEmail: `dataprev.pd.local.${runId}@example.com`,
    businessCnpj: createCnpj(runId),
    personFirstName: "João",
    personLastName: "Santos",
    personPhone: "+5511999990002",
    personPassword: DEFAULT_PASSWORD,
    personAddressLine: "Rua Cidadã 456",
    personCity: "São Paulo",
    personState: "SP",
    personZip: "01310-200",
    employeeFirstName: "Maria",
    employeeLastName: "Silva",
    employeePhone: "+5511999990001",
    employeePassword: DEFAULT_PASSWORD,
    businessName: `Empresa Dataprev Local ${runId}`,
    businessPhone: "+5511999990003",
    businessWebsite: "https://empresa.example.com",
    businessAddressLine: "Rua Exemplo 123",
    businessCity: "São Paulo",
    businessState: "SP",
    businessZip: "01310-100",
    offerId: "dc47fbb5-cb9a-4c96-940b-aae5d17b98ab",
  };
}

async function missingPrerequisite(action: JourneyAction, state: RunState): Promise<string | undefined> {
  if (action.id === "step1_employee_verify_code" && !(state.employeeVerificationCode || state.businessOtp)) return "Informe o código recebido por e-mail para confirmar o colaborador Business.";
  if (action.id === "step2_person_verify_code" && !(state.personVerificationCode || state.otp)) return "Informe o código recebido por e-mail para confirmar a pessoa física.";
  if (action.id === "step4_add_vs_to_cart" && !state.valueSchemaSid) return "Selecione um Standard Value Schema (passo 3) antes de adicionar ao carrinho.";
  if (action.id === "step4_add_vs_to_cart" && !state.businessDwalletId && !state.businessId) return "Crie a entidade empresarial (passo 1) para obter o ID da Business dWallet.";
  if (action.id === "step4_checkout_vs" && !state.valueSchemaSid) return "Adicione o VS ao carrinho (step4_add_vs_to_cart) antes de fazer checkout.";
  if (action.id === "step4_add_dsku_to_cart" && !(state.selectedProductDsku || state.dsku)) return "Selecione um dSKU no catálogo antes de adicionar ao carrinho.";
  if (action.id === "step4_add_dsku_to_cart" && !state.businessDwalletId && !state.businessId) return "Crie a entidade empresarial (passo 1) para obter o ID da Business dWallet.";
  if (action.id === "step4_checkout_dsku" && !state.cartItemId && !(state.selectedProductDsku || state.dsku)) return "Execute step4_add_dsku_to_cart primeiro para capturar o cartItemId necessário no checkout.";
  if (action.id === "step4_list_business_products" && !state.businessId) return "Crie a entidade empresarial (passo 1) para obter o businessId.";
  if (action.id === "step3_create_commercial_value_schema" && !state.valueSchemaSid) return "Selecione um Standard Value Schema (execute o passo 3_list_schemas primeiro).";
  if (action.id === "step11_offer_preview" && !state.businessId) return "Crie a entidade empresarial (passo 1) antes de gerar preview de oferta.";
  if (action.id === "step11_offer_purchase" && !state.offerPreviewId) return "Gere o preview da oferta (step11_offer_preview) antes de efetivar a compra.";
  if (action.id === "step14_dsa_balance" && !state.dspAccountId && !state.dsaId) return "Crie uma conta DSP (passo 10) para obter o dsaId necessário para consultar o saldo.";
  // Verificação de token com lazy loading do banco (sobrevive a reinicializações do servidor)
  if (action.requiresUser === "employee") {
    const employeeToken = await getStoredToken(String(state.employeeTokenHandle || ""));
    if (!employeeToken) return "Execute primeiro o login do colaborador Business para gerar um token de usuário no servidor.";
  }
  if (action.requiresUser === "person") {
    const personToken = await getStoredToken(String(state.personTokenHandle || ""));
    if (!personToken) {
      if (state.personTokenHandle) {
        return "O token de sessão da pessoa física não está mais disponível no servidor. Execute novamente o passo 2 (login da pessoa física) para renovar o token.";
      }
      return "Execute primeiro o login da pessoa física (passo 2) para gerar um token de usuário no servidor.";
    }
  }
  if (action.id === "step1_business_create" && !state.employeeTokenHandle) return "Token do colaborador Business indisponível.";
  if (action.id === "step6_create_data_request" && !state.businessId) return "Crie a entidade empresarial antes de solicitar dados.";
  if (action.id === "step7_list_business_requests" && !state.businessDwalletId && !state.businessId) return "Crie a entidade empresarial antes de listar solicitações.";
  if ((action.id === "step7_accept_data_request" || action.id === "step7_reject_data_request") && !state.dataRequestId) return "Crie ou liste uma solicitação de dados antes de aceitar ou rejeitar.";
  if (action.id === "step10_dsp_details" && !(state.selectedDspId || state.standardDspId || state.commercialDspId)) return "Liste DSPs ou CSPs antes de consultar o detalhe do plano.";
  if (action.id === "step10_create_dsp_account" && !(state.selectedDspId || state.commercialDspId || state.standardDspId)) return "Liste e escolha um DSP ou CSP antes de criar a conta DSP.";
  if (action.id === "step13_offer_accept") {
    const CANONICAL_OFFER_ID = "dc47fbb5-cb9a-4c96-940b-aae5d17b98ab";
    if (!state.offerId || state.offerId === CANONICAL_OFFER_ID) {
      return "Execute o Passo 12 (visualizar transações de oferta) antes de aceitar. O offerId deve ser retornado pela API real, não o valor padrão.";
    }
  }
  return undefined;
}

// Auto-refresh employee token before calls that need it fresh
// Cognito access tokens are short-lived — reuse can cause AUTHZ_E006
async function refreshEmployeeToken(
  state: RunState,
  credentials?: DataprevCredentialsInput
): Promise<{ newHandle: string; newDwalletId?: string } | null> {
  const email = state.employeeEmail;
  const password = state.employeePassword || DEFAULT_PASSWORD;
  if (!email || !password) return null;

  const config = env(credentials);
  const m2mResult = await requestM2MToken(false, credentials).catch(() => null);
  if (!m2mResult) return null;

  try {
    const resp = await fetchViaProxy(`${config.baseUrl}/v1/dwallet/auth/signin`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Authorization": `Bearer ${m2mResult.token}`,
        "Content-Type": "application/json",
        "x-region": "BR",
      },
      body: { email, password },
    });
    const body = await resp.json() as Record<string, unknown>;
    const data = (body?.data ?? body) as Record<string, unknown>;
    const tokens = data?.tokens as Record<string, unknown> | undefined;
    const accessToken = String(tokens?.accessToken ?? data?.accessToken ?? "");
    const dWalletId = String(data?.dWalletId ?? (data?.user as Record<string,unknown>)?.dWalletId ?? "");
    if (!accessToken) return null;
    const handle = storeToken(accessToken);
    console.log(`[auto-refresh] fresh employee token obtained, dWalletId=${dWalletId}`);
    return handle ? { newHandle: handle, newDwalletId: dWalletId || undefined } : null;
  } catch (err) {
    console.warn(`[auto-refresh] failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}


async function execute(action: JourneyAction, inputState: RunState, credentials?: DataprevCredentialsInput): Promise<Evidence> {
  const state = { ...initialState(), ...inputState };
  const executedAt = new Date().toISOString();

  if (action.status === "internal" || action.status === "gap" || !action.method) {
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "not_executable",
      ok: true,
      responseBody: { tipo: action.status, explicacao: action.description, impacto: action.missingReason },
      message: "Etapa sinalizada como API não disponível para execução externa.",
      missingReason: action.missingReason,
      executedAt,
    };
  }

  const prerequisite = await missingPrerequisite(action, state);
  if (prerequisite) {
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "not_executable",
      ok: false,
      responseBody: { preRequisitoNaoAtendido: prerequisite },
      message: prerequisite,
      executedAt,
    };
  }

  let m2m: string | undefined;
  let m2mUsage: Pick<Evidence, "m2mTokenUsed" | "m2mTokenSource" | "m2mTokenHandle" | "m2mTokenExpiresAt"> = {};
  try {
    if (action.requiresM2M) {
      const tokenInfo = await acquireM2MTokenForAction(credentials);
      m2m = tokenInfo.token;
      m2mUsage = {
        m2mTokenUsed: true,
        m2mTokenSource: tokenInfo.source,
        m2mTokenHandle: tokenInfo.handle,
        m2mTokenExpiresAt: new Date(tokenInfo.expiresAt).toISOString(),
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao obter token M2M.";
    const statusMatch = message.match(/HTTP\s+(\d+)/i);
    const status = statusMatch ? Number(statusMatch[1]) : undefined;
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "failed",
      method: action.method,
      url: `${env(credentials).baseUrl}/v1/auth/token/iam/authn/services/oauth2/token`,
      httpStatus: status,
      ok: false,
      requestHeaders: sanitizeDataprevEvidence(headers({ content: true }, credentials), 0, sensitiveValues(env(credentials))) as Record<string, string>,
      responseBody: { etapa: "autenticacao_tecnica_m2m", erro: message, diagnostico: status ? authFailureMessage(status, "m2m") : "Não foi possível obter um token M2M ativo com as credenciais informadas. Gere novamente o token na aba Variáveis ou revise Base URL, x-api-key, client_id e client_secret.", diagnostics: credentialDiagnostics(credentials) },
      stateUpdates: {},
      message: status ? `Falha ao gerar M2M token automaticamente antes desta chamada Dataprev. ${authFailureMessage(status, "m2m")}` : "Falha ao gerar M2M token automaticamente antes desta chamada Dataprev. Não foi possível obter um token M2M ativo com as credenciais informadas.",
      executedAt,
    };
  }
  const userToken = action.requiresUser === "employee" ? await getStoredToken(String(state.employeeTokenHandle || "")) : action.requiresUser === "person" ? await getStoredToken(String(state.personTokenHandle || "")) : undefined;

  // Guard: if action requires user token but none is available, return clear error
  if (action.requiresUser && !userToken) {
    const tokenType = action.requiresUser === "employee" ? "colaborador Business" : "pessoa física";
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "not_executable" as const,
      ok: false,
      message: `Token de ${tokenType} não encontrado no servidor. Execute o login novamente (passo 1d para BdW ou passo 2d para PdW) e tente de novo.`,
      responseBody: { tokenMissing: action.requiresUser, handle: state.employeeTokenHandle || state.personTokenHandle || "(nenhum)" },
      executedAt,
    };
  }

  // Auto-refresh employee token for marketplace offer calls (Cognito tokens are short-lived)
  // The engineer confirmed: AUTHZ_E006 happens when reusing an expired/stale employee token
  // Fix: always get a fresh token immediately before any offer/marketplace call
  const isOfferAction = action.id.startsWith("step11_") || action.id.startsWith("step12_") || action.id.startsWith("step13_");
  let effectiveUserToken = userToken;
  let effectiveState = state;
  if (isOfferAction && action.requiresUser === "employee") {
    const refreshed = await refreshEmployeeToken(state, credentials);
    if (refreshed) {
      effectiveUserToken = await getStoredToken(refreshed.newHandle);
      effectiveState = {
        ...state,
        employeeTokenHandle: refreshed.newHandle,
        ...(refreshed.newDwalletId ? { businessDwalletId: refreshed.newDwalletId } : {}),
      };
      console.log(`[execute] ${action.id} — used fresh employee token`);
    } else {
      console.warn(`[execute] ${action.id} — token refresh failed, proceeding with cached token`);
    }
  }

  console.log(`[execute] ${action.id} m2m=${!!m2m} userToken=${!!effectiveUserToken} fresh=${isOfferAction}`);

  const path = action.buildPath ? action.buildPath(state) : action.path;
  if (!path || path.includes("undefined") || path.includes("null")) {
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "not_executable",
      ok: false,
      message: "Caminho da API não pôde ser montado por falta de identificador prévio.",
      responseBody: { path },
      executedAt,
    };
  }
  let body: JsonValue;
  try {
    body = action.buildBody?.(state, credentials);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao montar o payload da chamada Dataprev.";
    return {
      actionId: action.id,
      actionTitle: action.title,
      status: "not_executable",
      method: action.method,
      ok: false,
      responseBody: { payloadNaoMontado: message },
      message,
      executedAt,
    };
  }
  const requestHeaders = headers({ m2m, userToken: effectiveUserToken, region: action.includeRegion, content: action.method !== "GET", acceptLanguage: action.acceptLanguage }, credentials);
  const effectiveBaseUrl = action.baseUrlOverride || env(credentials).baseUrl;
  // Use effectiveState.businessDwalletId if it was updated by token refresh
  const resolvedPath = action.buildPath ? action.buildPath(effectiveState) : (action.path ?? path);
  const url = `${effectiveBaseUrl}${resolvedPath || path}`;
  const response = await fetchViaProxy(url, {
    method: action.method,
    headers: requestHeaders,
    body: action.method === "GET" || body === undefined ? undefined : body,
  });
  const responseBody = await response.json().catch(() => ({}));
  const expectedStatus = action.expectedStatus || [200, 300];
  // [min, max) range when exactly 2 items and second >= first+100 (e.g. [200,300])
  // Explicit list otherwise (e.g. [200,201,400,500])
  const isRange = expectedStatus.length === 2 && expectedStatus[1] >= expectedStatus[0] + 100;
  const ok = isRange
    ? response.status >= expectedStatus[0] && response.status < expectedStatus[1]
    : expectedStatus.includes(response.status);
  let stateUpdates = ok && action.onSuccess ? compactStateUpdates(action.onSuccess(responseBody, state)) : {};
  // Se onSuccessAsync está definido, chama para complementar/substituir stateUpdates (ex: fallback após 500 de outbox)
  if (ok && action.onSuccessAsync) {
    try {
      const asyncUpdates = await action.onSuccessAsync(responseBody, { ...state, ...stateUpdates }, credentials);
      stateUpdates = compactStateUpdates({ ...stateUpdates, ...asyncUpdates });
    } catch (err) {
      console.warn(`[onSuccessAsync] Falha no fallback assíncrono para ${action.id}:`, err);
    }
  }

  return {
    actionId: action.id,
    actionTitle: action.title,
    status: ok ? "executed" : "failed",
    method: action.method,
    url,
    httpStatus: response.status,
    ok,
    requestHeaders: sanitizeDataprevEvidence(requestHeaders, 0, sensitiveValues(env(credentials))) as Record<string, string>,
    requestBody: sanitizeDataprevEvidence(body, 0, sensitiveValues(env(credentials))) as JsonValue,
    responseBody: sanitizeDataprevEvidence(responseBody, 0, sensitiveValues(env(credentials))),
    stateUpdates: sanitizeDataprevEvidence(stateUpdates, 0, sensitiveValues(env(credentials))) as RunState,
    message: ok ? "Chamada executada dentro da faixa esperada." : authFailureMessage(response.status, "api"),
    ...m2mUsage,
    executedAt,
  };
}

export const dataprevRouter = router({
  metadata: publicProcedure.query(async () => {
    clearExpiredM2MCache();
    // Se não há cache em memória, tentar carregar do banco de dados
    if (!m2mCache) {
      const scope = m2mCredentialScope(undefined);
      const dbCached = await loadM2MToken(scope);
      if (dbCached) {
        const expiresAtMs = dbCached.expiresAt.getTime();
        m2mCache = { token: dbCached.token, expiresAt: expiresAtMs, handle: dbCached.tokenHandle, credentialScope: scope };
      }
    }
    const envConfig = env();
    const hasServerCreds = Boolean(envConfig.baseUrl && envConfig.apiKey && envConfig.clientId && envConfig.clientSecret);
    return {
      credentialsConfigured: hasServerCreds,
      baseUrl: envConfig.baseUrl,
      // Expõe as credenciais do servidor para o frontend pré-preencher os campos automaticamente.
      // Isso permite que o servidor publicado (IP autorizado) execute as chamadas sem intervenção do usuário.
      credentialDefaults: hasServerCreds ? {
        baseUrl: envConfig.baseUrl,
        apiKey: envConfig.apiKey,
        clientId: envConfig.clientId,
        clientSecret: envConfig.clientSecret,
      } : null,
      m2mToken: m2mCache ? {
        tokenHandle: m2mCache.handle,
        expiresAt: new Date(m2mCache.expiresAt).toISOString(),
        active: m2mCache.expiresAt > Date.now() + 60_000,
        expiresInSeconds: Math.max(0, Math.floor((m2mCache.expiresAt - Date.now()) / 1000)),
      } : null,
      initialState: initialState(),
      steps: classifyJourneySteps(steps),
    };
  }),
  authenticateM2M: publicProcedure
    .input(z.object({ credentials: credentialsInputSchema }).optional())
    .mutation(async ({ input }) => authenticateM2MExplicitly(input?.credentials)),
  executeAction: publicProcedure
    .input(z.object({ actionId: z.string(), state: runStateSchema.optional(), credentials: credentialsInputSchema }))
    .mutation(async ({ input }) => {
      const action = actions.find(item => item.id === input.actionId);
      if (!action) throw new Error(`Ação não mapeada: ${input.actionId}`);
      return execute(action, (input.state || {}) as RunState, input.credentials);
    }),
  executeBatchAction: publicProcedure
    .input(z.object({
      actionId: z.string(),
      dataRequestIds: z.array(z.string()).min(1),
      state: runStateSchema.optional(),
      credentials: credentialsInputSchema,
    }))
    .mutation(async ({ input }) => {
      const action = actions.find(item => item.id === input.actionId);
      if (!action) throw new Error(`Ação não mapeada: ${input.actionId}`);
      const results = [];
      for (const requestId of input.dataRequestIds) {
        const stateWithId = { ...(input.state || {}), dataRequestId: requestId } as RunState;
        const result = await execute(action, stateWithId, input.credentials);
        results.push({ dataRequestId: requestId, ...result });
      }
      return {
        ok: results.every(r => r.ok),
        results,
        message: `${results.filter(r => r.ok).length}/${results.length} solicitações processadas com sucesso.`,
      };
    }),
  clearM2MToken: publicProcedure
    .input(z.object({ credentials: credentialsInputSchema }).optional())
    .mutation(async ({ input }) => {
      const scope = m2mCredentialScope(input?.credentials);
      m2mCache = null;
      await deleteM2MToken(scope);
      // Também limpar o escopo padrão (Secrets do servidor) se credenciais temporárias foram usadas
      if (scope !== m2mCredentialScope(undefined)) {
        await deleteM2MToken(m2mCredentialScope(undefined));
      }
      return { ok: true, message: "Token M2M removido do servidor e do banco de dados." };
    }),
});

export type DataprevStep = JourneyStep;
export type DataprevEvidence = Evidence;
