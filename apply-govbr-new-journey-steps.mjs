import fs from 'node:fs';

const root = '/home/ubuntu/dwallet-govbr-local';
const appPath = `${root}/client/src/pages/GovBRWalletApp.tsx`;
const dataprevPath = `${root}/server/dataprev.ts`;
let app = fs.readFileSync(appPath, 'utf8');
let dataprev = fs.readFileSync(dataprevPath, 'utf8');

function replaceOnce(source, find, replace, label) {
  if (!source.includes(find)) throw new Error(`Não encontrei marcador: ${label}`);
  return source.replace(find, replace);
}

// 1) Backend: incluir ação real de rejeição usando o mesmo contrato PATCH de decisão.
if (!dataprev.includes('id: "step7_reject_data_request"')) {
  dataprev = replaceOnce(dataprev, `  {
    id: "step7_accept_data_request",
    title: "Empresa aceita solicitação de dados",
    app: "Business",
    group: "dWallet Data Request",
    method: "PATCH",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Atualiza a solicitação como aceita usando o ID funcional retornado pela criação ou listagem.",
    buildPath: state => \`/v1/dwallet/data-request/\${state.dataRequestId}\`,
    buildBody: () => ({ status: "accepted" }),
  },`, `  {
    id: "step7_accept_data_request",
    title: "Empresa aceita solicitação de dados",
    app: "Business",
    group: "dWallet Data Request",
    method: "PATCH",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Atualiza a solicitação como aceita usando o ID funcional retornado pela criação ou listagem.",
    buildPath: state => \`/v1/dwallet/data-request/\${state.dataRequestId}\`,
    buildBody: () => ({ status: "accepted" }),
  },
  {
    id: "step7_reject_data_request",
    title: "Empresa rejeita solicitação de dados",
    app: "Business",
    group: "dWallet Data Request",
    method: "PATCH",
    status: "external",
    requiresM2M: true,
    requiresUser: "employee",
    includeRegion: true,
    description: "Atualiza a solicitação como rejeitada usando o ID funcional retornado pela criação ou listagem.",
    buildPath: state => \`/v1/dwallet/data-request/\${state.dataRequestId}\`,
    buildBody: () => ({ status: "rejected" }),
  },`, 'ação de rejeição');

  dataprev = replaceOnce(dataprev, `  if (action.id === "step7_accept_data_request" && !state.dataRequestId) return "Crie ou liste uma solicitação de dados antes de aceitá-la.";`, `  if ((action.id === "step7_accept_data_request" || action.id === "step7_reject_data_request") && !state.dataRequestId) return "Crie ou liste uma solicitação de dados antes de aceitar ou rejeitar.";`, 'validação de decisão');
}

// 2) Frontend: adicionar variáveis que aparecem nas novas telas.
if (!app.includes('key: "dataRequestDecision"')) {
  app = replaceOnce(app, `  { key: "dataRequestId", label: "Data Request ID", section: "Identificadores da jornada", placeholder: "Gerado/listado pela API", description: "Usado para aceite de solicitação de dados." },`, `  { key: "dataRequestId", label: "Data Request ID", section: "Identificadores da jornada", placeholder: "Gerado/listado pela API", description: "Usado para aceite ou rejeição de solicitação de dados." },
  { key: "dataRequestDecision", label: "Decisão da solicitação", section: "Identificadores da jornada", placeholder: "accepted ou rejected", description: "Define se a Business dWallet aceitará ou rejeitará a solicitação de dados." },
  { key: "valueSchemaSid", label: "Value Schema SID", section: "Identificadores da jornada", placeholder: "Selecionado na listagem de schemas", description: "Schema escolhido a partir da resposta da API de Standard Value Schemas." },`, 'variáveis business decisão/schema');
}

