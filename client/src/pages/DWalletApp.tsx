import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Building2, CheckCircle2, ChevronLeft, CircleAlert, Clock3, DatabaseZap, Loader2, Play, ShieldCheck, Smartphone, WalletCards } from "lucide-react";

type AppKind = "personal" | "business";
type VisualStatus = "pending" | "running" | "done" | "failed" | "missing";
type RunState = Record<string, string | number | boolean | null | undefined>;
type Evidence = {
  actionId: string;
  actionTitle: string;
  status: "executed" | "not_executable" | "failed";
  ok: boolean;
  httpStatus?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: RunState;
  message?: string;
  missingReason?: string;
  executedAt: string;
};

type ScreenField = { key: string; label: string; placeholder: string; type?: string; required?: boolean };

type ScreenConfig = {
  id: string;
  title: string;
  subtitle: string;
  actionId: string;
  apiStatus: "external" | "partial" | "manual" | "internal" | "gap";
  fields: ScreenField[];
};

const statusText: Record<VisualStatus, string> = {
  pending: "pendente",
  running: "executando",
  done: "concluído",
  failed: "falhou",
  missing: "API ausente",
};

const apiStatusText = {
  external: "API externa",
  partial: "API condicionada",
  manual: "API com OTP manual",
  internal: "API interna",
  gap: "API faltante",
};

const personalScreens: ScreenConfig[] = [
  { id: "cadastro", title: "Cadastro da pessoa", subtitle: "Cria a identidade da pessoa física na sandbox e prepara o login da carteira.", actionId: "step2_person_signup", apiStatus: "external", fields: [{ key: "personEmail", label: "E-mail", placeholder: "pessoa@example.com", type: "email", required: true }] },
  { id: "login", title: "Login da pessoa", subtitle: "Obtém token de usuário protegido no servidor para as próximas ações da Personal dWallet.", actionId: "step2_person_signin", apiStatus: "external", fields: [{ key: "personEmail", label: "E-mail", placeholder: "pessoa@example.com", type: "email", required: true }] },
  { id: "carteira", title: "Minha carteira", subtitle: "Consulta dados pessoais, certificados e produtos disponíveis para solicitação de dados.", actionId: "step5_person_catalog", apiStatus: "external", fields: [] },
  { id: "solicitacoes", title: "Solicitar dados", subtitle: "Envia data request para a empresa criada na Business dWallet.", actionId: "step6_create_data_request", apiStatus: "external", fields: [{ key: "businessId", label: "Business ID", placeholder: "Gerado no cadastro empresarial", required: true }] },
  { id: "dsp", title: "Planos DSP", subtitle: "Lista planos comerciais e cria uma conta DSP quando disponível.", actionId: "step10_commercial_dsps", apiStatus: "external", fields: [] },
  { id: "ofertas", title: "Ofertas e aceite", subtitle: "Visualiza ofertas retornadas pela API e tenta registrar aceite quando há offerId utilizável.", actionId: "step12_person_offers", apiStatus: "external", fields: [{ key: "offerId", label: "Offer ID", placeholder: "Preenchido pelo passo 12 quando disponível", required: true }] },
  { id: "checkout", title: "Carrinho e checkout", subtitle: "Tela operacional para evidenciar a lacuna de criação externa de ofertas/carrinho.", actionId: "step11_business_offers_gap", apiStatus: "gap", fields: [] },
  { id: "extrato", title: "Extrato", subtitle: "Consulta extrato financeiro por contas DSP conhecidas.", actionId: "step14_wallet_statement", apiStatus: "external", fields: [{ key: "dspAccountId", label: "Conta DSP", placeholder: "Gerada na adesão ao DSP", required: true }] },
  { id: "resgate", title: "Resgate", subtitle: "Registra que o resgate depende de APIs internas, não externalizadas para a sandbox atual.", actionId: "step15_withdrawal_internal", apiStatus: "internal", fields: [] },
  { id: "pix", title: "PIX e conta bancária", subtitle: "Registra ausência de API externa para cadastro de chave PIX ou conta bancária.", actionId: "step16_accounts_gap", apiStatus: "gap", fields: [] },
  { id: "historico", title: "Histórico de resgates", subtitle: "Registra ausência de endpoint externo para histórico de resgates.", actionId: "step17_history_gap", apiStatus: "gap", fields: [] },
];

