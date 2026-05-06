import fs from 'node:fs';

const files = {
  app: '/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx',
  dataprev: '/home/ubuntu/dwallet-govbr-local/server/dataprev.ts',
  uiTest: '/home/ubuntu/dwallet-govbr-local/server/govbr.wallet.ui.test.ts',
  routerTest: '/home/ubuntu/dwallet-govbr-local/server/dataprev.router.test.ts',
};

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, find, replace, label) {
  if (!content.includes(find)) {
    throw new Error(`Bloco não encontrado: ${label}`);
  }
  return content.replace(find, replace);
}

let app = read(files.app);

app = replaceOnce(app,
`  { key: "valueSchemaSid", label: "Value Schema SID", section: "Identificadores da jornada", placeholder: "Selecionado na listagem de schemas", description: "Schema escolhido a partir da resposta da API de Standard Value Schemas." },
  { key: "dspAccountId", label: "Conta DSP", section: "Identificadores da jornada", placeholder: "Conta DSP conhecida", description: "Apoia telas financeiras e extrato parcial." },`,
`  { key: "valueSchemaSid", label: "Value Schema SID", section: "Identificadores da jornada", placeholder: "Selecionado na listagem de schemas", description: "Schema escolhido a partir da resposta da API de Standard Value Schemas." },
  { key: "dsku", label: "Produto/dSKU", section: "Identificadores da jornada", placeholder: "Selecionado na listagem de produtos", description: "Produto ou dSKU retornado pela API de catálogo de produtos." },
  { key: "standardDspId", label: "DSP standard", section: "Identificadores da jornada", placeholder: "Gerado na listagem de DSP", description: "Plano DSP standard retornado pela API de Data Savings Plan." },
  { key: "commercialDspId", label: "CSP comercial", section: "Identificadores da jornada", placeholder: "Gerado na listagem de CSP", description: "Plano comercial retornado pela API de Commercial Savings Plan." },
  { key: "selectedDspId", label: "DSP escolhido", section: "Identificadores da jornada", placeholder: "Selecionado no detalhe do DSP", description: "Identificador usado para consultar detalhe e escolher o DSP." },
  { key: "dspAccountId", label: "Conta DSP", section: "Identificadores da jornada", placeholder: "Conta DSP conhecida", description: "Apoia telas financeiras e extrato parcial." },`,
'identificadores DSP/CSP nas variáveis Business');

app = replaceOnce(app,
`  const candidates = [record.items, record.data, record.results, record.valueSchemas, record.schemas, record.certificates, record.content];`,
`  const candidates = [record.items, record.data, record.results, record.valueSchemas, record.schemas, record.products, record.dskus, record.plans, record.dataSavingsPlans, record.certificates, record.content];`,
'normalização de listas de resposta');

