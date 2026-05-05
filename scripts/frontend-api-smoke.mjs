import fs from "node:fs";
import path from "node:path";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const projectRoot = "/home/ubuntu/dwallet-govbr-local";
const frontendFile = path.join(projectRoot, "client/src/pages/GovBRWalletApp.tsx");
const source = fs.readFileSync(frontendFile, "utf8");
const actionIds = [...source.matchAll(/actionId: "([^"]+)"/g)].map(match => match[1]);

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

function classify(result) {
  if (!result) return "falha técnica";
  if (result.status === "not_executable" && result.ok) return "API ausente/pendente";
  if (result.ok) return "sucesso";
  if (result.status === "failed") return "erro de negócio/técnico";
  return "atenção";
}

function normalizeMessage(errorOrResult) {
  if (!errorOrResult) return "Sem mensagem retornada.";
  if (errorOrResult instanceof Error) return errorOrResult.message;
  return errorOrResult.message || errorOrResult.missingReason || "Resposta recebida sem mensagem textual.";
}

const dataprevMetadata = await client.dataprev.metadata.query();
const btgMetadata = await client.btg.metadata.query();
let state = { ...(dataprevMetadata.initialState || {}), ...(btgMetadata.initialState || {}) };
const rows = [];

let m2m;
try {
  m2m = await client.dataprev.authenticateM2M.mutate({});
  rows.push({
    ordem: 0,
    actionId: "dataprev.authenticateM2M",
    origem: "Dataprev",
    status: m2m.ok ? "sucesso" : "erro de negócio/técnico",
    ok: Boolean(m2m.ok),
    httpStatus: m2m.httpStatus ?? "",
    metodo: "POST",
    url: m2m.url ?? "",
    mensagem: normalizeMessage(m2m),
    stateUpdates: "",
  });
} catch (error) {
  rows.push({
    ordem: 0,
    actionId: "dataprev.authenticateM2M",
    origem: "Dataprev",
    status: "falha técnica",
    ok: false,
    httpStatus: "",
    metodo: "POST",
    url: "",
    mensagem: normalizeMessage(error),
    stateUpdates: "",
  });
}

for (const [index, actionId] of actionIds.entries()) {
  const origem = actionId.startsWith("btg_") ? "BTG" : "Dataprev";
  try {
    const result = origem === "BTG"
      ? await client.btg.executeAction.mutate({ actionId, state })
      : await client.dataprev.executeAction.mutate({ actionId, state, credentials: {} });

    if (result?.stateUpdates) state = { ...state, ...result.stateUpdates };
    rows.push({
      ordem: index + 1,
      actionId,
      origem,
      status: classify(result),
      ok: Boolean(result?.ok),
      httpStatus: result?.httpStatus ?? "",
      metodo: result?.method ?? "",
      url: result?.url ?? "",
      mensagem: normalizeMessage(result),
      stateUpdates: result?.stateUpdates ? Object.keys(result.stateUpdates).join(", ") : "",
    });
  } catch (error) {
    rows.push({
      ordem: index + 1,
      actionId,
      origem,
      status: "falha técnica",
      ok: false,
      httpStatus: "",
      metodo: "",
      url: "",
      mensagem: normalizeMessage(error),
      stateUpdates: "",
    });
  }
}

const outDir = path.join(projectRoot, "tmp");
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, "frontend-api-smoke-results.json");
const mdPath = path.join(outDir, "frontend-api-smoke-results.md");
fs.writeFileSync(jsonPath, JSON.stringify({ executedAt: new Date().toISOString(), rows }, null, 2));

const escapeCell = value => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const md = [
  "# Execução de APIs via cliente frontend",
  "",
  `Executado em: ${new Date().toISOString()}`,
  "",
  "| Ordem | Action ID | Origem | Status | OK | HTTP | Mensagem | Atualizações de estado |",
  "|---:|---|---|---|---:|---:|---|---|",
  ...rows.map(row => `| ${row.ordem} | ${escapeCell(row.actionId)} | ${escapeCell(row.origem)} | ${escapeCell(row.status)} | ${row.ok ? "sim" : "não"} | ${escapeCell(row.httpStatus)} | ${escapeCell(row.mensagem)} | ${escapeCell(row.stateUpdates)} |`),
  "",
].join("\n");
fs.writeFileSync(mdPath, md);
console.log(JSON.stringify({ jsonPath, mdPath, total: rows.length, failures: rows.filter(row => !row.ok && row.status !== "API ausente/pendente").length }, null, 2));
