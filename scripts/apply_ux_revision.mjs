import fs from 'node:fs';

const path = '/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx';
let text = fs.readFileSync(path, 'utf8');

const insertAfter = `export function buildDataprevCredentialsInput(credentials: DataprevCredentialForm) {
  const trimmed = {
    baseUrl: credentials.baseUrl.trim(),
    apiKey: credentials.apiKey.trim(),
    clientId: credentials.clientId.trim(),
    clientSecret: credentials.clientSecret.trim(),
  };
  return Object.values(trimmed).some(Boolean) ? trimmed : undefined;
}
`;
const helper = `export function buildDataprevCredentialsInput(credentials: DataprevCredentialForm) {
  const trimmed = {
    baseUrl: credentials.baseUrl.trim(),
    apiKey: credentials.apiKey.trim(),
    clientId: credentials.clientId.trim(),
    clientSecret: credentials.clientSecret.trim(),
  };
  return Object.values(trimmed).some(Boolean) ? trimmed : undefined;
}

export function getDataprevCredentialChecklist(credentials: DataprevCredentialForm) {
  return [
    {
      key: "baseUrl" as const,
      label: "API URL",
      onePasswordName: "Base URL ou API URL",
      hint: "Cole o endereço base do ambiente de homologação informado no item do 1Password.",
      filled: Boolean(credentials.baseUrl.trim()),
    },
    {
      key: "apiKey" as const,
      label: "API ID / x-api-key",
      onePasswordName: "x-api-key",
      hint: "Cole a chave de API exatamente como recebida, sem espaços extras.",
      filled: Boolean(credentials.apiKey.trim()),
    },
    {
      key: "clientId" as const,
      label: "Client ID",
      onePasswordName: "Client ID",
      hint: "Identifica o cliente técnico usado na autenticação M2M automática.",
      filled: Boolean(credentials.clientId.trim()),
    },
    {
      key: "clientSecret" as const,
      label: "Secret ID / Client secret",
      onePasswordName: "Client Secret",
      hint: "Segredo usado apenas no backend para obter o token técnico; nunca aparece nas evidências.",
      filled: Boolean(credentials.clientSecret.trim()),
    },
  ];
}
`;
if (!text.includes('getDataprevCredentialChecklist')) {
  text = text.replace(insertAfter, helper);
}

text = text.replace(
`export function CredentialsPanel({ baseUrl, configured, btgBaseUrl, btgConfigured, credentials, onChange, onClear }: { baseUrl?: string; configured?: boolean; btgBaseUrl?: string; btgConfigured?: boolean; credentials: DataprevCredentialForm; onChange: (key: keyof DataprevCredentialForm, value: string) => void; onClear: () => void }) {
  const usingTypedCredentials = Boolean(buildDataprevCredentialsInput(credentials));`,
`export function CredentialsPanel({ baseUrl, configured, btgBaseUrl, btgConfigured, credentials, onChange, onClear }: { baseUrl?: string; configured?: boolean; btgBaseUrl?: string; btgConfigured?: boolean; credentials: DataprevCredentialForm; onChange: (key: keyof DataprevCredentialForm, value: string) => void; onClear: () => void }) {
  const usingTypedCredentials = Boolean(buildDataprevCredentialsInput(credentials));
  const credentialChecklist = getDataprevCredentialChecklist(credentials);
  const filledCredentials = credentialChecklist.filter(item => item.filled).length;
  const allTypedCredentialsReady = filledCredentials === credentialChecklist.length;`
);