// 3) Business screens: enriquecer tela de schemas e inserir decisão + certificados empresariais.
app = app.replace(`    subtitle: "Conexão e seleção de conjuntos de dados para configurar produtos e campanhas.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "Listar schemas",
    apiHint: "Consulta schemas externos disponíveis.",
    primaryCta: "Consultar schemas",
    fields: [],
    observedFrom: "Labels Connect datasets/databases e schema dos bundles",
    blocks: ["Schemas disponíveis", "Conectar database", "Mapear campos", "Status de integração"],`, `    subtitle: "Conexão e seleção de conjuntos de dados para configurar produtos e campanhas, com escolha visual entre os schemas retornados pela API.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "Listar schemas",
    apiHint: "Consulta schemas externos disponíveis e monta uma lista selecionável; quando a resposta trouxer sid/id, o primeiro schema é salvo como Value Schema SID para uso posterior.",
    primaryCta: "Consultar schemas",
    fields: [{ key: "valueSchemaSid", label: "Schema selecionado", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "Labels Connect datasets/databases e schema dos bundles",
    blocks: ["Schemas retornados pela API", "Escolha do schema", "Conectar database", "Mapear campos", "Status de integração"],`);

if (!app.includes('id: "decisao-solicitacao"')) {
  app = replaceOnce(app, `  {
    id: "schemas",
    route: "/schemas-datasets",`, `  {
    id: "decisao-solicitacao",
    route: "/requests/decision",
    title: "Aceitar ou rejeitar solicitação de dados",
    subtitle: "Etapa Business dWallet para revisar uma solicitação pendente e decidir se o compartilhamento será aceito ou rejeitado.",
    group: "wallet",
    icon: ClipboardList,
    actionId: "step7_accept_data_request",
    apiLabel: "Decidir solicitação",
    apiHint: "Usa PATCH /v1/dwallet/data-request/{dataRequestId}. Se a decisão for accepted, executa aceite; se for rejected, executa rejeição com o mesmo ID de solicitação.",
    primaryCta: "Enviar decisão",
    fields: [
      { key: "dataRequestId", label: "Solicitação", placeholder: "Data Request ID", required: true },
      { key: "dataRequestDecision", label: "Decisão", placeholder: "accepted ou rejected", required: true },
    ],
    observedFrom: "Jornada de APIs Dataprev: listagem Business de solicitações pendentes e decisão PATCH de data request",
    blocks: ["Solicitação pendente", "Dados solicitados", "Aceitar compartilhamento", "Rejeitar compartilhamento", "Registro da decisão"],
    appEmulation: { kind: "input-response", header: "Solicitação de dados", lead: "Revise quem solicitou os dados, escolha aceitar ou rejeitar e envie a decisão pela Business dWallet.", responseEmpty: "Aguardando listagem de solicitações e decisão do responsável empresarial.", footerNote: "A rejeição usa a mesma rota PATCH com status rejected; o aceite usa status accepted." },
  },
  {
    id: "schemas",
    route: "/schemas-datasets",`, 'inserção tela decisão');
}

if (!app.includes('id: "certificados-business"')) {
  app = replaceOnce(app, `  {
    id: "produtos",
    route: "/products",`, `  {
    id: "certificados-business",
    route: "/certificates",
    title: "Certificados de dados empresariais",
    subtitle: "Visualiza certificados de dados já em posse da empresa, retornados pela API de Data Savings Certificates.",
    group: "wallet",
    icon: FileCheck2,
    actionId: "step9_business_certificates",
    apiLabel: "Certificados Business",
    apiHint: "Consulta GET /v1/dsavings/certificates no contexto Business e transforma a resposta em cartões de certificados com emissor, identificador, status e dados associados quando disponíveis.",
    primaryCta: "Visualizar certificados",
    fields: [],
    observedFrom: "Jornada de APIs Dataprev: passo Empresa consulta certificados",
    blocks: ["Certificados retornados", "Dados em posse da empresa", "Emissor", "Status e validade"],
    appEmulation: { kind: "response", header: "Certificados da empresa", lead: "Acompanhe certificados de dados vinculados à Business dWallet.", responseEmpty: "Toque em Visualizar certificados para consultar os certificados empresariais disponíveis.", footerNote: "Quando a sandbox retorna erro parcial, o painel técnico preserva a evidência sem expor tokens no celular." },
  },
  {
    id: "produtos",
    route: "/products",`, 'inserção certificados business');
}