const previewInsertion = `
function ProductCatalogPreview({ evidence, selectedProduct, onChange }: { evidence?: Evidence; selectedProduct?: string; onChange: (key: string, value: string) => void }) {
  const products = normalizeResponseItems(evidence?.responseBody);
  const visibleProducts = products.length ? products.slice(0, 4) : [
    { dsku: selectedProduct || "dsku-sandbox", name: "Produto aguardando resposta", description: "Execute a API para substituir este exemplo pelos produtos retornados." },
  ];
  const selected = selectedProduct || pickText(visibleProducts[0], ["dsku", "id", "productId", "sku"], "");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-violet-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Produtos disponíveis</p>
      <p className="text-xs leading-5 text-slate-500">A resposta da API de produtos é exibida como catálogo de dSKUs; o item escolhido fica disponível em Variáveis.</p>
      <div className="space-y-2">
        {visibleProducts.map((product, index) => {
          const dsku = pickText(product, ["dsku", "id", "productId", "sku"], "produto-" + (index + 1));
          const name = pickText(product, ["name", "title", "label", "displayName"], "Produto " + (index + 1));
          const description = pickText(product, ["description", "summary", "category", "type"], "Produto retornado pela sandbox Dataprev.");
          const checked = selected === dsku;
          return (
            <button key={dsku + "-" + index} type="button" onClick={() => onChange("dsku", dsku)} className={"w-full rounded-2xl border p-3 text-left transition " + (checked ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50 hover:bg-white")}>
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{name}</strong><span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-violet-700">{dsku}</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SavingsPlanPreview({ kind, evidence, selectedPlan, onChange }: { kind: "dsp" | "csp" | "detail" | "choice"; evidence?: Evidence; selectedPlan?: string; onChange: (key: string, value: string) => void }) {
  const plans = normalizeResponseItems(evidence?.responseBody);
  const label = kind === "csp" ? "Commercial Savings Plans" : kind === "detail" ? "Detalhe do DSP" : kind === "choice" ? "Escolha do DSP" : "Data Savings Plans";
  const variableKey = kind === "csp" ? "commercialDspId" : kind === "choice" ? "selectedDspId" : "standardDspId";
  const visiblePlans = plans.length ? plans.slice(0, 4) : [
    { id: selectedPlan || (kind === "csp" ? "csp-sandbox" : "dsp-sandbox"), name: kind === "csp" ? "CSP aguardando resposta" : "DSP aguardando resposta", description: "Execute a API para renderizar os planos retornados." },
  ];
  const selected = selectedPlan || pickText(visiblePlans[0], ["id", "sid", "planId", "cdspId", "dspId"], "");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{label}</p>
      <p className="text-xs leading-5 text-slate-500">{kind === "detail" ? "Mostra nome, descrição, meta, moeda e identificador do DSP selecionado quando o endpoint de detalhe retorna dados." : kind === "choice" ? "Confirme qual DSP será usado na criação/adesão de conta DSP." : "Liste planos retornados pela API e selecione um identificador para as etapas seguintes."}</p>
      <div className="space-y-2">
        {visiblePlans.map((plan, index) => {
          const id = pickText(plan, ["id", "sid", "planId", "cdspId", "dspId"], (kind === "csp" ? "csp-" : "dsp-") + (index + 1));
          const name = pickText(plan, ["name", "title", "label", "displayName"], (kind === "csp" ? "CSP " : "DSP ") + (index + 1));
          const description = pickText(plan, ["description", "summary", "category", "type"], "Plano retornado pela sandbox Dataprev.");
          const currency = pickText(plan, ["currency", "settlementCurrency"], "BRL");
          const goal = pickText(plan, ["savingsGoal", "goal", "target", "amount"], "meta sob consulta");
          const checked = selected === id;
          return (
            <button key={id + "-" + index} type="button" onClick={() => onChange(variableKey, id)} className={"w-full rounded-2xl border p-3 text-left transition " + (checked ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-white")}>
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{name}</strong><span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-emerald-700">{id}</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">Moeda: {currency} · Meta: {goal}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
`;

app = replaceOnce(app,
`function DataRequestDecisionPreview({ values, evidence, onChange }: { values: RunState; evidence?: Evidence; onChange: (key: string, value: string) => void }) {`,
`${previewInsertion}
function DataRequestDecisionPreview({ values, evidence, onChange }: { values: RunState; evidence?: Evidence; onChange: (key: string, value: string) => void }) {`,
'previews de produtos, DSP, CSP, detalhe e escolha');