text = text.replace(
`        <Alert className={usingTypedCredentials ? "border-blue-200 bg-blue-50 text-blue-950" : configured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{usingTypedCredentials ? "Credenciais temporárias serão usadas nas APIs Dataprev" : configured ? "Credenciais detectadas no servidor" : "Credenciais pendentes no servidor"}</AlertTitle>
          <AlertDescription>{usingTypedCredentials ? "Ao executar chamadas reais, a aplicação priorizará os valores digitados abaixo. Preencha API URL, API ID / x-api-key, Client ID e Secret ID / Client secret como um conjunto completo do Postman. A aplicação não mistura parcialmente credenciais secretas digitadas com Secrets publicados." : configured ? "A aplicação reconhece variáveis Dataprev no runtime server-side. Para homologar pela interface com dados do Postman, preencha temporariamente API URL, API ID / x-api-key, Client ID e Secret ID / Client secret como conjunto completo." : "Configure as variáveis DATAPREV_* no painel seguro de Secrets ou preencha API URL, API ID / x-api-key, Client ID e Secret ID / Client secret abaixo antes de executar chamadas reais."}</AlertDescription>
        </Alert>

        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">`,
`        <Alert className={allTypedCredentialsReady ? "border-green-200 bg-green-50 text-green-950" : usingTypedCredentials ? "border-blue-200 bg-blue-50 text-blue-950" : configured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{allTypedCredentialsReady ? "Credenciais do 1Password prontas para homologação" : usingTypedCredentials ? "Complete o conjunto de credenciais do 1Password" : configured ? "Credenciais detectadas no servidor" : "Credenciais pendentes para chamadas reais"}</AlertTitle>
          <AlertDescription>{allTypedCredentialsReady ? "As quatro credenciais temporárias estão preenchidas. Ao executar uma API Dataprev, o backend usa esse conjunto, obtém o token técnico automaticamente quando necessário e mantém os segredos fora dos painéis de evidência." : usingTypedCredentials ? "Há campos preenchidos, mas o conjunto só fica seguro e executável quando API URL, API ID / x-api-key, Client ID e Secret ID / Client secret estiverem completos. A aplicação não mistura parcialmente credenciais digitadas com Secrets publicados." : configured ? "A aplicação reconhece variáveis Dataprev no runtime server-side. Para homologar exatamente com o item recebido via 1Password, preencha temporariamente os quatro campos abaixo como conjunto completo." : "Abra o item compartilhado no 1Password e cole API URL/Base URL, x-api-key, Client ID e Client Secret antes de executar chamadas reais."}</AlertDescription>
        </Alert>

        <div className="rounded-3xl border border-[#1351B4]/20 bg-[linear-gradient(135deg,#F7FAFF,#EEF5FF)] p-5" aria-label="Checklist 1Password de credenciais Dataprev">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Checklist do item recebido via 1Password</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Cole os quatro valores do mesmo item compartilhado. O progresso abaixo evita tentar uma API com credencial parcial ou de ambientes diferentes.</p>
            </div>
            <Badge className={allTypedCredentialsReady ? "bg-[#168821] text-white" : "bg-[#FFCD07] text-[#071D41]"}>{filledCredentials} de {credentialChecklist.length} preenchidas</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {credentialChecklist.map(item => (
              <div key={item.key} className={
                "rounded-2xl border p-4 text-sm shadow-sm " + (item.filled ? "border-green-200 bg-white text-green-950" : "border-amber-200 bg-white text-amber-950")
              }>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">No 1Password: {item.onePasswordName}</p>
                  </div>
                  {item.filled ? <Badge className="bg-[#168821] text-white">preenchido</Badge> : <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">pendente</Badge>}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">`
);

text = text.replace(
`              <p className="text-sm leading-6 text-slate-600">Para usar credenciais temporárias, preencha obrigatoriamente API URL, API ID / x-api-key, Client ID e Secret ID / Client secret como um conjunto completo. Evite salvar capturas contendo segredos.</p>`,
`              <p className="text-sm leading-6 text-slate-600">Para usar credenciais temporárias, preencha obrigatoriamente API URL/Base URL, API ID / x-api-key, Client ID e Secret ID / Client secret como um conjunto completo recebido no 1Password. Evite salvar capturas contendo segredos.</p>`
);
text = text.replace(
`              <Label htmlFor="dataprev-base-url">API URL</Label>`,
`              <Label htmlFor="dataprev-base-url">API URL <span className="font-normal text-slate-500">(Base URL no 1Password)</span></Label>`
);
text = text.replace(
`              <Label htmlFor="dataprev-client-secret">Secret ID / Client secret</Label>`,
`              <Label htmlFor="dataprev-client-secret">Secret ID / Client secret <span className="font-normal text-slate-500">(Client Secret)</span></Label>`
);

text = text.replace(
`    ["1", "Criar e validar Personal dWallet", "Execute criação, envio de código e validação na ordem da navegação lateral. Quando a API exigir autenticação técnica, o servidor obtém o token automaticamente antes da requisição. IDs da PdW, usuário ou sessão retornados pela API são salvos automaticamente em Credenciais."],`,
`    ["1", "Preparar credenciais do 1Password", "Antes de usar o telefone, abra a aba Credenciais e confirme API URL/Base URL, API ID / x-api-key, Client ID e Client Secret. Esse conjunto alimenta a autenticação técnica automática e evita chamadas com ambiente misturado."],
    ["2", "Criar e validar Personal dWallet", "Execute criação, envio de código e validação na ordem da navegação lateral. Quando a API exigir autenticação técnica, o servidor obtém o token automaticamente antes da requisição. IDs da PdW, usuário ou sessão retornados pela API são salvos automaticamente em Credenciais."],`
);
text = text.replace(
`    ["2", "Abrir a BdW antes de solicitar dados",`,
`    ["3", "Abrir a BdW antes de solicitar dados",`
);
text = text.replace(
`    ["3", "Solicitar informações na PdW",`,
`    ["4", "Solicitar informações na PdW",`
);
text = text.replace(
`    ["4", "Executar telas finais e financeiras",`,
`    ["5", "Executar telas finais e financeiras",`
);
text = text.replace(
`    ["1", "Criar Business dWallet", "Cadastre empresa, colaborador e validações no mockup. Quando a API exigir autenticação técnica, o servidor obtém o token automaticamente antes da requisição. Guarde automaticamente o ID da BdW, companyId ou walletId retornado pela API."],`,
`    ["1", "Preparar credenciais do 1Password", "Antes de usar o telefone, abra a aba Credenciais e confirme API URL/Base URL, API ID / x-api-key, Client ID e Client Secret. Esse conjunto alimenta a autenticação técnica automática e evita chamadas com ambiente misturado."],
    ["2", "Criar Business dWallet", "Cadastre empresa, colaborador e validações no mockup. Quando a API exigir autenticação técnica, o servidor obtém o token automaticamente antes da requisição. Guarde automaticamente o ID da BdW, companyId ou walletId retornado pela API."],`
);
text = text.replace(
`    ["2", "Abrir e validar a BdW",`,
`    ["3", "Abrir e validar a BdW",`
);
text = text.replace(
`    ["3", "Produtos, schemas e solicitações",`,
`    ["4", "Produtos, schemas e solicitações",`
);
text = text.replace(
`    ["4", "Operações financeiras",`,
`    ["5", "Operações financeiras",`
);