// 4) Personal screens: inserir visualização de certificados da pessoa.
if (!app.includes('id: "certificados-personal"')) {
  app = replaceOnce(app, `  {
    id: "planos",
    route: "/data-savings-plan",`, `  {
    id: "certificados-personal",
    route: "/certificates",
    title: "Certificados de dados pessoais",
    subtitle: "Visualiza certificados de dados já em posse da pessoa, retornados pela API de Data Savings Certificates.",
    group: "wallet",
    icon: FileCheck2,
    actionId: "step8_person_certificates",
    apiLabel: "Certificados Personal",
    apiHint: "Consulta GET /v1/dsavings/certificates no contexto Personal e monta cartões com emissor, identificador, status, validade e dados certificados quando a API retornar essas informações.",
    primaryCta: "Visualizar certificados",
    fields: [],
    observedFrom: "Jornada de APIs Dataprev: passo Pessoa consulta certificados",
    blocks: ["Certificados retornados", "Dados em posse da pessoa", "Emissor", "Status e validade"],
    appEmulation: { kind: "response", header: "Meus certificados", lead: "Veja os certificados de dados vinculados à Personal dWallet.", responseEmpty: "Toque em Visualizar certificados para consultar certificados pessoais disponíveis.", footerNote: "A tela mostra apenas dados funcionais sanitizados; a evidência técnica completa fica no painel lateral." },
  },
  {
    id: "planos",
    route: "/data-savings-plan",`, 'inserção certificados personal');
}

// 5) Helpers visuais para responseBody: extrair listas, renderizar schemas/certificados/decisão.
if (!app.includes('function normalizeResponseItems(')) {
  app = replaceOnce(app, `function MockupExample({ screen, values }: { screen: GovScreen; values: RunState }) {`, `function normalizeResponseItems(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const candidates = [record.items, record.data, record.results, record.valueSchemas, record.schemas, record.certificates, record.content];
  for (const candidate of candidates) {
    const normalized = normalizeResponseItems(candidate);
    if (normalized.length) return normalized;
  }
  return [record];
}

function pickText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return fallback;
}

function SchemaSelectionPreview({ evidence, selectedSchema, onChange }: { evidence?: Evidence; selectedSchema?: string; onChange: (key: string, value: string) => void }) {
  const schemas = normalizeResponseItems(evidence?.responseBody);
  const visibleSchemas = schemas.length ? schemas.slice(0, 4) : [
    { sid: selectedSchema || "schema-sandbox", name: "Schema aguardando resposta", description: "Execute a API para substituir este exemplo pelos schemas retornados." },
  ];
  const selected = selectedSchema || pickText(visibleSchemas[0], ["sid", "id", "schemaId"], "");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">Escolha de value schema</p>
      <p className="text-xs leading-5 text-slate-500">Selecione um dos schemas retornados pela API. O SID/ID escolhido fica disponível como variável de teste.</p>
      <div className="space-y-2">
        {visibleSchemas.map((schema, index) => {
          const sid = pickText(schema, ["sid", "id", "schemaId", "valueSchemaSid"], "schema-" + (index + 1));
          const name = pickText(schema, ["name", "title", "label", "displayName"], "Schema " + (index + 1));
          const description = pickText(schema, ["description", "summary", "type"], "Schema retornado pela sandbox Dataprev.");
          const checked = selected === sid;
          return (
            <button key={sid + "-" + index} type="button" onClick={() => onChange("valueSchemaSid", sid)} className={"w-full rounded-2xl border p-3 text-left transition " + (checked ? "border-[#1351B4] bg-[#E7F0FF]" : "border-slate-200 bg-slate-50 hover:bg-white")}>
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{name}</strong><span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-[#1351B4]">{sid}</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DataRequestDecisionPreview({ values, evidence, onChange }: { values: RunState; evidence?: Evidence; onChange: (key: string, value: string) => void }) {
  const decision = String(values.dataRequestDecision || "accepted");
  const requestId = String(values.dataRequestId || "aguardando solicitação");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-amber-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Decisão da solicitação</p>
      <div className="rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">Solicitação: <strong className="font-mono">{requestId}</strong>. Escolha aceitar para liberar o compartilhamento ou rejeitar para registrar negativa.</div>
      <div className="grid grid-cols-2 gap-2">
        {[{ value: "accepted", label: "Aceitar" }, { value: "rejected", label: "Rejeitar" }].map(option => (
          <button key={option.value} type="button" onClick={() => onChange("dataRequestDecision", option.value)} className={"rounded-2xl px-3 py-3 text-sm font-bold " + (decision === option.value ? "bg-[#1351B4] text-white" : "bg-slate-100 text-slate-700")}>{option.label}</button>
        ))}
      </div>
      {evidence?.ok ? <p className="rounded-2xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">Decisão enviada com sucesso pela API.</p> : null}
    </div>
  );
}

function CertificatesPreview({ evidence, walletKind }: { evidence?: Evidence; walletKind: WalletKind }) {
  const certificates = normalizeResponseItems(evidence?.responseBody);
  const visibleCertificates = certificates.length ? certificates.slice(0, 4) : [
    { id: walletKind === "business" ? "cert-business-demo" : "cert-personal-demo", issuer: "Data Savings", status: "aguardando API", subject: walletKind === "business" ? "Empresa" : "Pessoa", dataType: "dados certificados" },
  ];
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#168821]">Certificados retornados</p>
      <p className="text-xs leading-5 text-slate-500">A tela monta cartões com as informações de certificados de dados já em posse da {walletKind === "business" ? "empresa" : "pessoa"}.</p>
      <div className="space-y-2">
        {visibleCertificates.map((certificate, index) => {
          const id = pickText(certificate, ["id", "certificateId", "sid", "uuid"], "certificado-" + (index + 1));
          const issuer = pickText(certificate, ["issuer", "provider", "source", "issuedBy"], "Emissor não informado");
          const statusText = pickText(certificate, ["status", "state"], evidence ? "retornado" : "aguardando API");
          const subject = pickText(certificate, ["subject", "holder", "owner", "dataOwner"], walletKind === "business" ? "Empresa" : "Pessoa");
          const dataType = pickText(certificate, ["dataType", "type", "schema", "schemaName", "name"], "Dados certificados");
          return (
            <div key={id + "-" + index} className="rounded-2xl border border-green-100 bg-green-50 p-3">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{dataType}</strong><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-green-700">{statusText}</span></div>
              <p className="mt-1 text-xs text-slate-600">Titular: {subject} · Emissor: {issuer}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{id}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MockupExample({ screen, values }: { screen: GovScreen; values: RunState }) {`, 'helpers visuais');
}