const oldBusinessBlock = `  {
    id: "schemas",
    route: "/schemas-datasets",
    title: "Listar Value Schemas padrão",
    subtitle: "Conexão e seleção de conjuntos de dados para configurar produtos e campanhas, com escolha visual entre os schemas retornados pela API.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "Listar schemas",
    apiHint: "Consulta schemas externos disponíveis e monta uma lista selecionável; quando a resposta trouxer sid/id, o primeiro schema é salvo como Value Schema SID para uso posterior.",
    primaryCta: "Consultar schemas",
    fields: [{ key: "valueSchemaSid", label: "Schema selecionado", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "Labels Connect datasets/databases e schema dos bundles",
    blocks: ["Schemas retornados pela API", "Escolha do schema", "Conectar database", "Mapear campos", "Status de integração"],
  },
  {
    id: "certificados-business",
    route: "/certificates",
    title: "Listar certificados já em custódia",
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
    route: "/products",
    title: "Selecionar Value schema, Listar produtos, selecionar produtos e cadastrar produto",
    subtitle: "Criação e gerenciamento de produtos que podem originar ofertas e campanhas.",
    group: "mercado",
    icon: PackageCheck,
    actionId: "step4_list_products",
    apiLabel: "Listar produtos",
    apiHint: "Consulta o catálogo de dSKUs/produtos disponível para a empresa registrada.",
    primaryCta: "Consultar produtos",
    fields: [{ key: "businessId", label: "Identificador da empresa", placeholder: "Gerado no cadastro empresarial", required: true }],
    observedFrom: "Labels Products, Marketplace e Create product dos bundles",
    blocks: ["Lista de produtos", "Novo produto", "Schema usado", "Status de publicação"],
  },
  {
    id: "planos",
    route: "/data-savings-plans",
    title: "Listar DSP padrão, listar DS comercial, ver detalhe do DSP, selecionar DSP",
    subtitle: "Planos comerciais, contribuições de dados, assinatura e renovação automática.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_commercial_dsps",
    apiLabel: "Listar DSPs",
    apiHint: "Consulta planos DSP aplicáveis às operações Business e Personal.",
    primaryCta: "Ver planos",
    fields: [],
    observedFrom: "Labels Data Savings Plan, subscription, contribution e renewal dos bundles",
    blocks: ["Criar plano", "Detalhes do plano", "Contribuições", "Renovação automática"],
  },`;