const businessScreens: ScreenConfig[] = [
  { id: "colaborador", title: "Cadastro do colaborador", subtitle: "Cria e autentica o colaborador Business usado para operar a empresa.", actionId: "step1_employee_signup", apiStatus: "external", fields: [{ key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true }] },
  { id: "login", title: "Login Business", subtitle: "Gera token de usuário do colaborador e mantém o segredo fora do navegador.", actionId: "step1_employee_signin", apiStatus: "external", fields: [{ key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true }] },
  { id: "empresa", title: "Cadastro empresarial", subtitle: "Cria a entidade empresarial, com CNPJ sintético, para receber solicitações de dados.", actionId: "step1_business_create", apiStatus: "external", fields: [{ key: "businessCnpj", label: "CNPJ", placeholder: "00000000000100", required: true }] },
  { id: "schemas", title: "Schemas", subtitle: "Consulta schemas de dados disponíveis para configurar produtos e solicitações.", actionId: "step3_list_schemas", apiStatus: "external", fields: [] },
  { id: "produtos", title: "Produtos e catálogo", subtitle: "Consulta produtos existentes e cria produto de marketplace quando há permissão.", actionId: "step4_list_products", apiStatus: "external", fields: [{ key: "businessId", label: "Business ID", placeholder: "Gerado no cadastro empresarial", required: true }] },
  { id: "planos", title: "Planos comerciais", subtitle: "Consulta planos DSP aplicáveis para a operação financeira da empresa e para a etapa de adesão da pessoa.", actionId: "step10_commercial_dsps", apiStatus: "external", fields: [] },
  { id: "solicitacoes", title: "Solicitações de dados", subtitle: "Lista e aceita solicitações recebidas da Personal dWallet.", actionId: "step7_list_business_requests", apiStatus: "external", fields: [{ key: "businessId", label: "Business ID", placeholder: "Gerado no cadastro empresarial", required: true }] },
  { id: "certificados", title: "Certificados empresariais", subtitle: "Consulta certificados associados à empresa, quando autorizados pela sandbox.", actionId: "step9_business_certificates", apiStatus: "external", fields: [] },
  { id: "ofertas", title: "Ofertas comerciais", subtitle: "Mostra lacuna de endpoint externo para criação/publicação de ofertas.", actionId: "step11_business_offers_gap", apiStatus: "gap", fields: [] },
  { id: "checkout", title: "Carrinho e checkout Business", subtitle: "Tela operacional para acompanhamento financeiro com endpoint de contas DSP executável.", actionId: "step14_wallet_statement", apiStatus: "external", fields: [{ key: "dspAccountId", label: "Conta DSP", placeholder: "Conta DSP conhecida", required: true }] },
  { id: "operacoes", title: "Acompanhamento de operações", subtitle: "Registra resgates, contas e histórico como dependências de APIs internas ou faltantes.", actionId: "step17_history_gap", apiStatus: "gap", fields: [] },
];

function readableJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function compactRunState(value: RunState): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Record<string, string | number | boolean | null>;
}

function getVisualStatus(screen: ScreenConfig, evidence: Evidence | undefined, runningId: string | undefined): VisualStatus {
  if (runningId === screen.actionId) return "running";
  if (!evidence && (screen.apiStatus === "gap" || screen.apiStatus === "internal")) return "missing";
  if (!evidence) return "pending";
  if (evidence.status === "not_executable") return evidence.ok ? "missing" : "failed";
  return evidence.ok ? "done" : "failed";
}

