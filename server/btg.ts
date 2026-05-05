import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

type HttpMethod = "GET" | "POST";
type JsonValue = undefined | null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type RunState = Record<string, string | number | boolean | null | undefined>;

type BtgActionStatus = "external" | "gap";

type BtgAction = {
  id: string;
  title: string;
  group: "Conta" | "Extrato" | "Pix" | "Pagamentos" | "Cobranças";
  method?: HttpMethod;
  status: BtgActionStatus;
  description: string;
  buildPath?: (state: RunState) => string;
  buildBody?: (state: RunState) => JsonValue;
  missingReason?: string;
  expectedStatus?: [number, number];
};

type BtgEvidence = {
  provider: "BTG Pactual";
  actionId: string;
  actionTitle: string;
  configured: boolean;
  status: "executed" | "not_executable" | "failed";
  ok: boolean;
  method?: HttpMethod;
  url?: string;
  httpStatus?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: JsonValue;
  responseBody?: unknown;
  message: string;
  durationMs: number;
  executedAt: string;
};

const runStateSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({});

function env(state: RunState = {}) {
  return {
    baseUrl: String(process.env.BTG_BASE_URL || process.env.BTG_BASE_PATH || state.btgBaseUrl || "").replace(/\/+$/, ""),
    companyId: String(process.env.BTG_COMPANY_ID || state.btgCompanyId || ""),
    accessToken: String(process.env.BTG_ACCESS_TOKEN || process.env.BTG_BEARER_TOKEN || process.env.BTG_TOKEN || state.btgAccessToken || ""),
  };
}

function initialState(): RunState {
  const today = new Date();
  const prior = new Date(today);
  prior.setDate(today.getDate() - 30);
  const yyyyMmDd = (date: Date) => date.toISOString().slice(0, 10);
  return {
    btgCompanyId: "",
    btgAccountId: "",
    btgPaymentId: "",
    btgLocationId: "",
    btgPixKey: "exemplo-de-chave-pix",
    btgBarcode: "800800000000000000000000000000000000000000000000",
    btgAmount: 1.1,
    btgDescription: "Teste dWallet gov.br",
    btgPaymentDate: yyyyMmDd(today),
    btgStartDate: yyyyMmDd(prior),
    btgEndDate: yyyyMmDd(today),
    btgDebitBranchCode: "50",
    btgDebitAccountNumber: "000000000",
  };
}

function readString(state: RunState, key: string, fallback = "") {
  return String(state[key] ?? fallback).trim();
}

function readNumber(state: RunState, key: string, fallback: number) {
  const value = Number(state[key]);
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeBtgEvidence(value: unknown, depth = 0): unknown {
  if (depth > 7) return "<TRUNCATED_DEPTH>";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    let output = value;
    const { accessToken } = env();
    if (accessToken) output = output.replaceAll(accessToken, "<REDACTED_TOKEN>");
    output = output.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ••••••••");
    output = output.replace(/eyJ[A-Za-z0-9_\-.]+/g, "<JWT_REDACTED>");
    return output.length > 5000 ? `${output.slice(0, 5000)}...` : output;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(item => sanitizeBtgEvidence(item, depth + 1));
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const secretLike = ["access_token", "refresh_token", "token", "secret", "authorization", "password", "client_secret", "apikey", "api_key"].some(marker => lower.includes(marker));
    output[key] = secretLike && item ? "<REDACTED>" : sanitizeBtgEvidence(item, depth + 1);
  }
  return output;
}