const newBusinessBlock = `  {
    id: "schemas",
    route: "/schemas-datasets",
    title: "Listar standard value schemas disponíveis",
    subtitle: "Etapa dedicada à API de value schema: consulta os Standard Value Schemas e permite escolher o SID usado nas próximas telas.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "GET Standard Value Schemas",
    apiHint: "API associada: GET /v1/data-registry/value-schemas/standard. A resposta alimenta os cartões do mockup e salva valueSchemaSid quando houver sid/id.",
    primaryCta: "Listar value schemas",
    fields: [{ key: "valueSchemaSid", label: "Value Schema SID", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "API Data Registry: Standard Value Schemas",
    blocks: ["Chamada GET", "Lista de schemas", "SID selecionado", "Variável valueSchemaSid"],
    appEmulation: { kind: "input-response", header: "Value schemas", lead: "Liste os schemas padrão disponíveis para configurar produtos de dados.", responseEmpty: "Toque em Listar value schemas para montar a lista de schemas retornados pela API.", footerNote: "A seleção salva valueSchemaSid em Variáveis para o produto/dSKU." },
  },
  {
    id: "produtos",
    route: "/products",
    title: "Listar produtos disponíveis",
    subtitle: "Etapa dedicada à API de produtos/dSKUs: consulta o catálogo disponível e permite selecionar um produto para a jornada BdW.",
    group: "mercado",
    icon: PackageCheck,
    actionId: "step4_list_products",
    apiLabel: "GET Produtos/dSKUs",
    apiHint: "API associada: GET /v1/data-registry/dskus/product. A resposta alimenta os cartões do catálogo e salva dsku quando houver dsku/id.",
    primaryCta: "Listar produtos",
    fields: [
      { key: "businessId", label: "Identificador da empresa", placeholder: "Gerado no cadastro empresarial", required: true },
      { key: "valueSchemaSid", label: "Value Schema SID", placeholder: "Selecionado na etapa anterior", required: false },
      { key: "dsku", label: "Produto/dSKU selecionado", placeholder: "Escolha após consultar a API", required: false },
    ],
    observedFrom: "API Data Registry: dSKUs/Product",
    blocks: ["Chamada GET", "Catálogo de produtos", "dSKU selecionado", "Variável dsku"],
    appEmulation: { kind: "input-response", header: "Produtos disponíveis", lead: "Consulte produtos de dados disponíveis para a Business dWallet.", responseEmpty: "Toque em Listar produtos para renderizar o catálogo de dSKUs retornado pela API.", footerNote: "Produto escolhido pode ser usado em campanhas/ofertas quando os endpoints estiverem externalizados." },
  },
  {
    id: "dsp-standard",
    route: "/data-savings-plans/standard",
    title: "Listar DSP (Data Savings Plan)",
    subtitle: "Etapa dedicada à listagem de Data Savings Plans standard disponíveis para adesão ou consulta.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_standard_dsps",
    apiLabel: "GET DSP standard",
    apiHint: "API associada: GET /v1/dsavings/data-savings-plans/standard. A resposta alimenta cartões de DSP e salva standardDspId/selectedDspId quando houver id.",
    primaryCta: "Listar DSP",
    fields: [{ key: "standardDspId", label: "DSP standard selecionado", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "API Data Savings: data-savings-plans/standard",
    blocks: ["Chamada GET", "Lista DSP", "Plano selecionado", "Variáveis standardDspId e selectedDspId"],
    appEmulation: { kind: "input-response", header: "DSP disponíveis", lead: "Liste planos standard de poupança de dados para revisar opções disponíveis.", responseEmpty: "Toque em Listar DSP para montar os cartões com planos standard retornados.", footerNote: "A escolha prepara a tela de detalhe do DSP." },
  },
  {
    id: "csp-commercial",
    route: "/data-savings-plans/commercial",
    title: "Listar CSP (Commercial Savings Plan)",
    subtitle: "Etapa dedicada à listagem de planos comerciais disponíveis na jornada BdW.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_commercial_dsps",
    apiLabel: "GET CSP comercial",
    apiHint: "API associada: GET /v1/dsavings/data-savings-plans/commercial. A resposta alimenta cartões de CSP e salva commercialDspId/selectedDspId quando houver id.",
    primaryCta: "Listar CSP",
    fields: [{ key: "commercialDspId", label: "CSP selecionado", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "API Data Savings: data-savings-plans/commercial",
    blocks: ["Chamada GET", "Lista CSP", "Plano comercial", "Variável commercialDspId"],
    appEmulation: { kind: "input-response", header: "CSP comerciais", lead: "Liste planos comerciais para comparar condições de monetização de dados.", responseEmpty: "Toque em Listar CSP para montar os cartões de planos comerciais retornados.", footerNote: "A seleção pode alimentar a criação de conta DSP quando aplicável." },
  },
  {
    id: "dsp-detalhes",
    route: "/data-savings-plans/detail",
    title: "Ver detalhes do DSP",
    subtitle: "Etapa dedicada ao detalhe de um plano DSP selecionado, exibindo metadados e regras retornadas pela API.",
    group: "mercado",
    icon: FileCheck2,
    actionId: "step10_dsp_details",
    apiLabel: "GET detalhe DSP",
    apiHint: "API associada: GET /v1/dsavings/data-savings-plans/standard/{standardDspId}. Usa selectedDspId/standardDspId para montar a rota de detalhe.",
    primaryCta: "Ver detalhe do DSP",
    fields: [{ key: "standardDspId", label: "DSP para detalhar", placeholder: "ID retornado na listagem DSP", required: true }],
    observedFrom: "API Data Savings: detalhe de plano DSP",
    blocks: ["ID do DSP", "Chamada GET de detalhe", "Regras do plano", "Metadados de adesão"],
    appEmulation: { kind: "input-response", header: "Detalhe do DSP", lead: "Revise o plano selecionado antes de confirmar a escolha.", responseEmpty: "Toque em Ver detalhe do DSP para exibir os metadados retornados pela API.", footerNote: "O detalhe confirma se o DSP pode ser escolhido na próxima etapa." },
  },
  {
    id: "dsp-escolha",
    route: "/data-savings-plans/choose",
    title: "Escolher DSP",
    subtitle: "Etapa dedicada à escolha/adesão do DSP usando o identificador confirmado no detalhe.",
    group: "mercado",
    icon: BadgeCheck,
    actionId: "step10_create_dsp_account",
    apiLabel: "POST escolher DSP",
    apiHint: "API associada: POST /v1/dsavings/data-savings-accounts. Usa selectedDspId, commercialDspId ou standardDspId como cdspId conforme retorno disponível.",
    primaryCta: "Escolher DSP",
    fields: [
      { key: "selectedDspId", label: "DSP escolhido", placeholder: "ID confirmado no detalhe", required: false },
      { key: "commercialDspId", label: "CSP de referência", placeholder: "ID comercial retornado pela API", required: false },
      { key: "standardDspId", label: "DSP standard", placeholder: "ID standard retornado pela API", required: false },
    ],
    observedFrom: "API Data Savings: data-savings-accounts",
    blocks: ["Plano escolhido", "Payload de adesão", "Conta DSP", "Resultado da escolha"],
    appEmulation: { kind: "input-response", header: "Escolher DSP", lead: "Confirme o plano que será usado para criar a conta DSP de teste.", responseEmpty: "Toque em Escolher DSP para enviar a escolha e registrar a evidência de execução.", footerNote: "A conta DSP retornada é salva em Variáveis quando a API disponibiliza identificador." },
  },
  {
    id: "certificados-business",
    route: "/certificates",
    title: "Listar certificados já em custódia",
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
  },`;

