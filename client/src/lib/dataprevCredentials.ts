export type DataprevCredentialForm = {
  baseUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
};

type BrowserCredentialStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type M2MAuthResultLike = {
  active?: boolean;
  ok?: boolean;
  expiresAt?: string | null;
};

export const DATAPREV_CREDENTIALS_STORAGE_KEY = "govbr.dataprev.credentials.v1";
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