function fieldError(field: ScreenField, value: unknown) {
  const text = String(value ?? "").trim();
  if (!field.required) return undefined;
  if (!text) return `${field.label} é obrigatório para executar esta tela.`;
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Informe um e-mail válido.";
  if (field.key.toLowerCase().includes("cnpj") && !/^\d{14}$/.test(text.replace(/\D/g, ""))) return "Informe um CNPJ com 14 dígitos.";
  if (field.key.toLowerCase().endsWith("id") && /gerado|preenchido|conhecida|conhecido/i.test(text)) return `${field.label} ainda não foi gerado por uma etapa anterior.`;
  return undefined;
}

export function DWalletApp({ kind }: { kind: AppKind }) {
  const executeAction = trpc.dataprev.executeAction.useMutation();
  const metadata = trpc.dataprev.metadata.useQuery();
  const [state, setState] = useState<RunState>({});
  const [evidences, setEvidences] = useState<Record<string, Evidence>>({});
  const [runningId, setRunningId] = useState<string>();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  const screens = kind === "personal" ? personalScreens : businessScreens;
  const isPersonal = kind === "personal";
  const mergedState = useMemo(() => ({ ...(metadata.data?.initialState || {}), ...state }), [metadata.data?.initialState, state]);
  const completed = screens.filter(screen => evidences[screen.actionId]?.ok).length;

  const updateField = (key: string, value: string) => {
    setState(previous => ({ ...previous, [key]: value }));
    setFormErrors(previous => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const validate = (screen: ScreenConfig) => {
    const next: Record<string, string> = {};
    for (const field of screen.fields) {
      const error = fieldError(field, mergedState[field.key]);
      if (error) next[field.key] = error;
    }
    if (Object.keys(next).length > 0) {
      setFormErrors(previous => ({ ...previous, ...next }));
      setOperationErrors(previous => ({ ...previous, [screen.actionId]: "Revise os campos destacados antes de executar a chamada." }));
      return false;
    }
    return true;
  };

  const run = async (screen: ScreenConfig) => {
    if (!validate(screen)) return;
    setRunningId(screen.actionId);
    setOperationErrors(previous => {
      const next = { ...previous };
      delete next[screen.actionId];
      return next;
    });
    try {
      const evidence = await executeAction.mutateAsync({ actionId: screen.actionId, state: compactRunState(mergedState) });
      setEvidences(previous => ({ ...previous, [screen.actionId]: evidence as Evidence }));
      setState(previous => compactRunState({ ...previous, ...((evidence as Evidence).stateUpdates || {}) }));
      if (!(evidence as Evidence).ok) {
        setOperationErrors(previous => ({ ...previous, [screen.actionId]: (evidence as Evidence).message || "A API retornou uma falha operacional. Consulte a evidência." }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha de rede ou erro inesperado ao chamar a API.";
      setOperationErrors(previous => ({ ...previous, [screen.actionId]: message }));
      setEvidences(previous => ({
        ...previous,
        [screen.actionId]: {
          actionId: screen.actionId,
          actionTitle: screen.title,
          status: "failed",
          ok: false,
          message,
          responseBody: { erro: message },
          executedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setRunningId(undefined);
    }
  };

  return (
    <main className="govbr-app min-h-screen bg-[#F8F8F8] text-slate-950">
      <header className={isPersonal ? "govbr-hero-personal" : "govbr-hero-business"}>
        <div className="container py-7 text-white">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"><ChevronLeft className="h-4 w-4" />Voltar à jornada integrada</Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4">
              <Badge className="bg-[#FFCD07] text-[#071D41]">{isPersonal ? "Aplicativo cidadão" : "Aplicativo empresarial"}</Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{isPersonal ? "Personal dWallet" : "Business dWallet"}</h1>
              <p className="max-w-3xl text-base leading-7 text-blue-50">{isPersonal ? "Experiência local da pessoa física para cadastro, carteira, solicitações de dados, DSPs, ofertas, checkout, extrato e resgate." : "Experiência local da empresa para colaborador, cadastro empresarial, produtos, planos, solicitações, ofertas, checkout e acompanhamento de operações."}</p>
            </div>
            <Card className="border-white/20 bg-white/10 text-white backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5" />Progresso da aplicação</CardTitle><CardDescription className="text-blue-50">Estados visuais: pendente, executando, concluído, falhou e API ausente.</CardDescription></CardHeader>
              <CardContent><Progress value={Math.round((completed / screens.length) * 100)} /><p className="mt-3 text-sm text-blue-50">{completed} de {screens.length} telas com evidência OK.</p></CardContent>
            </Card>
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base">{isPersonal ? <Smartphone className="h-5 w-5 text-[#1351B4]" /> : <Building2 className="h-5 w-5 text-[#168821]" />}Navegação</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {screens.map(screen => {
                const status = getVisualStatus(screen, evidences[screen.actionId], runningId);
                return <a key={screen.id} href={`#${screen.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><span>{screen.title}</span><Badge variant="outline" className="text-[10px]">{statusText[status]}</Badge></a>;
              })}
            </CardContent>
          </Card>
          <Alert className="border-[#1351B4]/20 bg-white"><ShieldCheck className="h-4 w-4" /><AlertTitle>Segurança</AlertTitle><AlertDescription>Os tokens e chaves ficam no servidor local. Esta tela recebe apenas evidências sanitizadas.</AlertDescription></Alert>
        </aside>

        <section className="space-y-5">
          {screens.map(screen => {
            const evidence = evidences[screen.actionId];
            const visualStatus = getVisualStatus(screen, evidence, runningId);
            const operationError = operationErrors[screen.actionId];
            return (
              <Card id={screen.id} key={screen.id} className="scroll-mt-6 border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><CardTitle>{screen.title}</CardTitle><CardDescription className="mt-1 max-w-3xl leading-6">{screen.subtitle}</CardDescription></div>
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{apiStatusText[screen.apiStatus]}</Badge><Badge className={visualStatus === "done" ? "bg-green-700" : visualStatus === "failed" ? "bg-red-700" : visualStatus === "running" ? "bg-blue-700" : visualStatus === "missing" ? "bg-amber-700" : "bg-slate-600"}>{visualStatus === "running" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : visualStatus === "done" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : visualStatus === "missing" ? <CircleAlert className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}{statusText[visualStatus]}</Badge></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {operationError ? <Alert className="border-red-200 bg-red-50 text-red-950"><CircleAlert className="h-4 w-4" /><AlertTitle>Não foi possível executar esta tela</AlertTitle><AlertDescription>{operationError}</AlertDescription></Alert> : null}
                  {screen.fields.length ? <div className="grid gap-4 md:grid-cols-2">{screen.fields.map(field => {
                    const error = formErrors[field.key];
                    return <div key={field.key} className="space-y-2"><Label htmlFor={`${screen.id}-${field.key}`}>{field.label}</Label><Input aria-invalid={Boolean(error)} aria-describedby={error ? `${screen.id}-${field.key}-erro` : undefined} id={`${screen.id}-${field.key}`} type={field.type || "text"} value={String(mergedState[field.key] || "")} onChange={event => updateField(field.key, event.target.value)} placeholder={field.placeholder} className={error ? "border-red-500 focus-visible:ring-red-500" : undefined} />{error ? <p id={`${screen.id}-${field.key}-erro`} className="text-sm font-medium text-red-700">{error}</p> : null}</div>;
                  })}</div> : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Esta tela usa o estado gerado pela jornada ou registra uma lacuna de API sem exigir novo preenchimento.</p>}
                  <Button onClick={() => run(screen)} disabled={Boolean(runningId)} className={isPersonal ? "bg-[#1351B4] hover:bg-[#0C326F]" : "bg-[#168821] hover:bg-[#0f6418]"}><Play className="mr-2 h-4 w-4" />Executar ação desta tela</Button>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Textarea readOnly value={readableJson({ estadoAtual: mergedState, requisicao: evidence?.requestBody })} className="min-h-44 bg-slate-950 font-mono text-xs text-slate-100" />
                    <Textarea readOnly value={readableJson(evidence?.responseBody || evidence)} className="min-h-44 bg-slate-950 font-mono text-xs text-slate-100" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
