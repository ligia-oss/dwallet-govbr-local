import { mkdirSync, writeFileSync } from "node:fs";
import { appRouter } from "../server/routers";

const ctx = {
  req: {} as any,
  res: {
    clearCookie: () => undefined,
  } as any,
  user: null,
};

type AnyRecord = Record<string, any>;

const caller = appRouter.createCaller(ctx);
const runId = String(Date.now()).slice(-10);

const state: AnyRecord = {
  runId,
  personEmail: `personal-${runId}@example.com`,
  personFirstName: "Pessoa",
  personLastName: "GovBR",
  personPhone: "+5511999988888",
  personPassword: "SenhaPersonal123!",
  personAddressLine: "Rua Sintetica 100",
  personCity: "Brasilia",
  personState: "DF",
  personZip: "70000-000",
  employeeEmail: `employee-${runId}@example.com`,
  employeeFirstName: "Funcionario",
  employeeLastName: "GovBR",
  employeePhone: "+5511988877777",
  employeePassword: "SenhaEmployee123!",
  employeeAddressLine: "Rua Funcionario 200",
  employeeCity: "Sao Paulo",
  employeeState: "SP",
  employeeZip: "01000-000",
  businessName: `Empresa GovBR ${runId}`,
  businessTradingName: `GovBR ${runId}`,
  businessTaxId: `11222${runId.slice(-8)}`.slice(0, 14),
  businessState: "SP",
  dataRequestTemplateId: `template-${runId}`,
  accountsPayload: "{\n  \"accounts\": []\n}",
};

const metadata = await caller.dataprev.metadata();
const actions: Array<{ stepId: string; actionId: string; title: string }> = [];

for (const step of metadata.steps as AnyRecord[]) {
  for (const action of step.actions || []) {
    if (action?.id && action.status !== "gap") {
      actions.push({ stepId: String(step.id), actionId: action.id, title: action.title || action.id });
    }
  }
}

const results = [];
for (const action of actions) {
  const evidence = await caller.dataprev.executeAction({ actionId: action.actionId, state });
  if (evidence.stateUpdates && typeof evidence.stateUpdates === "object") {
    for (const [key, value] of Object.entries(evidence.stateUpdates)) {
      if (value !== undefined) state[key] = value;
    }
  }
  results.push({ ...action, evidence });
}

const summary = results.map(item => ({
  stepId: item.stepId,
  actionId: item.actionId,
  title: item.title,
  status: item.evidence.status,
  ok: item.evidence.ok,
  httpStatus: item.evidence.httpStatus,
  message: item.evidence.message,
  url: item.evidence.url,
}));

const report = {
  validatedAt: new Date().toISOString(),
  scenario: "govbr-page-all-mapped-actions-sequential-smoke",
  note: "Execução sequencial das ações mapeadas na página GovBR com dados sintéticos e estado mesclado a partir de stateUpdates sanitizados.",
  runId,
  actionCount: actions.length,
  summary,
  results,
};

mkdirSync("validation-artifacts", { recursive: true });
writeFileSync("validation-artifacts/govbr-actions-smoke.json", JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  actionCount: actions.length,
  evidenceFile: "validation-artifacts/govbr-actions-smoke.json",
  summary,
}, null, 2));