app = replaceOnce(app, oldBusinessBlock, newBusinessBlock, 'bloco Business schemas/produtos/planos');

app = replaceOnce(app,
`          {screen.id === "schemas" ? <SchemaSelectionPreview evidence={evidence} selectedSchema={String(values.valueSchemaSid || "")} onChange={onChange} /> : null}
          {screen.id === "decisao-solicitacao" ? <DataRequestDecisionPreview values={values} evidence={evidence} onChange={onChange} /> : null}`,
`          {screen.id === "schemas" ? <SchemaSelectionPreview evidence={evidence} selectedSchema={String(values.valueSchemaSid || "")} onChange={onChange} /> : null}
          {screen.id === "produtos" ? <ProductCatalogPreview evidence={evidence} selectedProduct={String(values.dsku || "")} onChange={onChange} /> : null}
          {screen.id === "dsp-standard" ? <SavingsPlanPreview kind="dsp" evidence={evidence} selectedPlan={String(values.standardDspId || values.selectedDspId || "")} onChange={onChange} /> : null}
          {screen.id === "csp-commercial" ? <SavingsPlanPreview kind="csp" evidence={evidence} selectedPlan={String(values.commercialDspId || values.selectedDspId || "")} onChange={onChange} /> : null}
          {screen.id === "dsp-detalhes" ? <SavingsPlanPreview kind="detail" evidence={evidence} selectedPlan={String(values.selectedDspId || values.standardDspId || "")} onChange={onChange} /> : null}
          {screen.id === "dsp-escolha" ? <SavingsPlanPreview kind="choice" evidence={evidence} selectedPlan={String(values.selectedDspId || values.commercialDspId || values.standardDspId || "")} onChange={onChange} /> : null}
          {screen.id === "decisao-solicitacao" ? <DataRequestDecisionPreview values={values} evidence={evidence} onChange={onChange} /> : null}`,
'condicionais de preview no mockup');

write(files.app, app);

let dataprev = read(files.dataprev);

dataprev = replaceOnce(dataprev,
`    onSuccess: body => ({ dsku: firstListItem(body)?.dsku as string | undefined || firstListItem(body)?.id as string | undefined }),`,
`    onSuccess: body => ({ dsku: firstListItem(body)?.dsku as string | undefined || firstListItem(body)?.id as string | undefined }),`,
'noop produtos');

