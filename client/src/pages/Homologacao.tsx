import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  readPersistedDataprevCredentials,
  persistDataprevCredentials,
  clearPersistedDataprevCredentials,
  readPersistedM2MTokenStatus,
  persistM2MTokenStatus,
  clearPersistedM2MTokenStatus,
  isM2MAuthResultActive,
  type DataprevCredentialForm,
} from "@/lib/dataprevCredentials";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = "pt" | "en";

type ActionResult = {
  actionId: string;
  actionTitle: string;
  status: string;
  ok: boolean;
  httpStatus?: number;
  method?: string;
  url?: string;
  message?: string;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;
  responseBody?: unknown;
  stateUpdates?: Record<string, unknown>;
  executedAt?: string;
};

type RunState = Record<string, string | number | boolean | null>;

type StepStatus = "pending" | "active" | "done" | "gap" | "partial";

type StepResult = {
  stepId: number;
  results: ActionResult[];
  completedAt?: string;
};

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  pt: {
    title: "Jornada de Homologação DrumWave",
    subtitle: "Linha contínua de progresso — Passo 0 ao 17",
    tabProgress: "Progresso",
    tabVariables: "Variáveis",
    tabEvidence: "Evidências",
    btnReset: "Reset Teste",
    btnGenToken: "Gerar M2M Token",
    btnRunStep: "Executar",
    btnRunAll: "Executar todos",
    labelBaseUrl: "Base URL",
    labelApiKey: "x-api-key",
    labelClientId: "Client ID",
    labelClientSecret: "Client Secret",
    sectionCredentials: "Credenciais e Chaves",
    sectionVariables: "Variáveis do Teste",
    sectionDefaults: "Valores Padrão",
    tokenActive: "Token M2M ativo",
    tokenExpired: "Token M2M expirado",
    tokenNone: "Token M2M não gerado",
    tokenExpiresIn: "Expira em",
    credsMissing: "Preencha Base URL, x-api-key, Client ID e Client Secret antes de continuar.",
    stepGap: "Sem API disponível",
    stepInternal: "API interna",
    stepBdW: "BdW",
    stepPdW: "PdW",
    stepBoth: "Ambos",
    noActions: "Nenhuma ação disponível para este passo.",
    executing: "Executando…",
    success: "Sucesso",
    failed: "Falhou",
    stepDone: "Passo concluído",
    stepPartial: "Parcialmente concluído",
    seconds: "s",
    minutes: "min",
    copyJson: "Copiar JSON",
    copied: "Copiado!",
    stateUpdates: "Variáveis capturadas",
    requestSent: "Requisição enviada",
    responseReceived: "Resposta recebida",
    noEvidence: "Nenhuma evidência ainda. Execute os passos para ver os resultados aqui.",
    resetConfirm: "Isso apagará todas as evidências e variáveis do teste. Confirmar?",
    passo: "Passo",
    app: "Aplicação",
    summary: "Resumo",
    actions: "Ações",
    status: "Status",
    inputCode: "Código de verificação (e-mail)",
    inputCodePlaceholder: "Digite o código recebido",
    inputPassword: "Senha (opcional)",
    inputPasswordPlaceholder: "Deixe em branco para usar padrão",
    waitingCode: "Aguardando código de verificação por e-mail…",
    tokenHandle: "Token Handle",
    expiresAt: "Expira em",
    savedAt: "Salvo em",
  },
  en: {
    title: "DrumWave Homologation Journey",
    subtitle: "Continuous progress line — Step 0 to 17",
    tabProgress: "Progress",
    tabVariables: "Variables",
    tabEvidence: "Evidence",
    btnReset: "Reset Test",
    btnGenToken: "Generate M2M Token",
    btnRunStep: "Execute",
    btnRunAll: "Execute all",
    labelBaseUrl: "Base URL",
    labelApiKey: "x-api-key",
    labelClientId: "Client ID",
    labelClientSecret: "Client Secret",
    sectionCredentials: "Credentials & Keys",
    sectionVariables: "Test Variables",
    sectionDefaults: "Default Values",
    tokenActive: "M2M Token active",
    tokenExpired: "M2M Token expired",
    tokenNone: "M2M Token not generated",
    tokenExpiresIn: "Expires in",
    credsMissing: "Fill in Base URL, x-api-key, Client ID and Client Secret before continuing.",
    stepGap: "No API available",
    stepInternal: "Internal API",
    stepBdW: "BdW",
    stepPdW: "PdW",
    stepBoth: "Both",
    noActions: "No actions available for this step.",
    executing: "Executing…",
    success: "Success",
    failed: "Failed",
    stepDone: "Step completed",
    stepPartial: "Partially completed",
    seconds: "s",
    minutes: "min",
    copyJson: "Copy JSON",
    copied: "Copied!",
    stateUpdates: "Captured variables",
    requestSent: "Request sent",
    responseReceived: "Response received",
    noEvidence: "No evidence yet. Execute steps to see results here.",
    resetConfirm: "This will erase all test evidence and variables. Confirm?",
    passo: "Step",
    app: "Application",
    summary: "Summary",
    actions: "Actions",
    status: "Status",
    inputCode: "Verification code (e-mail)",
    inputCodePlaceholder: "Enter the received code",
    inputPassword: "Password (optional)",
    inputPasswordPlaceholder: "Leave blank to use default",
    waitingCode: "Waiting for verification code by e-mail…",
    tokenHandle: "Token Handle",
    expiresAt: "Expires at",
    savedAt: "Saved at",
  },
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_STATE = "homologacao.runState.v1";
const STORAGE_KEY_RESULTS = "homologacao.stepResults.v1";
const STORAGE_KEY_ACTIVE_STEP = "homologacao.activeStep.v1";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_LABELS: Record<number, { pt: string; en: string; app: string }> = {
  0:  { pt: "Gerar Token M2M", en: "Generate M2M Token", app: "BdW/PdW" },
  1:  { pt: "Abrir BdW", en: "Open BdW", app: "BdW" },
  2:  { pt: "Abrir PdW", en: "Open PdW", app: "PdW" },
  3:  { pt: "Consultar Schemas", en: "List Schemas", app: "BdW" },
  4:  { pt: "Criar/Consultar Produtos", en: "Create/List Products", app: "BdW" },
  5:  { pt: "Consultar Dados", en: "Browse Data", app: "PdW" },
  6:  { pt: "Solicitar Dados", en: "Request Data", app: "PdW" },
  7:  { pt: "Aceitar/Rejeitar Solicitação", en: "Accept/Reject Request", app: "BdW" },
  8:  { pt: "Consultar Certificados (PdW)", en: "View Certificates (PdW)", app: "PdW" },
  9:  { pt: "Consultar Certificados (BdW)", en: "View Certificates (BdW)", app: "BdW" },
  10: { pt: "Escolher Plano DSP", en: "Choose DSP Plan", app: "BdW/PdW" },
  11: { pt: "Realizar Ofertas", en: "Create Offers", app: "BdW" },
  12: { pt: "Visualizar Ofertas", en: "View Offers", app: "PdW" },
  13: { pt: "Aceitar/Rejeitar Oferta", en: "Accept/Reject Offer", app: "PdW" },
  14: { pt: "Visualizar Extrato", en: "View Statement", app: "Ambos" },
  15: { pt: "Solicitar Resgate", en: "Request Withdrawal", app: "Ambos" },
  16: { pt: "Cadastrar PIX/Conta", en: "Register PIX/Account", app: "Ambos" },
  17: { pt: "Histórico de Resgates", en: "Withdrawal History", app: "Ambos" },
};