text = text.replace(
`          <AlertTitle>Antes de começar</AlertTitle>
          <AlertDescription>Use a navegação lateral de cima para baixo. Não pule etapas que ainda não foram executadas, porque algumas telas dependem de IDs ou confirmações gerados pela etapa anterior. Se aparecer erro, corrija o campo destacado no telefone e tente novamente.</AlertDescription>`,
`          <AlertTitle>Antes de começar</AlertTitle>
          <AlertDescription>Primeiro confirme na aba Credenciais se os quatro valores recebidos via 1Password foram colados como conjunto completo. Depois use a navegação lateral de cima para baixo. As próximas etapas ficam sinalizadas como dependentes quando ainda faltam IDs, confirmações ou respostas OK anteriores. Se aparecer erro, corrija o campo destacado no telefone e tente novamente.</AlertDescription>`
);

text = text.replace(
`              const checked = item.status === "done" || Boolean(reviewedSteps[item.id]);
              const running = item.status === "running";
              return (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[auto_1fr_auto] md:items-center">`,
`              const checked = item.status === "done" || Boolean(reviewedSteps[item.id]);
              const running = item.status === "running";
              const previousPending = checklistItems.slice(0, index).some(previous => previous.status !== "done" && !reviewedSteps[previous.id]);
              return (
                <div key={item.id} className={
                  "grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_1fr_auto] md:items-center " + (previousPending ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")
                }>`
);
text = text.replace(
`                      {reviewedSteps[item.id] && item.status !== "done" ? <Badge variant="outline" className="border-[#FFCD07] bg-[#FFF7CC] text-[#071D41]">revisada manualmente</Badge> : null}`, 
`                      {reviewedSteps[item.id] && item.status !== "done" ? <Badge variant="outline" className="border-[#FFCD07] bg-[#FFF7CC] text-[#071D41]">revisada manualmente</Badge> : null}
                      {previousPending ? <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">aguardando pré-requisito</Badge> : null}`
);
text = text.replace(
`                  <Button type="button" variant="outline" onClick={() => onOpenStep?.(item.id)} className="justify-center">Abrir etapa</Button>`,
`                  <Button type="button" variant="outline" disabled={previousPending} onClick={() => onOpenStep?.(item.id)} className="justify-center bg-white">{previousPending ? "Concluir anteriores" : "Abrir etapa"}</Button>`
);

text = text.replace(
`                  {grouped[group].map(screen => {
                    const Icon = screen.icon;
                    const selected = screen.id === active.id;
                    const evidence = screen.actionId ? evidences[screen.actionId] : undefined;
                    const visualStatus = getVisualStatus(screen, evidence, runningId);
                    return (
                      <button key={screen.id} onClick={() => setActiveId(screen.id)} className={\`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition \${selected ? "bg-[#1351B4] text-white" : "text-slate-700 hover:bg-slate-100"}\`}>`,
`                  {grouped[group].map(screen => {
                    const Icon = screen.icon;
                    const selected = screen.id === active.id;
                    const evidence = screen.actionId ? evidences[screen.actionId] : undefined;
                    const visualStatus = getVisualStatus(screen, evidence, runningId);
                    const screenOrderIndex = screens.findIndex(item => item.id === screen.id);
                    const blockedByPrevious = screenOrderIndex > 0 && screens.slice(0, screenOrderIndex).some(previous => previous.actionId && !evidences[previous.actionId]?.ok && !reviewedGuideSteps[previous.id]);
                    return (
                      <button key={screen.id} disabled={blockedByPrevious} title={blockedByPrevious ? "Conclua ou revise manualmente as etapas anteriores no Guia de teste" : undefined} onClick={() => setActiveId(screen.id)} className={\`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-55 \${selected ? "bg-[#1351B4] text-white" : blockedByPrevious ? "bg-amber-50 text-amber-900" : "text-slate-700 hover:bg-slate-100"}\`}>`
);
text = text.replace(
`{statusLabel[visualStatus]}{evidence?.ok ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : screen.actionId ? <Play className="h-3 w-3 opacity-70" /> : <LockKeyhole className="h-3 w-3 opacity-60" />}`, 
`{blockedByPrevious ? "pré-req." : statusLabel[visualStatus]}{evidence?.ok ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : blockedByPrevious ? <LockKeyhole className="h-3 w-3 opacity-70" /> : screen.actionId ? <Play className="h-3 w-3 opacity-70" /> : <LockKeyhole className="h-3 w-3 opacity-60" />}`
);

fs.writeFileSync(path, text);
