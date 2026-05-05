import { mkdirSync, writeFileSync } from "node:fs";
import { appRouter } from "../server/routers";

const ctx = {
  req: {} as any,
  res: {
    clearCookie: () => undefined,
  } as any,
  user: null,
};

const runId = String(Date.now()).slice(-10);
const state = {
  runId,
  personEmail: `direct-edit-${runId}@example.com`,
  personFirstName: "Direto",
  personLastName: "Validado",
  personPhone: "+5511999988888",
  personPassword: "SenhaDireta123!",
  personAddressLine: "Rua Validacao Direta 123",
  personCity: "Brasilia",
  personState: "DF",
  personZip: "70000-000",
};

const caller = appRouter.createCaller(ctx);
const evidence = await caller.dataprev.executeAction({
  actionId: "step2_person_signup",
  state,
});

const result = {
  validatedAt: new Date().toISOString(),
  scenario: "direct-screen-edit-to-api-payload",
  note: "Estado sintético equivalente aos campos editados diretamente no formulário emulado Personal GovBR.",
  editedFields: {
    personEmail: state.personEmail,
    personFirstName: state.personFirstName,
    personLastName: state.personLastName,
    personPhone: state.personPhone,
    personPassword: "<REDACTED>",
    personAddressLine: state.personAddressLine,
    personCity: state.personCity,
    personState: state.personState,
    personZip: state.personZip,
  },
  evidence,
};

mkdirSync("validation-artifacts", { recursive: true });
writeFileSync("validation-artifacts/direct-edit-api-evidence.json", JSON.stringify(result, null, 2));

console.log(JSON.stringify({
  ok: evidence.ok,
  status: evidence.status,
  httpStatus: evidence.httpStatus,
  actionId: evidence.actionId,
  evidenceFile: "validation-artifacts/direct-edit-api-evidence.json",
  requestBody: evidence.requestBody,
  message: evidence.message,
}, null, 2));