// ─── Helper components ────────────────────────────────────────────────────────

function AppBadge({ app, lang }: { app: string; lang: Lang }) {
  const t = T[lang];
  const colorMap: Record<string, string> = {
    BdW: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PdW: "bg-blue-100 text-blue-800 border-blue-200",
    "BdW/PdW": "bg-purple-100 text-purple-800 border-purple-200",
    Ambos: "bg-purple-100 text-purple-800 border-purple-200",
    Business: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Personal: "bg-blue-100 text-blue-800 border-blue-200",
  };
  const label = app === "Business" ? t.stepBdW : app === "Personal" ? t.stepPdW : app === "Ambos" ? t.stepBoth : app;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorMap[app] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, string> = {
    pending: "bg-gray-300",
    active: "bg-blue-500 ring-4 ring-blue-100",
    done: "bg-emerald-500",
    gap: "bg-amber-400",
    partial: "bg-orange-400",
  };
  return <span className={`inline-block w-3 h-3 rounded-full ${map[status]}`} />;
}

function JsonViewer({ data, label, lang }: { data: unknown; label?: string; lang: Lang }) {
  const t = T[lang];
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
          <button onClick={handleCopy} className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
            {copied ? t.copied : t.copyJson}
          </button>
        </div>
      )}
      <pre className="text-xs p-3 overflow-x-auto max-h-48 text-gray-800 font-mono leading-relaxed">{text}</pre>
    </div>
  );
}