// 6) AppEmulatedScreen: renderizar os previews específicos e passar evidence/onChange ao mockup.
app = app.replace('          <MockupExample screen={phoneScreen} values={values} />', `          {screen.id === "schemas" ? <SchemaSelectionPreview evidence={evidence} selectedSchema={String(values.valueSchemaSid || "")} onChange={onChange} /> : null}
          {screen.id === "decisao-solicitacao" ? <DataRequestDecisionPreview values={values} evidence={evidence} onChange={onChange} /> : null}
          {(screen.id === "certificados-personal" || screen.id === "certificados-business") ? <CertificatesPreview evidence={evidence} walletKind={screen.id === "certificados-business" ? "business" : "personal"} /> : null}
          <MockupExample screen={phoneScreen} values={values} />`);

// 7) Execução dinâmica: decisão rejected chama nova action, mas conserva evidência na tela atual.
app = app.replace(`      const evidence = active.actionId.startsWith("btg_")
        ? await executeBtgAction.mutateAsync(buildExecuteActionInput(active.actionId, mergedState))
        : await executeAction.mutateAsync(buildExecuteActionInput(active.actionId, mergedState, dataprevCredentials));
      const typed = evidence as Evidence;
      setEvidences(previous => ({ ...previous, [active.actionId as string]: typed }));`, `      const actionIdToRun = active.id === "decisao-solicitacao" && String(mergedState.dataRequestDecision || "accepted") === "rejected" ? "step7_reject_data_request" : active.actionId;
      const evidence = actionIdToRun.startsWith("btg_")
        ? await executeBtgAction.mutateAsync(buildExecuteActionInput(actionIdToRun, mergedState))
        : await executeAction.mutateAsync(buildExecuteActionInput(actionIdToRun, mergedState, dataprevCredentials));
      const typed = evidence as Evidence;
      setEvidences(previous => ({ ...previous, [active.actionId as string]: typed }));`);

// 8) Garantir default de decisão no estado inicial se existir bloco de defaults.
if (!app.includes('dataRequestDecision: "accepted"')) {
  app = app.replace('dataRequestId: "",', 'dataRequestId: "",\n  dataRequestDecision: "accepted",');
}

fs.writeFileSync(appPath, app);
fs.writeFileSync(dataprevPath, dataprev);
console.log('Novas etapas GovBR aplicadas em GovBRWalletApp.tsx e server/dataprev.ts');
