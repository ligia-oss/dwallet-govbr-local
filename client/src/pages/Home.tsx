import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Building2, CheckCircle2, CircleAlert, DatabaseZap, Landmark, Loader2, Play, ShieldCheck, Smartphone, UserRound } from "lucide-react";

type RunState = Record<string, string | number | boolean | null | undefined>;
type Evidence = {
  actionId: string;
  actionTitle: string;
  status: "executed" | "not_executable" | "failed";
  method?: string;
  url?: string;
  httpStatus?: number;
  ok: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: RunState;
  message?: string;
  missingReason?: string;
  executedAt: string;
};

type JourneyAction = {
  id: string;
  title: string;
  app: "Personal" | "Business" | "Ambos";
  method?: string;
  path?: string;
  group: string;
  status: "external" | "internal" | "gap" | "manual" | "partial";
  description: string;
  missingReason?: string;
};

type JourneyStep = {
  id: number;
  title: string;
  app: "Personal" | "Business" | "Ambos";
  summary: string;
  status: "external" | "internal" | "gap" | "manual" | "partial";
  actions: JourneyAction[];
};

const statusLabels = {
  external: "API executável",
  partial: "Parcial",
  manual: "Manual",
  internal: "Interna",
  gap: "API faltante",
} as const;

const statusClass = {
  external: "bg-green-50 text-green-800 border-green-200",
  partial: "bg-amber-50 text-amber-900 border-amber-200",
  manual: "bg-blue-50 text-blue-900 border-blue-200",
  internal: "bg-zinc-100 text-zinc-700 border-zinc-200",
  gap: "bg-red-50 text-red-800 border-red-200",
} as const;

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function EvidencePanel({ evidence }: { evidence?: Evidence }) {
  if (!evidence) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-600">
        Nenhuma evidência registrada para esta ação nesta sessão local.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-50 shadow-inner">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={evidence.ok ? "bg-green-600" : "bg-red-600"}>{evidence.ok ? "OK" : "Atenção"}</Badge>
        {evidence.httpStatus ? <Badge variant="secondary">HTTP {evidence.httpStatus}</Badge> : <Badge variant="secondary">Não executável</Badge>}
        <span className="text-xs text-slate-300">{new Date(evidence.executedAt).toLocaleString("pt-BR")}</span>
      </div>
      <p className="text-sm text-slate-200">{evidence.message || evidence.missingReason}</p>
      {evidence.url ? <p className="break-all text-xs text-slate-400">{evidence.method} {evidence.url}</p> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requisição</span>
          <Textarea readOnly value={formatJson({ headers: evidence.requestHeaders, body: evidence.requestBody })} className="min-h-40 border-slate-700 bg-slate-900 font-mono text-xs text-slate-100" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resposta</span>
          <Textarea readOnly value={formatJson(evidence.responseBody)} className="min-h-40 border-slate-700 bg-slate-900 font-mono text-xs text-slate-100" />
        </label>
      </div>
    </div>
  );
}

function ActionCard({ action, evidence, running, onRun }: { action: JourneyAction; evidence?: Evidence; running: boolean; onRun: (id: string) => void }) {
  const isUnavailable = action.status === "gap" || action.status === "internal";
  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base text-slate-900">{action.title}</CardTitle>
            <CardDescription>{action.group}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn("border", statusClass[action.status])}>{statusLabels[action.status]}</Badge>
            {action.method ? <Badge variant="secondary">{action.method}</Badge> : null}
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-700">{action.description}</p>
        {action.path ? <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{action.path}</code> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => onRun(action.id)} disabled={running} variant={isUnavailable ? "secondary" : "default"} className="w-full justify-center bg-[#1351B4] text-white hover:bg-[#0C326F] disabled:opacity-60">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          {isUnavailable ? "Registrar lacuna" : "Executar etapa"}
        </Button>
        <EvidencePanel evidence={evidence} />
      </CardContent>
    </Card>
  );
}

