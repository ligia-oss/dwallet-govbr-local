import fs from 'node:fs';

const filePath = '/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const alertBlock = `        <Alert className={allTypedCredentialsReady ? "border-green-200 bg-green-50 text-green-950" : usingTypedCredentials ? "border-blue-200 bg-blue-50 text-blue-950" : configured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{allTypedCredentialsReady ? "Credenciais do 1Password prontas para homologação" : usingTypedCredentials ? "Complete o conjunto de credenciais do 1Password" : configured ? "Credenciais detectadas no servidor" : "Credenciais pendentes para chamadas reais"}</AlertTitle>
          <AlertDescription>{allTypedCredentialsReady ? "As quatro credenciais temporárias estão preenchidas. Ao executar uma API Dataprev, o backend usa esse conjunto, obtém o token técnico automaticamente quando necessário e mantém os segredos fora dos painéis de evidência." : usingTypedCredentials ? "Há campos preenchidos, mas o conjunto só fica seguro e executável quando API URL, API ID / x-api-key, Client ID e Secret ID / Client secret estiverem completos. A aplicação não mistura parcialmente credenciais digitadas com Secrets publicados." : configured ? "A aplicação reconhece variáveis Dataprev no runtime server-side. Para homologar exatamente com o item recebido via 1Password, preencha temporariamente os quatro campos abaixo como conjunto completo." : "Abra o item compartilhado no 1Password e cole API URL/Base URL, x-api-key, Client ID e Client Secret antes de executar chamadas reais."}</AlertDescription>
        </Alert>`;

const checklistBlock = `        <div className="rounded-3xl border border-[#1351B4]/20 bg-[linear-gradient(135deg,#F7FAFF,#EEF5FF)] p-5" aria-label="Checklist 1Password de credenciais Dataprev">
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
        </div>`;

const formBlock = `        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Credenciais temporárias Dataprev</p>
              <p className="text-sm leading-6 text-slate-600">Para usar credenciais temporárias, preencha obrigatoriamente API URL/Base URL, API ID / x-api-key, Client ID e Secret ID / Client secret como um conjunto completo recebido no 1Password. Evite salvar capturas contendo segredos.</p>
            </div>
            <Button type="button" variant="outline" onClick={onClear}><Trash2 className="mr-2 h-4 w-4" />Limpar Dataprev</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataprev-base-url">API URL <span className="font-normal text-slate-500">(Base URL no 1Password)</span></Label>
              <Input id="dataprev-base-url" type="url" value={credentials.baseUrl} onChange={event => onChange("baseUrl", event.target.value)} placeholder={baseUrl || "https://api.sandbox.drumwave.com.br"} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-api-key">API ID / x-api-key</Label>
              <Input id="dataprev-api-key" type="password" value={credentials.apiKey} onChange={event => onChange("apiKey", event.target.value)} placeholder="Cole a API ID / x-api-key" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-client-id">Client ID</Label>
              <Input id="dataprev-client-id" value={credentials.clientId} onChange={event => onChange("clientId", event.target.value)} placeholder="Cole o client_id" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-client-secret">Secret ID / Client secret <span className="font-normal text-slate-500">(Client Secret)</span></Label>
              <Input id="dataprev-client-secret" type="password" value={credentials.clientSecret} onChange={event => onChange("clientSecret", event.target.value)} placeholder="Cole o Secret ID / client_secret" autoComplete="off" />
            </div>
          </div>
          <p className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 text-sm leading-6 text-blue-950"><strong>Como testar:</strong> preencha <strong>API URL</strong>, <strong>API ID / x-api-key</strong>, <strong>Client ID</strong> e <strong>Secret ID / Client secret</strong> como conjunto completo do Postman antes de executar chamadas reais. Quando uma API exigir autenticação técnica, o servidor obtém o token automaticamente; se algum campo obrigatório estiver vazio, a aplicação informa exatamente o que falta preencher.</p>
        </div>`;

const oldOrder = `${alertBlock}\n\n${checklistBlock}\n\n${formBlock}`;
const newOrder = `${formBlock}\n\n${alertBlock}\n\n${checklistBlock}`;
if (!source.includes(oldOrder)) {
  throw new Error('Não foi possível localizar a sequência original de blocos da aba Credenciais.');
}
source = source.replace(oldOrder, newOrder);

const oldRunSnippet = `    const fieldErrors: Record<string, string> = {};
    active.fields.forEach(field => {`;
const newRunSnippet = `    const missingApiCredentials = getMissingM2MCredentialLabels(dataprevCredentials);
    if (missingApiCredentials.length > 0) {
      const message = \`Antes de executar qualquer API, preencha na aba Credenciais as quatro credenciais obrigatórias de acesso: \${missingApiCredentials.join(", ")}. A chamada não foi realizada para evitar autenticação incompleta ou uso de ambiente incorreto.\`;
      setErrors(previous => ({ ...previous, [active.id]: message }));
      return;
    }

    const fieldErrors: Record<string, string> = {};
    active.fields.forEach(field => {`;
if (!source.includes(oldRunSnippet)) {
  throw new Error('Não foi possível localizar o ponto de inserção do bloqueio global de credenciais.');
}
source = source.replace(oldRunSnippet, newRunSnippet);

fs.writeFileSync(filePath, source);