dataprev = replaceOnce(dataprev,
`    onSuccess: body => ({ commercialDspId: firstListItem(body)?.id as string | undefined }),
  },
  {
    id: "step10_standard_dsps",
    title: "Pessoa visualiza DSPs standard",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/data-savings-plans/standard",
    status: "external",
    requiresM2M: true,
    description: "Lista planos standard de poupança de dados.",
  },
  {
    id: "step10_create_dsp_account",`,
`    onSuccess: body => ({ commercialDspId: firstListItem(body)?.id as string | undefined, selectedDspId: firstListItem(body)?.id as string | undefined }),
  },
  {
    id: "step10_standard_dsps",
    title: "Pessoa visualiza DSPs standard",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    path: "/v1/dsavings/data-savings-plans/standard",
    status: "external",
    requiresM2M: true,
    description: "Lista planos standard de poupança de dados.",
    onSuccess: body => ({ standardDspId: firstListItem(body)?.id as string | undefined, selectedDspId: firstListItem(body)?.id as string | undefined }),
  },
  {
    id: "step10_dsp_details",
    title: "Pessoa visualiza detalhe do DSP",
    app: "Personal",
    group: "Data Savings",
    method: "GET",
    status: "partial",
    requiresM2M: true,
    description: "Consulta detalhe de um plano DSP standard usando o identificador salvo pela listagem.",
    expectedStatus: [200, 500],
    buildPath: state => "/v1/dsavings/data-savings-plans/standard/" + encodeURIComponent(String(state.selectedDspId || state.standardDspId || state.commercialDspId || "")),
  },
  {
    id: "step10_create_dsp_account",`,
'ações DSP standard, detalhe e CSP');

dataprev = replaceOnce(dataprev,
`    buildBody: state => ({ cdspId: state.commercialDspId, categories: ["travel-and-transportation"], currency: "BRL", savingsGoal: 1000, agreedToTermsAndConditions: true }),`,
`    buildBody: state => ({ cdspId: state.selectedDspId || state.commercialDspId || state.standardDspId, categories: ["travel-and-transportation"], currency: "BRL", savingsGoal: 1000, agreedToTermsAndConditions: true }),
    onSuccess: body => ({ dspAccountId: firstListItem(body)?.id as string | undefined || findFirst(body, ["id", "accountId", "dspAccountId"]) }),`,
'payload de escolha DSP');

write(files.dataprev, dataprev);

let uiTest = read(files.uiTest);