function StepSection({ step, evidences, runningActionId, onRun }: { step: JourneyStep; evidences: Record<string, Evidence>; runningActionId?: string; onRun: (id: string) => void }) {
  return (
    <section id={`passo-${step.id}`} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1351B4]">Passo {step.id} de 17 · {step.app}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">{step.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{step.summary}</p>
        </div>
        <Badge variant="outline" className={cn("border", statusClass[step.status])}>{statusLabels[step.status]}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {step.actions.map(action => (
          <ActionCard key={action.id} action={action} evidence={evidences[action.id]} running={runningActionId === action.id} onRun={onRun} />
        ))}
      </div>
    </section>
  );
}

function AppOverview({ steps, evidences }: { steps: JourneyStep[]; evidences: Record<string, Evidence> }) {
  const totalActions = steps.flatMap(step => step.actions).length;
  const executed = Object.values(evidences).filter(item => item.status === "executed").length;
  const gaps = steps.flatMap(step => step.actions).filter(item => item.status === "gap" || item.status === "internal").length;
  const progress = totalActions ? Math.round((Object.keys(evidences).length / totalActions) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card className="border-[#1351B4]/20 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-sm text-slate-600">Ações registradas</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-[#1351B4]">{Object.keys(evidences).length}/{totalActions}</p><Progress value={progress} className="mt-3" /></CardContent>
      </Card>
      <Card className="border-green-200 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-sm text-slate-600">Execuções OK</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-green-700">{executed}</p><p className="mt-2 text-xs text-slate-500">Chamadas dentro da faixa esperada.</p></CardContent>
      </Card>
      <Card className="border-amber-200 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-sm text-slate-600">Parciais/Manuais</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-amber-700">{steps.flatMap(step => step.actions).filter(item => item.status === "partial" || item.status === "manual").length}</p><p className="mt-2 text-xs text-slate-500">Dependem de permissão, e-mail ou feature flag.</p></CardContent>
      </Card>
      <Card className="border-red-200 bg-white shadow-sm">
        <CardHeader><CardTitle className="text-sm text-slate-600">Lacunas mapeadas</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-red-700">{gaps}</p><p className="mt-2 text-xs text-slate-500">APIs faltantes ou internas.</p></CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const metadata = trpc.dataprev.metadata.useQuery();
  const executeAction = trpc.dataprev.executeAction.useMutation();
  const [runState, setRunState] = useState<RunState>({});
  const [evidences, setEvidences] = useState<Record<string, Evidence>>({});
  const [runningActionId, setRunningActionId] = useState<string>();

  const steps = (metadata.data?.steps || []) as JourneyStep[];
  const mergedState = useMemo(() => ({ ...(metadata.data?.initialState || {}), ...runState }), [metadata.data?.initialState, runState]);
  const businessSteps = steps.filter(step => step.app === "Business" || step.app === "Ambos");
  const personalSteps = steps.filter(step => step.app === "Personal" || step.app === "Ambos");
  const missingApis = steps.flatMap(step => step.actions.map(action => ({ step, action }))).filter(item => item.action.status === "gap" || item.action.status === "internal");

  const runAction = async (actionId: string) => {
    setRunningActionId(actionId);
    try {
      const evidence = await executeAction.mutateAsync({ actionId, state: mergedState as Record<string, string | number | boolean | null> });
      setEvidences(previous => ({ ...previous, [actionId]: evidence as Evidence }));
      setRunState(previous => ({ ...previous, ...((evidence as Evidence).stateUpdates || {}) }));
    } finally {
      setRunningActionId(undefined);
    }
  };

  if (metadata.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#1351B4]" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8] text-slate-950">
      <header className="border-b border-[#DFE1E2] bg-white">
        <div className="container flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1351B4] text-white shadow-sm"><Landmark className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1351B4]">padrão gov.br · sandbox local</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Personal dWallet e Business dWallet</h1>
              <p className="text-sm text-slate-600">Protótipo local em português para executar APIs e documentar a jornada de 17 passos.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-700 text-white"><ShieldCheck className="mr-1 h-3 w-3" />Credenciais server-side</Badge>
            <Badge variant="outline" className="border-[#1351B4] text-[#1351B4]">{metadata.data?.baseUrl}</Badge>
          </div>
        </div>
      </header>

      <section className="bg-[linear-gradient(135deg,#071D41_0%,#0C326F_52%,#1351B4_100%)] text-white">
        <div className="container grid gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="bg-[#FFCD07] text-[#071D41]">Jornada integrada de dados</Badge>
            <h2 className="max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">Duas aplicações, uma trilha de execução com evidências de API por tela.</h2>
            <p className="max-w-3xl text-base leading-7 text-blue-50">A interface usa linguagem e padrões visuais inspirados no Design System gov.br: hierarquia clara, contraste alto, ações descritivas, linguagem cidadã e cards de evidência auditáveis. Cada ação chama o backend local, que injeta segredos somente no servidor e retorna respostas sanitizadas.</p>
          </div>
          <Card className="border-white/20 bg-white/10 text-white backdrop-blur">
            <CardHeader><CardTitle>Estado da sessão local</CardTitle><CardDescription className="text-blue-50">Identificadores gerados para viabilizar a jornada sem dados pessoais reais.</CardDescription></CardHeader>
            <CardContent><Textarea readOnly value={formatJson(mergedState)} className="min-h-56 border-white/20 bg-[#071D41]/80 font-mono text-xs text-white" /></CardContent>
          </Card>
        </div>
      </section>

      <div className="container space-y-8 py-8">
        {!metadata.data?.credentialsConfigured ? (
          <Alert className="border-red-200 bg-red-50"><CircleAlert className="h-4 w-4" /><AlertTitle>Credenciais indisponíveis</AlertTitle><AlertDescription>Configure DATAPREV_BASE_URL, DATAPREV_API_KEY, DATAPREV_CLIENT_ID e DATAPREV_CLIENT_SECRET no servidor para executar as chamadas.</AlertDescription></Alert>
        ) : null}

        <AppOverview steps={steps} evidences={evidences} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border-[#1351B4]/20 bg-white shadow-sm">
            <CardHeader className="bg-[#EAF2FF]"><div className="flex items-center gap-3"><UserRound className="h-6 w-6 text-[#1351B4]" /><div><CardTitle>Personal dWallet</CardTitle><CardDescription>Carteira da pessoa física para dados, certificados, ofertas, DSPs e extrato.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4 pt-5"><p className="text-sm leading-6 text-slate-700">A aplicação Personal prioriza linguagem simples, consentimento explícito e evidência visível de cada resposta recebida. Os passos 2, 5, 6, 8, 10, 12, 13, 14, 15, 16 e 17 aparecem nesta visão.</p><Button asChild className="bg-[#1351B4] hover:bg-[#0C326F]"><Link href="/personal">Abrir Personal dWallet</Link></Button></CardContent>
          </Card>
          <Card className="overflow-hidden border-[#168821]/20 bg-white shadow-sm">
            <CardHeader className="bg-[#F0FFF4]"><div className="flex items-center gap-3"><Building2 className="h-6 w-6 text-[#168821]" /><div><CardTitle>Business dWallet</CardTitle><CardDescription>Carteira empresarial para cadastro, schemas, produtos, solicitações e certificados.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4 pt-5"><p className="text-sm leading-6 text-slate-700">A aplicação Business organiza rotinas de colaborador, entidade empresarial e execução de data requests. Os passos 1, 3, 4, 7, 9, 11, 14, 15, 16 e 17 aparecem nesta visão.</p><Button asChild className="bg-[#168821] hover:bg-[#0f6418]"><Link href="/business">Abrir Business dWallet</Link></Button></CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border-[#1351B4]/30 bg-white shadow-sm">
            <CardHeader className="govbr-hero-personal text-white"><div className="flex items-center gap-3"><Smartphone className="h-6 w-6 text-[#FFCD07]" /><div><CardTitle>Personal dWallet GovBR</CardTitle><CardDescription className="text-blue-50">Novo front-end com identidade visual gov.br e navegação espelhada da homologação.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4 pt-5"><p className="text-sm leading-6 text-slate-700">Reproduz entrada, cadastro, verificação de e-mail, foto, KYC, painel, solicitações, planos DSP, marketplace, carrinho, extrato e configurações, mantendo evidências sanitizadas por tela.</p><Button asChild className="bg-[#1351B4] hover:bg-[#0C326F]"><Link href="/personal-govbr">Abrir Personal GovBR</Link></Button></CardContent>
          </Card>
          <Card className="overflow-hidden border-[#168821]/30 bg-white shadow-sm">
            <CardHeader className="govbr-hero-business text-white"><div className="flex items-center gap-3"><Building2 className="h-6 w-6 text-[#FFCD07]" /><div><CardTitle>Business dWallet GovBR</CardTitle><CardDescription className="text-blue-50">Novo front-end empresarial com telas e navegação compatíveis com a homologação DrumWave.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4 pt-5"><p className="text-sm leading-6 text-slate-700">Reproduz acesso do colaborador, verificação, cadastro empresarial, KYC, dashboard, schemas, produtos, planos, ofertas, checkout, operações e configurações.</p><Button asChild className="bg-[#168821] hover:bg-[#0f6418]"><Link href="/business-govbr">Abrir Business GovBR</Link></Button></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jornada" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm md:grid-cols-4">
            <TabsTrigger value="jornada" className="gap-2"><DatabaseZap className="h-4 w-4" />Jornada 17 passos</TabsTrigger>
            <TabsTrigger value="personal" className="gap-2"><Smartphone className="h-4 w-4" />Personal</TabsTrigger>
            <TabsTrigger value="business" className="gap-2"><Building2 className="h-4 w-4" />Business</TabsTrigger>
            <TabsTrigger value="lacunas" className="gap-2"><CircleAlert className="h-4 w-4" />APIs faltantes</TabsTrigger>
          </TabsList>

          <TabsContent value="jornada" className="space-y-5">
            {steps.map(step => <StepSection key={step.id} step={step} evidences={evidences} runningActionId={runningActionId} onRun={runAction} />)}
          </TabsContent>

          <TabsContent value="personal" className="space-y-5">
            {personalSteps.map(step => <StepSection key={step.id} step={step} evidences={evidences} runningActionId={runningActionId} onRun={runAction} />)}
          </TabsContent>

          <TabsContent value="business" className="space-y-5">
            {businessSteps.map(step => <StepSection key={step.id} step={step} evidences={evidences} runningActionId={runningActionId} onRun={runAction} />)}
          </TabsContent>

          <TabsContent value="lacunas" className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50"><CircleAlert className="h-4 w-4" /><AlertTitle>APIs que impedem completar 100% da jornada externa</AlertTitle><AlertDescription>As lacunas abaixo são registráveis no frontend, mas não executáveis como API externa até documentação ou externalização.</AlertDescription></Alert>
            {missingApis.map(({ step, action }) => (
              <Card key={action.id} className="border-red-100 bg-white">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><CardTitle>Passo {step.id}: {step.title}</CardTitle><CardDescription>{action.title}</CardDescription></div>
                    <Badge variant="outline" className={cn("border", statusClass[action.status])}>{statusLabels[action.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
                  <p>{action.description}</p>
                  <Separator />
                  <p><strong>Impacto:</strong> {action.missingReason || "A API não possui endpoint externo disponível no roteiro analisado."}</p>
                  <Button variant="secondary" onClick={() => runAction(action.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Registrar evidência de lacuna</Button>
                  <EvidencePanel evidence={evidences[action.id]} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
