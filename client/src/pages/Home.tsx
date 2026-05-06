import React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, Building2, FolderKey, Landmark, Route, ShieldCheck, Smartphone, UserRound } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F8F8] text-slate-950">
      <header className="border-b border-[#DFE1E2] bg-white">
        <div className="container flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1351B4] text-white shadow-sm"><Landmark className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1351B4]">mockup operacional para teste de API</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">dWallet GovBR</h1>
              <p className="text-sm text-slate-600">Escolha uma das experiências com identidade visual gov.br</p>
            </div>
          </div>
          <Badge className="w-fit bg-green-700 text-white"><ShieldCheck className="mr-1 h-3 w-3" />Experiência visual com execução de APIs</Badge>
        </div>
      </header>

      <section className="bg-[linear-gradient(135deg,#071D41_0%,#0C326F_52%,#1351B4_100%)] text-white">
        <div className="container grid gap-8 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="bg-[#FFCD07] text-[#071D41]">Jornada integrada Personal + Business</Badge>
            <h2 className="max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">DrumWave dWallets®</h2>
            <p className="max-w-3xl text-base leading-7 text-blue-50">A página principal mantém apenas os atalhos para as experiências no app com identidade visual gov.br, guia de execução, dependências entre etapas e pasta de variáveis para guardar identificadores gerados pelas APIs.</p>
          </div>
          <Card className="border-white/20 bg-white/10 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-[#FFCD07]" />Ordem recomendada</CardTitle>
              <CardDescription className="text-blue-50">Algumas respostas de API alimentam chamadas seguintes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-blue-50">
              <p><strong>1.</strong> Preencha na aba Variáveis a Base URL/API URL, x-api-key/API ID, Client ID e Client Secret antes de executar qualquer API.</p>
              <p><strong>2.</strong> Clique em <strong>Gerar M2M token</strong> no bloco Variáveis e chaves; o token fica salvo até expirar para uso como header nas APIs que exigirem autenticação técnica.</p>
              <p><strong>3.</strong> Abra a Business dWallet® primeiro; você precisará do ID da wallet da empresa quando for solicitar os dados pela Personal dWallet®.</p>
              <p><strong>4.</strong> Use o ID da BdWallet® gerado para informar no processo de solicitação de dados da PdWallet®.</p>
              <p><strong>5.</strong> Execute as APIs na ordem da jornada; chamadas protegidas usam o M2M token salvo enquanto ele estiver ativo.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="container space-y-8 py-8">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <FolderKey className="h-4 w-4" />
          <AlertTitle>Pasta de variáveis compartilhada por jornada</AlertTitle>
          <AlertDescription>Sempre que uma API retornar identificadores, tokens opacos, IDs de dWallet®, IDs de solicitação ou outros valores reutilizáveis, a experiência GovBR guarda esses dados na aba Variáveis para que possam ser usados como input em etapas posteriores.</AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 rounded-3xl border border-[#1351B4]/20 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Primeiro passo de homologação</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Antes de navegar pelas wallets, adicione Base URL/API URL, x-api-key/API ID, Client ID e Client Secret na área de variáveis.</p>
          </div>
          <Button asChild className="w-full bg-[#1351B4] hover:bg-[#0C326F] sm:w-auto">
            <Link href="/business-govbr?tab=variaveis"><FolderKey className="mr-2 h-4 w-4" />Adicionar variáveis</Link>
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden border-[#168821]/30 bg-white shadow-sm">
            <CardHeader className="govbr-hero-business text-white" style={{ height: "54px" }}>
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-[#FFCD07]" />
                <div style={{ marginTop: "11px" }}>
                  <CardTitle>Business dWallet GovBR</CardTitle>
                  <CardDescription className="text-blue-50">Experiência empresarial com mockup de celular, onboarding e carteira de negócios.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm leading-6 text-slate-700">Abra esta experiência antes da Personal quando for necessário criar a BdW e salvar o ID retornado. Esse ID fica disponível na aba Variáveis para ser reutilizado em solicitações da PdW e em chamadas relacionadas.</p>
              <Button asChild className="bg-[#168821] hover:bg-[#0f6418]"><Link href="/business-govbr">Abrir Business GovBR <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[#1351B4]/30 bg-white shadow-sm">
            <CardHeader className="govbr-hero-personal text-white" style={{ height: "54px" }}>
              <div className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-[#FFCD07]" />
                <div style={{ paddingTop: "10px" }}>
                  <CardTitle>Personal dWallet GovBR</CardTitle>
                  <CardDescription className="text-blue-50">Experiência da pessoa física com mockup de celular, telas montadas e evidências sanitizadas.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm leading-6 text-slate-700">Use esta experiência depois de abrir a BdW quando a etapa exigir dados empresariais, para obter o ID da Business dWallet. Antes das chamadas protegidas, gere o M2M token na aba Variáveis; ele será usado como header enquanto estiver ativo. O mockup mostra exemplos de avatar, carteira, solicitações e telas finais montadas.</p>
              <Button asChild className="bg-[#1351B4] hover:bg-[#0C326F]"><Link href="/personal-govbr">Abrir Personal GovBR <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          <div className="space-y-2">
            <UserRound className="h-6 w-6 text-[#1351B4]" />
            <h3 className="font-bold text-slate-950">Personal depende de dados gerados</h3>
            <p className="text-sm leading-6 text-slate-600">Para solicitar informações na PdW, confirme antes quais IDs foram gerados e salvos pela BdW.</p>
          </div>
          <div className="space-y-2">
            <Building2 className="h-6 w-6 text-[#168821]" />
            <h3 className="font-bold text-slate-950">Business abre a base empresarial</h3>
            <p className="text-sm leading-6 text-slate-600">A criação e validação da BdW fornece identificadores que outras APIs podem exigir como entrada.</p>
          </div>
          <div className="space-y-2">
            <FolderKey className="h-6 w-6 text-[#071D41]" />
            <h3 className="font-bold text-slate-950">Variáveis guardam respostas úteis</h3>
            <p className="text-sm leading-6 text-slate-600">A aba reúne variáveis e valores retornados por API, com data, origem e finalidade provável de reutilização.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
