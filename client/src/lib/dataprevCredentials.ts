export type DataprevCredentialForm = {
  baseUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
};

export type PersistedM2MTokenStatus = {
  ok: boolean;
  active: boolean;
  tokenHandle?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  savedAt: string;
  message?: string;
  responseBody?: unknown;
  httpStatus?: number;
};

type BrowserCredentialStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type M2MAuthResultLike = {
  active?: boolean;
  ok?: boolean;
  tokenHandle?: string | null;
  expiresAt?: string | null;
  expiresInSeconds?: number | null;
};

export const DATAPREV_CREDENTIALS_STORAGE_KEY = "govbr.dataprev.credentials.v1";
export const DATAPREV_M2M_TOKEN_STORAGE_KEY = "govbr.dataprev.m2mToken.v1";
export const EMPTY_DATAPREV_CREDENTIALS: DataprevCredentialForm = { baseUrl: "", apiKey: "", clientId: "", clientSecret: "" };

// Default credentials from Postman collection — pre-filled for convenience
export const DEFAULT_DATAPREV_CREDENTIALS: DataprevCredentialForm = {
  baseUrl: "https://api.sandbox.drumwave.com.br",
  apiKey: "pO9xhJPlYh4thAzceW7sU93yeRdASz3D9RV4RPQW",
  clientId: "58l30bcuq3sv5stq2nkt7mcuj7",
  clientSecret: "1i566dr4l6mvm98qcsvbag1nq81eloqe7s9masjhkcesm2l37dgk",
};

export function normalizeDataprevCredentials(value: Partial<DataprevCredentialForm> | null | undefined): DataprevCredentialForm {
  return {
    baseUrl: typeof value?.baseUrl === "string" ? value.baseUrl : "",
    apiKey: typeof value?.apiKey === "string" ? value.apiKey : "",
    clientId: typeof value?.clientId === "string" ? value.clientId : "",
    clientSecret: typeof value?.clientSecret === "string" ? value.clientSecret : "",
  };
}

function getBrowserCredentialStorage(): BrowserCredentialStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readPersistedDataprevCredentials(storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage()): DataprevCredentialForm {
  if (!storage) return { ...EMPTY_DATAPREV_CREDENTIALS };
  try {
    const raw = storage.getItem(DATAPREV_CREDENTIALS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATAPREV_CREDENTIALS };
    const parsed = normalizeDataprevCredentials(JSON.parse(raw));
    // If stored creds are empty, fall back to defaults
    if (!parsed.apiKey && !parsed.clientId) return { ...DEFAULT_DATAPREV_CREDENTIALS };
    return parsed;
  } catch {
    return { ...DEFAULT_DATAPREV_CREDENTIALS };
  }
}

export function persistDataprevCredentials(credentials: DataprevCredentialForm, storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage()) {
  if (!storage) return;
  storage.setItem(DATAPREV_CREDENTIALS_STORAGE_KEY, JSON.stringify(normalizeDataprevCredentials(credentials)));
}

export function clearPersistedDataprevCredentials(storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage()) {
  if (!storage) return;
  storage.removeItem(DATAPREV_CREDENTIALS_STORAGE_KEY);
}

export function isM2MAuthResultActive(result: M2MAuthResultLike | undefined, nowMs = Date.now()) {
  if (!result?.active || !result.ok) return false;
  if (!result.expiresAt) return true;
  const expiresAtMs = Date.parse(result.expiresAt);
  if (!Number.isFinite(expiresAtMs)) return false;
  return expiresAtMs > nowMs + 5_000;
}

export function normalizePersistedM2MTokenStatus(value: Partial<PersistedM2MTokenStatus> | M2MAuthResultLike | null | undefined, nowMs = Date.now()): PersistedM2MTokenStatus | undefined {
  if (!value) return undefined;
  // Failed status: ok === false
  if (value.ok === false) {
    const v = value as Partial<PersistedM2MTokenStatus>;
    return {
      ok: false,
      active: false,
      savedAt: typeof v.savedAt === "string" ? v.savedAt : new Date(nowMs).toISOString(),
      message: v.message,
      responseBody: v.responseBody,
      httpStatus: v.httpStatus,
    };
  }
  // Success status: ok === true
  if (!value.active || !value.expiresAt) return undefined;
  const expiresAtMs = Date.parse(value.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs + 5_000) return undefined;
  return {
    ok: true,
    active: true,
    tokenHandle: typeof value.tokenHandle === "string" ? value.tokenHandle : undefined,
    expiresAt: value.expiresAt,
    expiresInSeconds: Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000)),
    savedAt: typeof (value as Partial<PersistedM2MTokenStatus>).savedAt === "string" ? (value as Partial<PersistedM2MTokenStatus>).savedAt as string : new Date(nowMs).toISOString(),
  };
}

export function readPersistedM2MTokenStatus(storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage(), nowMs = Date.now()): PersistedM2MTokenStatus | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<PersistedM2MTokenStatus>;
    // Preserve failed status as-is (ok === false)
    if (parsed?.ok === false) {
      return {
        ok: false,
        active: false,
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date(nowMs).toISOString(),
        message: parsed.message,
        responseBody: parsed.responseBody,
        httpStatus: parsed.httpStatus,
      };
    }
    const normalized = normalizePersistedM2MTokenStatus(parsed, nowMs);
    if (!normalized) storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    return normalized;
  } catch {
    storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    return undefined;
  }
}

export function persistM2MTokenStatus(result: M2MAuthResultLike | PersistedM2MTokenStatus, storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage(), nowMs = Date.now()) {
  if (!storage) return;
  // Persist failed status directly without normalization
  if ((result as Partial<PersistedM2MTokenStatus>).ok === false) {
    const failStatus: PersistedM2MTokenStatus = {
      ok: false,
      active: false,
      savedAt: (result as Partial<PersistedM2MTokenStatus>).savedAt ?? new Date(nowMs).toISOString(),
      message: (result as Partial<PersistedM2MTokenStatus>).message,
      responseBody: (result as Partial<PersistedM2MTokenStatus>).responseBody,
      httpStatus: (result as Partial<PersistedM2MTokenStatus>).httpStatus,
    };
    storage.setItem(DATAPREV_M2M_TOKEN_STORAGE_KEY, JSON.stringify(failStatus));
    return;
  }
  const normalized = normalizePersistedM2MTokenStatus({ ...result, savedAt: new Date(nowMs).toISOString() }, nowMs);
  if (!normalized) {
    storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    return;
  }
  storage.setItem(DATAPREV_M2M_TOKEN_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearPersistedM2MTokenStatus(storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage()) {
  if (!storage) return;
  storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
}
