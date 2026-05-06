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
    if (!raw) return { ...EMPTY_DATAPREV_CREDENTIALS };
    return normalizeDataprevCredentials(JSON.parse(raw));
  } catch {
    return { ...EMPTY_DATAPREV_CREDENTIALS };
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
  if (!value?.ok || !value.active || !value.expiresAt) return undefined;
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
    const normalized = normalizePersistedM2MTokenStatus(JSON.parse(raw), nowMs);
    if (!normalized) storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    return normalized;
  } catch {
    storage.removeItem(DATAPREV_M2M_TOKEN_STORAGE_KEY);
    return undefined;
  }
}

export function persistM2MTokenStatus(result: M2MAuthResultLike, storage: BrowserCredentialStorage | undefined = getBrowserCredentialStorage(), nowMs = Date.now()) {
  if (!storage) return;
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