function TokenStatusBadge({ m2mStatus, lang }: { m2mStatus: ReturnType<typeof readPersistedM2MTokenStatus>; lang: Lang }) {
  const t = T[lang];
  if (!m2mStatus) {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">⚪ {t.tokenNone}</span>;
  }
  if (!isM2MAuthResultActive(m2mStatus)) {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">🔴 {t.tokenExpired}</span>;
  }
  const secs = m2mStatus.expiresInSeconds ?? 0;
  const display = secs >= 60 ? `${Math.floor(secs / 60)}${t.minutes}` : `${secs}${t.seconds}`;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      🟢 {t.tokenActive} — {t.tokenExpiresIn} {display}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Homologacao() {
  const [lang, setLang] = useState<Lang>("pt");
  const t = T[lang];

  // Credentials (sessionStorage via dataprevCredentials lib)
  const [creds, setCreds] = useState<DataprevCredentialForm>(() => readPersistedDataprevCredentials());
  const [m2mStatus, setM2mStatus] = useState(() => readPersistedM2MTokenStatus());

  // Run state (localStorage)
  const [runState, setRunState] = useState<RunState>(() => loadFromStorage(STORAGE_KEY_STATE, {}));
  const [stepResults, setStepResults] = useState<StepResult[]>(() => loadFromStorage(STORAGE_KEY_RESULTS, []));
  const [activeStep, setActiveStep] = useState<number>(() => loadFromStorage(STORAGE_KEY_ACTIVE_STEP, 0));
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [verificationCodes, setVerificationCodes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("progress");

  // Server metadata
  const metadata = trpc.dataprev.metadata.useQuery(undefined, { refetchInterval: 30_000 });

  // Mutations
  const authenticateM2M = trpc.dataprev.authenticateM2M.useMutation();
  const executeAction = trpc.dataprev.executeAction.useMutation();
  const clearM2MToken = trpc.dataprev.clearM2MToken.useMutation();

  // Persist state changes
  useEffect(() => { saveToStorage(STORAGE_KEY_STATE, runState); }, [runState]);
  useEffect(() => { saveToStorage(STORAGE_KEY_RESULTS, stepResults); }, [stepResults]);
  useEffect(() => { saveToStorage(STORAGE_KEY_ACTIVE_STEP, activeStep); }, [activeStep]);

  // Sync M2M token from server
  useEffect(() => {
    const serverToken = metadata.data?.m2mToken;
    if (serverToken?.active && !isM2MAuthResultActive(m2mStatus)) {
      const synced = {
        ok: true,
        active: true,
        tokenHandle: serverToken.tokenHandle ?? undefined,
        expiresAt: serverToken.expiresAt ?? undefined,
        expiresInSeconds: serverToken.expiresInSeconds ?? undefined,
        savedAt: new Date().toISOString(),
      };
      setM2mStatus(synced);
      persistM2MTokenStatus(synced);
    }
  }, [metadata.data?.m2mToken]);

  // Sync initial run state from server
  useEffect(() => {
    const initial = metadata.data?.initialState;
    if (initial && Object.keys(runState).length === 0) {
      setRunState(initial as RunState);
    }
  }, [metadata.data?.initialState]);

  // Compute step statuses
  const steps = metadata.data?.steps ?? [];
  const getStepStatus = useCallback((stepId: number): StepStatus => {
    if (stepId === 0) {
      return isM2MAuthResultActive(m2mStatus) ? "done" : "pending";
    }
    const step = steps.find(s => s.id === stepId);
    if (!step) return "pending";
    if (step.status === "gap" || step.status === "internal") return "gap";
    const results = stepResults.find(r => r.stepId === stepId);
    if (!results) return stepId === activeStep ? "active" : "pending";
    const allOk = results.results.every(r => r.ok);
    const anyOk = results.results.some(r => r.ok);
    if (allOk) return "done";
    if (anyOk) return "partial";
    return stepId === activeStep ? "active" : "pending";
  }, [m2mStatus, steps, stepResults, activeStep]);

  // Credentials helpers
  const hasCredentials = creds.baseUrl && creds.apiKey && creds.clientId && creds.clientSecret;

  const handleCredsChange = (field: keyof DataprevCredentialForm, value: string) => {
    const updated = { ...creds, [field]: value };
    setCreds(updated);
    persistDataprevCredentials(updated);
  };

  // Generate M2M token
  const handleGenerateToken = async () => {
    if (!hasCredentials) {
      toast.error(t.credsMissing);
      return;
    }
    setGeneratingToken(true);
    try {
      const result = await authenticateM2M.mutateAsync({
        credentials: {
          baseUrl: creds.baseUrl,
          apiKey: creds.apiKey,
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        },
      });
      if (result.ok) {
        const status = {
          ok: true,
          active: true,
          tokenHandle: result.tokenHandle ?? undefined,
          expiresAt: result.expiresAt ?? undefined,
          expiresInSeconds: result.expiresInSeconds ?? undefined,
          savedAt: new Date().toISOString(),
        };
        setM2mStatus(status);
        persistM2MTokenStatus(status);
        toast.success(lang === "pt" ? "Token M2M gerado com sucesso!" : "M2M Token generated successfully!");
        metadata.refetch();
      } else {
        toast.error(result.message ?? (lang === "pt" ? "Falha ao gerar token M2M" : "Failed to generate M2M token"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setGeneratingToken(false);
    }
  };

  // Execute a single action
  const handleExecuteAction = async (actionId: string, stepId: number) => {
    if (!hasCredentials) {
      toast.error(t.credsMissing);
      setActiveTab("variables");
      return;
    }
    setExecutingAction(actionId);
    try {
      const stateWithCodes = { ...runState };
      // Inject verification codes if present
      if (verificationCodes[actionId]) {
        if (actionId.includes("employee_verify")) stateWithCodes.employeeVerificationCode = verificationCodes[actionId];
        if (actionId.includes("person_verify")) stateWithCodes.personVerificationCode = verificationCodes[actionId];
      }
      const result = await executeAction.mutateAsync({
        actionId,
        state: stateWithCodes,
        credentials: {
          baseUrl: creds.baseUrl,
          apiKey: creds.apiKey,
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        },
      });
      // Merge state updates
      if (result.stateUpdates && Object.keys(result.stateUpdates).length > 0) {
        const newState: RunState = { ...runState, ...(result.stateUpdates as RunState) };
        setRunState(newState);
      }
      // Store result
      setStepResults(prev => {
        const existing = prev.find(r => r.stepId === stepId);
        const newResult = result as ActionResult;
        if (existing) {
          const filtered = existing.results.filter(r => r.actionId !== actionId);
          return prev.map(r => r.stepId === stepId
            ? { ...r, results: [...filtered, newResult], completedAt: new Date().toISOString() }
            : r
          );
        }
        return [...prev, { stepId, results: [newResult], completedAt: new Date().toISOString() }];
      });
      if (result.ok) {
        toast.success(`${actionId}: ${t.success}`);
      } else {
        toast.error(`${actionId}: ${t.failed} — ${result.message ?? ""}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setExecutingAction(null);
    }
  };

  // Reset test
  const handleReset = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    setRunState({});
    setStepResults([]);
    setActiveStep(0);
    setM2mStatus(undefined);
    clearPersistedDataprevCredentials();
    clearPersistedM2MTokenStatus();
    localStorage.removeItem(STORAGE_KEY_STATE);
    localStorage.removeItem(STORAGE_KEY_RESULTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_STEP);
    try {
      await clearM2MToken.mutateAsync({});
    } catch { /* ignore */ }
    setCreds({ baseUrl: "", apiKey: "", clientId: "", clientSecret: "" });
    metadata.refetch();
    toast.success(lang === "pt" ? "Teste resetado com sucesso." : "Test reset successfully.");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const selectedStep = steps.find(s => s.id === activeStep);

  return (
    <div className="min-h-screen bg-[#f0f4fa] govbr-app">
      {/* Header */}
      <header className="bg-[#071d41] text-white shadow-lg">
        <div className="container mx-auto px-4 py-0">
          {/* Top bar */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs text-white/60">
            <span>gov.br</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLang(l => l === "pt" ? "en" : "pt")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 hover:border-white/50 hover:text-white transition-colors text-xs font-medium"
              >
                🌐 {lang === "pt" ? "EN" : "PT"}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-400/40 text-red-300 hover:border-red-400 hover:text-red-200 transition-colors text-xs font-medium"
              >
                ↺ {t.btnReset}
              </button>
            </div>
          </div>
          {/* Main header */}
          <div className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-[#1351b4] flex items-center justify-center text-white font-bold text-lg shadow">
              dW
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{t.title}</h1>
              <p className="text-xs text-white/60">{t.subtitle}</p>
            </div>
            <div className="ml-auto">
              <TokenStatusBadge m2mStatus={m2mStatus} lang={lang} />
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-gray-200 shadow-sm">
            <TabsTrigger value="progress" className="data-[state=active]:bg-[#1351b4] data-[state=active]:text-white">
              📋 {t.tabProgress}
            </TabsTrigger>
            <TabsTrigger value="variables" className="data-[state=active]:bg-[#1351b4] data-[state=active]:text-white">
              🔑 {t.tabVariables}
            </TabsTrigger>
            <TabsTrigger value="evidence" className="data-[state=active]:bg-[#1351b4] data-[state=active]:text-white">
              📄 {t.tabEvidence}
            </TabsTrigger>
          </TabsList>

          {/* ── Progress Tab ── */}
          <TabsContent value="progress" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline column */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-[#071d41] text-white">
                    <h2 className="text-sm font-semibold">Passo 0 → 17</h2>
                  </div>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="p-3 relative">
                      {/* Vertical line */}
                      <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gray-200 z-0" />
                      {Array.from({ length: 18 }, (_, i) => i).map(stepId => {
                        const status = getStepStatus(stepId);
                        const label = STEP_LABELS[stepId];
                        const isSelected = activeStep === stepId;
                        return (
                          <button
                            key={stepId}
                            onClick={() => setActiveStep(stepId)}
                            className={`relative z-10 w-full flex items-start gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-all ${
                              isSelected
                                ? "bg-[#1351b4]/10 border border-[#1351b4]/30"
                                : "hover:bg-gray-50 border border-transparent"
                            }`}
                          >
                            {/* Node */}
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10 ${
                              status === "done" ? "bg-emerald-500 border-emerald-500 text-white" :
                              status === "active" ? "bg-[#1351b4] border-[#1351b4] text-white ring-4 ring-[#1351b4]/20" :
                              status === "gap" ? "bg-amber-100 border-amber-400 text-amber-700" :
                              status === "partial" ? "bg-orange-100 border-orange-400 text-orange-700" :
                              "bg-white border-gray-300 text-gray-500"
                            }`}>
                              {status === "done" ? "✓" : stepId}
                            </div>
                            {/* Label */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className={`text-xs font-semibold truncate ${isSelected ? "text-[#1351b4]" : "text-gray-800"}`}>
                                {lang === "pt" ? label?.pt : label?.en}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <AppBadge app={label?.app ?? ""} lang={lang} />
                                {status === "gap" && (
                                  <span className="text-xs text-amber-600 font-medium">— {t.stepGap}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Step detail column */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {activeStep === 0 ? (
                    <Step0Panel
                      lang={lang}
                      t={t}
                      creds={creds}
                      m2mStatus={m2mStatus}
                      generatingToken={generatingToken}
                      hasCredentials={!!hasCredentials}
                      onGenerate={handleGenerateToken}
                      onGoToVariables={() => setActiveTab("variables")}
                    />
                  ) : selectedStep ? (
                    <StepDetailPanel
                      lang={lang}
                      t={t}
                      step={selectedStep}
                      stepId={activeStep}
                      stepStatus={getStepStatus(activeStep)}
                      runState={runState}
                      stepResults={stepResults.find(r => r.stepId === activeStep)}
                      executingAction={executingAction}
                      verificationCodes={verificationCodes}
                      hasCredentials={!!hasCredentials}
                      m2mActive={isM2MAuthResultActive(m2mStatus)}
                      onExecute={handleExecuteAction}
                      onCodeChange={(actionId, code) => setVerificationCodes(prev => ({ ...prev, [actionId]: code }))}
                      onGoToVariables={() => setActiveTab("variables")}
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <div className="text-4xl mb-3">📋</div>
                      <p>{lang === "pt" ? "Selecione um passo na linha de progresso" : "Select a step from the progress line"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Variables Tab ── */}
          <TabsContent value="variables" className="mt-0">
            <VariablesTab
              lang={lang}
              t={t}
              creds={creds}
              m2mStatus={m2mStatus}
              runState={runState}
              generatingToken={generatingToken}
              hasCredentials={!!hasCredentials}
              onCredsChange={handleCredsChange}
              onGenerate={handleGenerateToken}
            />
          </TabsContent>

          {/* ── Evidence Tab ── */}
          <TabsContent value="evidence" className="mt-0">
            <EvidenceTab
              lang={lang}
              t={t}
              stepResults={stepResults}
              steps={steps}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Step 0 Panel ─────────────────────────────────────────────────────────────

type TDict = typeof T["pt"] | typeof T["en"];

function Step0Panel({
  lang, t, creds, m2mStatus, generatingToken, hasCredentials, onGenerate, onGoToVariables
}: {
  lang: Lang;
  t: TDict;
  creds: DataprevCredentialForm;
  m2mStatus: ReturnType<typeof readPersistedM2MTokenStatus>;
  generatingToken: boolean;
  hasCredentials: boolean;
  onGenerate: () => void;
  onGoToVariables: () => void;
}) {
  const isActive = isM2MAuthResultActive(m2mStatus);
  return (
    <div>
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#071d41] to-[#1351b4]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">0</div>
          <div>
            <h2 className="text-base font-bold text-white">{lang === "pt" ? "Gerar Token M2M" : "Generate M2M Token"}</h2>
            <p className="text-xs text-white/70">{lang === "pt" ? "Autenticação técnica — necessária para todas as chamadas protegidas" : "Technical authentication — required for all protected calls"}</p>
          </div>
          <div className="ml-auto">
            <AppBadge app="BdW/PdW" lang={lang} />
          </div>
        </div>
      </div>
      <div className="p-6 space-y-5">
        <div className={`rounded-lg p-4 border ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{isActive ? "🟢" : "🟡"}</span>
            <span className="font-semibold text-sm">{isActive ? t.tokenActive : t.tokenNone}</span>
          </div>
          {isActive && m2mStatus && (
            <div className="text-xs text-gray-600 space-y-1">
              {m2mStatus.tokenHandle && <div><span className="font-medium">{t.tokenHandle}:</span> {m2mStatus.tokenHandle.slice(0, 20)}…</div>}
              {m2mStatus.expiresAt && <div><span className="font-medium">{t.expiresAt}:</span> {new Date(m2mStatus.expiresAt).toLocaleString()}</div>}
              {m2mStatus.expiresInSeconds !== undefined && (
                <div><span className="font-medium">{t.tokenExpiresIn}:</span> {m2mStatus.expiresInSeconds >= 60 ? `${Math.floor(m2mStatus.expiresInSeconds / 60)}${t.minutes}` : `${m2mStatus.expiresInSeconds}${t.seconds}`}</div>
              )}
            </div>
          )}
        </div>

        {!hasCredentials && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            ℹ️ {t.credsMissing}{" "}
            <button onClick={onGoToVariables} className="underline font-semibold hover:text-blue-900">
              {lang === "pt" ? "Ir para Variáveis →" : "Go to Variables →"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: t.labelBaseUrl, value: creds.baseUrl },
            { label: t.labelApiKey, value: creds.apiKey ? `${creds.apiKey.slice(0, 8)}…` : "—" },
            { label: t.labelClientId, value: creds.clientId ? `${creds.clientId.slice(0, 12)}…` : "—" },
            { label: t.labelClientSecret, value: creds.clientSecret ? "••••••••" : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-gray-500 mb-0.5">{label}</div>
              <div className="font-mono font-semibold text-gray-800 truncate">{value || "—"}</div>
            </div>
          ))}
        </div>

        <Button
          onClick={onGenerate}
          disabled={!hasCredentials || generatingToken}
          className="w-full bg-[#1351b4] hover:bg-[#0c326f] text-white font-semibold"
          size="lg"
        >
          {generatingToken ? (
            <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> {lang === "pt" ? "Gerando…" : "Generating…"}</span>
          ) : (
            <span>🔑 {t.btnGenToken}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step Detail Panel ────────────────────────────────────────────────────────

function StepDetailPanel({
  lang, t, step, stepId, stepStatus, runState, stepResults, executingAction,
  verificationCodes, hasCredentials, m2mActive, onExecute, onCodeChange, onGoToVariables
}: {
  lang: Lang;
  t: TDict;
  step: { id: number; title: string; app: string; summary: string; status: string; actions: Array<{ id: string; title: string; method?: string; requiresM2M?: boolean; requiresUser?: string }> };
  stepId: number;
  stepStatus: StepStatus;
  runState: RunState;
  stepResults?: StepResult;
  executingAction: string | null;
  verificationCodes: Record<string, string>;
  hasCredentials: boolean;
  m2mActive: boolean;
  onExecute: (actionId: string, stepId: number) => void;
  onCodeChange: (actionId: string, code: string) => void;
  onGoToVariables: () => void;
}) {
  const isGap = step.status === "gap" || step.status === "internal";
  const headerBg = step.app === "Business" ? "from-[#0b3d2e] to-[#168821]" :
    step.app === "Personal" ? "from-[#071d41] to-[#1351b4]" :
    "from-[#3d0b3d] to-[#7c3aed]";

  return (
    <div>
      <div className={`px-6 py-4 border-b border-gray-100 bg-gradient-to-r ${headerBg}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
            stepStatus === "done" ? "bg-emerald-400" : stepStatus === "gap" ? "bg-amber-400" : "bg-white/20"
          }`}>
            {stepStatus === "done" ? "✓" : stepId}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">{step.title}</h2>
            <p className="text-xs text-white/70 mt-0.5">{step.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <AppBadge app={step.app} lang={lang} />
            {isGap && <Badge variant="outline" className="text-amber-300 border-amber-400/50 text-xs">{t.stepGap}</Badge>}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {!hasCredentials && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-center gap-2">
            ℹ️ {t.credsMissing}{" "}
            <button onClick={onGoToVariables} className="underline font-semibold">
              {lang === "pt" ? "Ir para Variáveis →" : "Go to Variables →"}
            </button>
          </div>
        )}

        {isGap ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
            <div className="text-3xl mb-2">🚧</div>
            <p className="text-sm font-semibold text-amber-800">{t.stepGap}</p>
            <p className="text-xs text-amber-600 mt-1">{step.summary}</p>
          </div>
        ) : step.actions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t.noActions}</p>
        ) : (
          <div className="space-y-3">
            {step.actions.map(action => {
              const result = stepResults?.results.find(r => r.actionId === action.id);
              const isExecuting = executingAction === action.id;
              const needsCode = action.id.includes("verify_code");
              const methodColor = action.method === "GET" ? "bg-blue-100 text-blue-700" : action.method === "POST" ? "bg-green-100 text-green-700" : action.method === "PUT" || action.method === "PATCH" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700";

              return (
                <div key={action.id} className={`rounded-lg border p-4 transition-all ${
                  result?.ok ? "border-emerald-200 bg-emerald-50/30" :
                  result && !result.ok ? "border-red-200 bg-red-50/30" :
                  "border-gray-200 bg-white"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${methodColor}`}>{action.method}</span>
                        <span className="text-sm font-semibold text-gray-800">{action.title}</span>
                        {result?.ok && <span className="text-xs text-emerald-600 font-medium">✓ {t.success}</span>}
                        {result && !result.ok && <span className="text-xs text-red-600 font-medium">✗ {t.failed}</span>}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">{action.id}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onExecute(action.id, stepId)}
                      disabled={isExecuting || !hasCredentials}
                      className={`flex-shrink-0 text-xs ${result?.ok ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#1351b4] hover:bg-[#0c326f]"} text-white`}
                    >
                      {isExecuting ? <span className="animate-spin">⟳</span> : t.btnRunStep}
                    </Button>
                  </div>

                  {needsCode && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-600 block mb-1">{t.inputCode}</label>
                      <input
                        type="text"
                        value={verificationCodes[action.id] ?? ""}
                        onChange={e => onCodeChange(action.id, e.target.value)}
                        placeholder={t.inputCodePlaceholder}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1351b4]/30 focus:border-[#1351b4]"
                      />
                    </div>
                  )}

                  {result && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${result.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          HTTP {result.httpStatus}
                        </span>
                        {result.url && <span className="truncate font-mono">{result.url}</span>}
                      </div>
                      {result.message && !result.ok && (
                        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{result.message}</p>
                      )}
                      {result.stateUpdates && Object.keys(result.stateUpdates).length > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">📥 {t.stateUpdates}</p>
                          <div className="grid grid-cols-1 gap-1">
                            {Object.entries(result.stateUpdates).map(([k, v]) => (
                              <div key={k} className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-emerald-600 font-semibold">{k}</span>
                                <span className="text-gray-500">→</span>
                                <span className="font-mono text-gray-700 truncate">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.responseBody !== undefined && (
                        <JsonViewer data={result.responseBody} label={t.responseReceived} lang={lang} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Variables Tab ────────────────────────────────────────────────────────────

function VariablesTab({
  lang, t, creds, m2mStatus, runState, generatingToken, hasCredentials, onCredsChange, onGenerate
}: {
  lang: Lang;
  t: TDict;
  creds: DataprevCredentialForm;
  m2mStatus: ReturnType<typeof readPersistedM2MTokenStatus>;
  runState: RunState;
  generatingToken: boolean;
  hasCredentials: boolean;
  onCredsChange: (field: keyof DataprevCredentialForm, value: string) => void;
  onGenerate: () => void;
}) {
  const isActive = isM2MAuthResultActive(m2mStatus);

  const credFields: Array<{ key: keyof DataprevCredentialForm; label: string; type: string; placeholder: string }> = [
    { key: "baseUrl", label: t.labelBaseUrl, type: "url", placeholder: "https://api.sandbox.drumwave.com.br" },
    { key: "apiKey", label: t.labelApiKey, type: "text", placeholder: "sua-api-key" },
    { key: "clientId", label: t.labelClientId, type: "text", placeholder: "client_id" },
    { key: "clientSecret", label: t.labelClientSecret, type: "password", placeholder: "client_secret" },
  ];

  const stateEntries = Object.entries(runState).filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="space-y-6">
      {/* Credentials block — highlighted */}
      <div className="bg-white rounded-xl border-2 border-[#1351b4] shadow-md overflow-hidden">
        <div className="px-5 py-3 bg-[#1351b4] text-white flex items-center gap-2">
          <span className="text-lg">🔑</span>
          <h3 className="font-bold text-sm">{t.sectionCredentials}</h3>
          <div className="ml-auto">
            <TokenStatusBadge m2mStatus={m2mStatus} lang={lang} />
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credFields.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {label}
                  {(key === "baseUrl" || key === "apiKey" || key === "clientId" || key === "clientSecret") && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>
                <input
                  type={type}
                  value={creds[key]}
                  onChange={e => onCredsChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1351b4]/30 focus:border-[#1351b4] font-mono"
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {lang === "pt"
                  ? "Após preencher as credenciais, clique em Gerar M2M Token para autenticar."
                  : "After filling in the credentials, click Generate M2M Token to authenticate."}
              </p>
            </div>
            <Button
              onClick={onGenerate}
              disabled={!hasCredentials || generatingToken}
              className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-semibold ml-4 flex-shrink-0"
            >
              {generatingToken ? (
                <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> {lang === "pt" ? "Gerando…" : "Generating…"}</span>
              ) : (
                <span>🔑 {t.btnGenToken}</span>
              )}
            </Button>
          </div>

          {isActive && m2mStatus && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-700">✓ {t.tokenActive}</p>
              {m2mStatus.tokenHandle && <p><span className="font-medium text-gray-600">{t.tokenHandle}:</span> <span className="font-mono">{m2mStatus.tokenHandle.slice(0, 32)}…</span></p>}
              {m2mStatus.expiresAt && <p><span className="font-medium text-gray-600">{t.expiresAt}:</span> {new Date(m2mStatus.expiresAt).toLocaleString()}</p>}
              {m2mStatus.savedAt && <p><span className="font-medium text-gray-600">{t.savedAt}:</span> {new Date(m2mStatus.savedAt).toLocaleString()}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Run state variables */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-bold text-sm text-gray-800">{t.sectionVariables}</h3>
          <Badge variant="outline" className="ml-auto text-xs">{stateEntries.length} {lang === "pt" ? "variáveis" : "variables"}</Badge>
        </div>
        <div className="p-5">
          {stateEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {lang === "pt" ? "Nenhuma variável capturada ainda. Execute os passos para ver os dados aqui." : "No variables captured yet. Execute steps to see data here."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stateEntries.map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1351b4] font-mono">{key}</div>
                    <div className="text-xs text-gray-700 font-mono truncate mt-0.5">{String(value)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Tab ─────────────────────────────────────────────────────────────

function EvidenceTab({
  lang, t, stepResults, steps
}: {
  lang: Lang;
  t: TDict;
  stepResults: StepResult[];
  steps: Array<{ id: number; title: string; app: string; status: string }>;
}) {
  if (stepResults.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">📄</div>
        <p className="text-gray-500">{t.noEvidence}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stepResults.sort((a, b) => a.stepId - b.stepId).map(stepResult => {
        const step = steps.find(s => s.id === stepResult.stepId);
        const allOk = stepResult.results.every(r => r.ok);
        return (
          <div key={stepResult.stepId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 flex items-center gap-3 ${allOk ? "bg-emerald-50 border-b border-emerald-200" : "bg-red-50 border-b border-red-200"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${allOk ? "bg-emerald-500 text-white" : "bg-red-400 text-white"}`}>
                {allOk ? "✓" : stepResult.stepId}
              </div>
              <div>
                <span className="font-semibold text-sm">{t.passo} {stepResult.stepId}</span>
                {step && <span className="text-gray-500 text-sm ml-2">— {step.title}</span>}
              </div>
              {step && <AppBadge app={step.app} lang={lang} />}
              {stepResult.completedAt && (
                <span className="ml-auto text-xs text-gray-400">{new Date(stepResult.completedAt).toLocaleString()}</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {stepResult.results.map(result => (
                <div key={result.actionId} className={`rounded-lg border p-3 ${result.ok ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${result.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      HTTP {result.httpStatus ?? "—"}
                    </span>
                    <span className="text-sm font-semibold">{result.actionTitle}</span>
                    <span className={`text-xs font-medium ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {result.ok ? `✓ ${t.success}` : `✗ ${t.failed}`}
                    </span>
                  </div>
                  {result.url && <p className="text-xs font-mono text-gray-500 mb-2 truncate">{result.method} {result.url}</p>}
                  {result.message && !result.ok && <p className="text-xs text-red-600 mb-2">{result.message}</p>}
                  {result.stateUpdates && Object.keys(result.stateUpdates).length > 0 && (
                    <JsonViewer data={result.stateUpdates} label={t.stateUpdates} lang={lang} />
                  )}
                  {result.responseBody !== undefined && (
                    <div className="mt-2">
                      <JsonViewer data={result.responseBody} label={t.responseReceived} lang={lang} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