uiTest = replaceOnce(uiTest,
`    expect(personalCertificatesHtml).toContain("certificados de dados já em posse da pessoa");
  });`,
`    expect(personalCertificatesHtml).toContain("certificados de dados já em posse da pessoa");
  });

  it("renders separated Business BdW API steps for value schemas, products, DSP, CSP, DSP details and DSP choice", () => {
    const expected = [
      { id: "schemas", actionId: "step3_list_schemas", title: "Listar standard value schemas disponíveis" },
      { id: "produtos", actionId: "step4_list_products", title: "Listar produtos disponíveis" },
      { id: "dsp-standard", actionId: "step10_standard_dsps", title: "Listar DSP (Data Savings Plan)" },
      { id: "csp-commercial", actionId: "step10_commercial_dsps", title: "Listar CSP (Commercial Savings Plan)" },
      { id: "dsp-detalhes", actionId: "step10_dsp_details", title: "Ver detalhes do DSP" },
      { id: "dsp-escolha", actionId: "step10_create_dsp_account", title: "Escolher DSP" },
    ];

    for (const item of expected) {
      const screen = businessScreens.find(screen => screen.id === item.id);
      expect(screen, item.id).toBeDefined();
      expect(screen?.actionId).toBe(item.actionId);
      expect(screen?.title).toBe(item.title);
      expect(screen?.apiHint).toContain("API associada");
    }

    const productHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: businessScreens.find(screen => screen.id === "produtos")!,
      values: { businessId: "biz_123", valueSchemaSid: "schema-income-001", dsku: "dsku-001" },
      evidence: {
        actionId: "step4_list_products",
        actionTitle: "Consultar catálogo de dSKUs/produtos",
        status: "executed",
        ok: true,
        httpStatus: 200,
        responseBody: { products: [{ dsku: "dsku-001", name: "Produto renda", description: "Produto de dados de renda" }] },
        stateUpdates: { dsku: "dsku-001" },
        executedAt: "2026-05-06T12:00:00.000Z",
      },
      status: "done",
      onChange: () => undefined,
      onRun: () => undefined,
    }));

    expect(productHtml).toContain("Produtos disponíveis");
    expect(productHtml).toContain("Produto renda");
    expect(productHtml).toContain("dsku-001");

    const dspHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: businessScreens.find(screen => screen.id === "dsp-standard")!,
      values: { standardDspId: "dsp-001" },
      evidence: {
        actionId: "step10_standard_dsps",
        actionTitle: "Pessoa visualiza DSPs standard",
        status: "executed",
        ok: true,
        httpStatus: 200,
        responseBody: { plans: [{ id: "dsp-001", name: "DSP renda", currency: "BRL", savingsGoal: 1000 }] },
        stateUpdates: { standardDspId: "dsp-001", selectedDspId: "dsp-001" },
        executedAt: "2026-05-06T12:00:00.000Z",
      },
      status: "done",
      onChange: () => undefined,
      onRun: () => undefined,
    }));

    expect(dspHtml).toContain("Data Savings Plans");
    expect(dspHtml).toContain("DSP renda");
    expect(dspHtml).toContain("dsp-001");

    const cspHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: businessScreens.find(screen => screen.id === "csp-commercial")!,
      values: { commercialDspId: "csp-001" },
      evidence: {
        actionId: "step10_commercial_dsps",
        actionTitle: "Pessoa visualiza DSPs comerciais",
        status: "executed",
        ok: true,
        httpStatus: 200,
        responseBody: { plans: [{ id: "csp-001", name: "CSP comercial", currency: "BRL", savingsGoal: 2500 }] },
        stateUpdates: { commercialDspId: "csp-001", selectedDspId: "csp-001" },
        executedAt: "2026-05-06T12:00:00.000Z",
      },
      status: "done",
      onChange: () => undefined,
      onRun: () => undefined,
    }));

    expect(cspHtml).toContain("Commercial Savings Plans");
    expect(cspHtml).toContain("CSP comercial");
    expect(cspHtml).toContain("csp-001");

    const chooseHtml = renderToStaticMarkup(React.createElement(AppEmulatedScreen, {
      screen: businessScreens.find(screen => screen.id === "dsp-escolha")!,
      values: { selectedDspId: "dsp-001", commercialDspId: "csp-001", standardDspId: "dsp-001" },
      status: "pending",
      onChange: () => undefined,
      onRun: () => undefined,
    }));

    expect(chooseHtml).toContain("Escolha do DSP");
    expect(chooseHtml).toContain("Escolher DSP");
    expect(chooseHtml).toContain("dsp-001");
  });`,
'novo teste UI das etapas separadas BdW');

write(files.uiTest, uiTest);

let routerTest = read(files.routerTest);
routerTest = replaceOnce(routerTest,
`  it("expõe os 17 passos da jornada com aplicações Personal e Business", async () => {`,
`  it("expõe os passos da jornada com aplicações Personal e Business", async () => {`,
'descrição do teste de metadados');
routerTest = replaceOnce(routerTest,
`    expect(metadata.steps).toHaveLength(17);`,
`    expect(metadata.steps.length).toBeGreaterThanOrEqual(18);
    expect(metadata.steps.some(step => step.id === "step10_dsp_details")).toBe(true);`,
'contagem de metadados após detalhe DSP');
write(files.routerTest, routerTest);

console.log('Patch aplicado: etapas BdW separadas, previews, ação de detalhe DSP e testes atualizados.');