function headers(state: RunState) {
  const token = env(state).accessToken;
  return {
    Authorization: token ? `Bearer ${token}` : "Bearer <MISSING>",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function requirePathValue(state: RunState, key: string, label: string) {
  const value = readString(state, key);
  if (!value) throw new Error(`${label} é obrigatório para esta ação BTG.`);
  return encodeURIComponent(value);
}

const actions: BtgAction[] = [
  {
    id: "btg_list_accounts",
    title: "Consultar contas empresariais BTG",
    group: "Conta",
    method: "GET",
    status: "external",
    description: "Lista as contas bancárias disponíveis para a empresa BTG.",
    buildPath: state => `/${env(state).companyId}/banking/accounts`,
  },
  {
    id: "btg_get_balance",
    title: "Consultar saldo BTG",
    group: "Conta",
    method: "GET",
    status: "external",
    description: "Consulta saldo disponível e contábil da conta empresarial.",
    buildPath: state => `/${env(state).companyId}/banking/accounts/${requirePathValue(state, "btgAccountId", "Conta BTG")}/balances`,
  },
  {
    id: "btg_get_statement",
    title: "Consultar extrato BTG",
    group: "Extrato",
    method: "GET",
    status: "external",
    description: "Consulta lançamentos da conta empresarial no período informado.",
    buildPath: state => `/${env(state).companyId}/banking/accounts/${requirePathValue(state, "btgAccountId", "Conta BTG")}/statements?startDate=${encodeURIComponent(readString(state, "btgStartDate"))}&endDate=${encodeURIComponent(readString(state, "btgEndDate"))}`,
  },
  {
    id: "btg_check_barcode",
    title: "Conferir código de barras BTG",
    group: "Pagamentos",
    method: "GET",
    status: "external",
    description: "Consulta dados de uma linha digitável antes da confirmação de pagamento.",
    buildPath: state => `/${env(state).companyId}/banking/payments/barcodes?code=${encodeURIComponent(readString(state, "btgBarcode"))}`,
  },
  {
    id: "btg_create_payment",
    title: "Enviar pagamento BTG",
    group: "Pagamentos",
    method: "POST",
    status: "external",
    description: "Inicia pagamento de boleto/conta pela conta empresarial BTG.",
    buildPath: state => `/${env(state).companyId}/banking/payments`,
    buildBody: state => ({
      items: [{
        type: "UTILITIES",
        amount: readNumber(state, "btgAmount", 1.1),
        paymentDate: readString(state, "btgPaymentDate", new Date().toISOString().slice(0, 10)),
        debitParty: {
          branchCode: readString(state, "btgDebitBranchCode", "50"),
          number: readString(state, "btgDebitAccountNumber", "000000000"),
        },
        detail: { digitableLine: readString(state, "btgBarcode") },
        tags: { externalId: `dwallet-${Date.now()}` },
      }],
    }),
  },
  {
    id: "btg_list_payments",
    title: "Listar pagamentos BTG",
    group: "Pagamentos",
    method: "GET",
    status: "external",
    description: "Lista iniciações ou pagamentos enviados pela empresa.",
    buildPath: state => `/${env(state).companyId}/banking/payments`,
  },
  {
    id: "btg_get_payment_receipt",
    title: "Gerar comprovante BTG",
    group: "Pagamentos",
    method: "GET",
    status: "external",
    description: "Consulta recibo/comprovante de um pagamento já iniciado.",
    buildPath: state => `/${env(state).companyId}/banking/payments/${requirePathValue(state, "btgPaymentId", "Pagamento BTG")}/receipt`,
  },
  {
    id: "btg_create_pix_location",
    title: "Criar localização Pix BTG",
    group: "Pix",
    method: "POST",
    status: "external",
    description: "Cria localização para QR Code Pix de recebimento.",
    buildPath: state => `/v1/companies/${env(state).companyId}/pix-cash-in/locations`,
    buildBody: state => ({ type: "cob", description: readString(state, "btgDescription", "Recebimento dWallet gov.br") }),
  },
  {
    id: "btg_create_pix_instant_collection",
    title: "Criar cobrança Pix BTG",
    group: "Pix",
    method: "POST",
    status: "external",
    description: "Cria cobrança Pix instantânea para recebimento empresarial.",
    buildPath: state => `/v1/companies/${env(state).companyId}/pix-cash-in/instant-collections`,
    buildBody: state => ({
      pixKey: readString(state, "btgPixKey"),
      amount: { original: readNumber(state, "btgAmount", 1.1), allowCustomerChangeValue: false },
      description: readString(state, "btgDescription", "Recebimento dWallet gov.br"),
    }),
  },
  {
    id: "btg_list_pix_instant_collections",
    title: "Listar cobranças Pix BTG",
    group: "Pix",
    method: "GET",
    status: "external",
    description: "Lista cobranças Pix criadas para a empresa ou localização informada.",
    buildPath: state => `/v1/companies/${env(state).companyId}/pix-cash-in/instant-collections${readString(state, "btgLocationId") ? `?locationId=${encodeURIComponent(readString(state, "btgLocationId"))}` : ""}`,
  },
  {
    id: "btg_register_pix_key_gap",
    title: "Cadastrar chave Pix",
    group: "Pix",
    status: "gap",
    description: "A coleção BTG recebida cobre cobrança e QR Code Pix, mas não contém endpoint de cadastro ou gestão de chave Pix.",
    missingReason: "Endpoint de cadastro/gestão de chave Pix não foi encontrado na coleção BTG Pactual fornecida; a tela deve ser exibida como pendente de contrato técnico.",
  },
  {
    id: "btg_create_collection",
    title: "Criar cobrança bancária BTG",
    group: "Cobranças",
    method: "POST",
    status: "external",
    description: "Cria cobrança bancária/boletos para recebimento empresarial.",
    buildPath: state => `/${env(state).companyId}/banking/collections`,
    buildBody: state => ({
      amount: readNumber(state, "btgAmount", 1.1),
      type: "BANKSLIP",
      dueDate: readString(state, "btgPaymentDate", new Date().toISOString().slice(0, 10)),
      description: readString(state, "btgDescription", "Cobrança dWallet gov.br"),
    }),
  },
  {
    id: "btg_list_collections",
    title: "Listar cobranças bancárias BTG",
    group: "Cobranças",
    method: "GET",
    status: "external",
    description: "Lista cobranças bancárias emitidas pela empresa.",
    buildPath: state => `/${env(state).companyId}/banking/collections?pageSize=10&pageNumber=1`,
  },
];

async function execute(action: BtgAction, inputState: RunState): Promise<BtgEvidence> {
  const started = Date.now();
  const executedAt = new Date().toISOString();
  const state = { ...initialState(), ...inputState };
  const config = env(state);

  if (action.status === "gap" || !action.method) {
    return {
      provider: "BTG Pactual",
      actionId: action.id,
      actionTitle: action.title,
      configured: Boolean(config.baseUrl && config.companyId && config.accessToken),
      status: "not_executable",
      ok: true,
      responseBody: { tipo: "gap", explicacao: action.description, impacto: action.missingReason },
      message: action.missingReason || "Ação BTG sem endpoint executável na coleção fornecida.",
      durationMs: Date.now() - started,
      executedAt,
    };
  }

  let path = "";
  let body: JsonValue;
  try {
    path = action.buildPath?.(state) || "";
    body = action.method === "GET" ? undefined : action.buildBody?.(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao montar a chamada BTG.";
    return {
      provider: "BTG Pactual",
      actionId: action.id,
      actionTitle: action.title,
      configured: Boolean(config.baseUrl && config.companyId && config.accessToken),
      status: "not_executable",
      ok: false,
      method: action.method,
      responseBody: { preRequisitoNaoAtendido: message },
      message,
      durationMs: Date.now() - started,
      executedAt,
    };
  }

  const url = `${config.baseUrl || "https://btg-base-url-nao-configurada"}${path}`;
  const requestHeaders = headers(state);

  if (!config.baseUrl || !config.companyId || !config.accessToken) {
    return {
      provider: "BTG Pactual",
      actionId: action.id,
      actionTitle: action.title,
      configured: false,
      status: "not_executable",
      ok: false,
      method: action.method,
      url,
      requestHeaders: sanitizeBtgEvidence(requestHeaders) as Record<string, string>,
      requestBody: sanitizeBtgEvidence(body) as JsonValue,
      responseBody: {
        message: "Credenciais BTG não configuradas no ambiente.",
        required: ["BTG_BASE_URL", "BTG_COMPANY_ID", "BTG_ACCESS_TOKEN ou BTG_BEARER_TOKEN"],
      },
      message: "Configuração BTG ausente. A tela foi preparada, mas a chamada real depende das credenciais do provedor.",
      durationMs: Date.now() - started,
      executedAt,
    };
  }

  const response = await fetch(url, {
    method: action.method,
    headers: requestHeaders,
    body: action.method === "GET" || body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("json") ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
  const [min, max] = action.expectedStatus || [200, 300];
  const ok = response.status >= min && response.status < max;

  return {
    provider: "BTG Pactual",
    actionId: action.id,
    actionTitle: action.title,
    configured: true,
    status: ok ? "executed" : "failed",
    ok,
    method: action.method,
    url,
    httpStatus: response.status,
    requestHeaders: sanitizeBtgEvidence(requestHeaders) as Record<string, string>,
    requestBody: sanitizeBtgEvidence(body) as JsonValue,
    responseBody: sanitizeBtgEvidence(responseBody),
    message: ok ? "Chamada BTG executada dentro da faixa esperada." : `BTG retornou HTTP ${response.status}; resposta sanitizada anexada para análise.`,
    durationMs: Date.now() - started,
    executedAt,
  };
}

export const btgRouter = router({
  metadata: publicProcedure.query(() => ({
    credentialsConfigured: Boolean(env().baseUrl && env().companyId && env().accessToken),
    baseUrl: env().baseUrl || null,
    companyIdPresent: Boolean(env().companyId),
    accessTokenPresent: Boolean(env().accessToken),
    initialState: initialState(),
    actions: actions.map(({ buildPath, buildBody, ...action }) => action),
  })),
  executeAction: publicProcedure
    .input(z.object({ actionId: z.string(), state: runStateSchema.optional() }))
    .mutation(async ({ input }) => {
      const action = actions.find(item => item.id === input.actionId);
      if (!action) throw new Error(`Ação BTG não mapeada: ${input.actionId}`);
      return execute(action, (input.state || {}) as RunState);
    }),
});

export type { BtgEvidence };
export { sanitizeBtgEvidence };
