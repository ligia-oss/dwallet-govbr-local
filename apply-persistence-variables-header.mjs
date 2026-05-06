import fs from 'node:fs';

const govPath = '/home/ubuntu/dwallet-govbr-local/client/src/pages/GovBRWalletApp.tsx';
const homePath = '/home/ubuntu/dwallet-govbr-local/client/src/pages/Home.tsx';
let gov = fs.readFileSync(govPath, 'utf8');
let home = fs.readFileSync(homePath, 'utf8');

function replaceOnce(source, find, replace, label) {
  if (!source.includes(find)) throw new Error(`Trecho não encontrado: ${label}`);
  return source.replace(find, replace);
}

gov = replaceOnce(gov, 'import React, { useMemo, useState } from "react";', 'import React, { useEffect, useMemo, useState } from "react";', 'import useEffect');

const persistenceHelpers = `
const WALLET_RUN_STORAGE_VERSION = 1;

type PersistedWalletRun = {
  version: number;
  state: RunState;
  evidences: Record<string, Evidence>;
  credentialFolder: CredentialFolderItem[];
  m2mResult?: M2MAuthResult;
  reviewedGuideSteps: Record<string, boolean>;
};

function getWalletRunStorageKey(kind: WalletKind) {
  return \`govbr-wallet-run-state-v\${WALLET_RUN_STORAGE_VERSION}-\${kind}\`;
}

function emptyPersistedWalletRun(): PersistedWalletRun {
  return {
    version: WALLET_RUN_STORAGE_VERSION,
    state: {},
    evidences: {},
    credentialFolder: [],
    reviewedGuideSteps: {},
  };
}

function readPersistedWalletRun(kind: WalletKind): PersistedWalletRun {
  if (typeof window === "undefined") return emptyPersistedWalletRun();

  try {
    const raw = window.localStorage.getItem(getWalletRunStorageKey(kind));
    if (!raw) return emptyPersistedWalletRun();
    const parsed = JSON.parse(raw) as Partial<PersistedWalletRun>;
    if (parsed.version !== WALLET_RUN_STORAGE_VERSION) return emptyPersistedWalletRun();

    return {
      version: WALLET_RUN_STORAGE_VERSION,
      state: parsed.state && typeof parsed.state === "object" ? parsed.state : {},
      evidences: parsed.evidences && typeof parsed.evidences === "object" ? parsed.evidences : {},
      credentialFolder: Array.isArray(parsed.credentialFolder) ? parsed.credentialFolder : [],
      m2mResult: parsed.m2mResult,
      reviewedGuideSteps: parsed.reviewedGuideSteps && typeof parsed.reviewedGuideSteps === "object" ? parsed.reviewedGuideSteps : {},
    };
  } catch {
    return emptyPersistedWalletRun();
  }
}

function persistWalletRun(kind: WalletKind, snapshot: PersistedWalletRun) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getWalletRunStorageKey(kind), JSON.stringify({ ...snapshot, version: WALLET_RUN_STORAGE_VERSION }));
}

function clearPersistedWalletRun(kind: WalletKind) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getWalletRunStorageKey(kind));
}
`;

gov = replaceOnce(gov, 'export function compactRunState(mergedState: RunState): Record<string, string | number | boolean | null> {\n  return Object.fromEntries(Object.entries(mergedState).filter(([, value]) => value !== undefined)) as Record<string, string | number | boolean | null>;\n}\n', 'export function compactRunState(mergedState: RunState): Record<string, string | number | boolean | null> {\n  return Object.fromEntries(Object.entries(mergedState).filter(([, value]) => value !== undefined)) as Record<string, string | number | boolean | null>;\n}\n' + persistenceHelpers, 'helpers de persistência');

gov = replaceOnce(gov, '  const initialTab = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "credenciais" ? "credenciais" : "tela";\n  const [activeId, setActiveId] = useState(screens[0]?.id ?? "entrada");\n  const [state, setState] = useState<RunState>({});\n  const [evidences, setEvidences] = useState<Record<string, Evidence>>({});\n  const [m2mResult, setM2mResult] = useState<M2MAuthResult | undefined>(() => {\n    const persisted = readPersistedM2MTokenStatus();', '  const requestedTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;\n  const initialTab = requestedTab === "variaveis" || requestedTab === "credenciais" ? "variaveis" : "tela";\n  const persistedRun = useMemo(() => readPersistedWalletRun(kind), [kind]);\n  const [activeId, setActiveId] = useState(screens[0]?.id ?? "entrada");\n  const [state, setState] = useState<RunState>(() => persistedRun.state);\n  const [evidences, setEvidences] = useState<Record<string, Evidence>>(() => persistedRun.evidences);\n  const [m2mResult, setM2mResult] = useState<M2MAuthResult | undefined>(() => {\n    if (persistedRun.m2mResult) return persistedRun.m2mResult;\n    const persisted = readPersistedM2MTokenStatus();', 'estado inicial persistido');

gov = replaceOnce(gov, '  const [errors, setErrors] = useState<Record<string, string>>({});\n  const [reviewedGuideSteps, setReviewedGuideSteps] = useState<Record<string, boolean>>({});\n  const [dataprevCredentials, setDataprevCredentials] = useState<DataprevCredentialForm>(() => readPersistedDataprevCredentials());\n  const [credentialFolder, setCredentialFolder] = useState<CredentialFolderItem[]>([]);', '  const [errors, setErrors] = useState<Record<string, string>>({});\n  const [reviewedGuideSteps, setReviewedGuideSteps] = useState<Record<string, boolean>>(() => persistedRun.reviewedGuideSteps);\n  const [dataprevCredentials, setDataprevCredentials] = useState<DataprevCredentialForm>(() => readPersistedDataprevCredentials());\n  const [credentialFolder, setCredentialFolder] = useState<CredentialFolderItem[]>(() => persistedRun.credentialFolder);', 'estado de pasta persistido');

gov = replaceOnce(gov, '  const completed = screens.filter(screen => screen.actionId && evidences[screen.actionId]?.ok).length;\n  const callable = screens.filter(screen => screen.actionId).length;\n', '  const completed = screens.filter(screen => screen.actionId && evidences[screen.actionId]?.ok).length;\n  const callable = screens.filter(screen => screen.actionId).length;\n\n  useEffect(() => {\n    persistWalletRun(kind, {\n      version: WALLET_RUN_STORAGE_VERSION,\n      state,\n      evidences,\n      credentialFolder,\n      m2mResult,\n      reviewedGuideSteps,\n    });\n  }, [kind, state, evidences, credentialFolder, m2mResult, reviewedGuideSteps]);\n', 'efeito de persistência');

gov = replaceOnce(gov, '    setCredentialFolder([]);\n    setRunningId(undefined);', '    setCredentialFolder([]);\n    clearPersistedWalletRun(kind);\n    setRunningId(undefined);', 'limpeza do armazenamento persistido');

gov = gov.replaceAll('aba Credenciais', 'aba Variáveis');
gov = gov.replaceAll('na aba credenciais', 'na aba Variáveis');
gov = gov.replaceAll('aba de credenciais', 'aba Variáveis');
gov = gov.replaceAll('Pasta de credenciais', 'Pasta de variáveis');
gov = gov.replaceAll('Limpar pasta', 'Limpar variáveis de resposta do teste');
gov = gov.replaceAll('Limpar retornos das APIs executadas', 'Limpar variáveis de resposta do teste');
gov = gov.replaceAll('Credenciais guarda respostas úteis', 'Variáveis guardam respostas úteis');
gov = gov.replaceAll('credenciais compartilhada por jornada', 'variáveis compartilhada por jornada');

gov = replaceOnce(gov, '<div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">\n          <div className="flex items-center gap-4">\n            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1351B4] text-white"><Landmark className="h-6 w-6" /></div>\n            <div>\n              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1351B4]">gov.br · carteira digital de dados</p>\n              <h1 className="text-xl font-bold">{isPersonal ? "Personal dWallet GovBR" : "Business dWallet GovBR"}</h1>\n            </div>\n          </div>\n          <div className="flex flex-wrap gap-2">', '<div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">\n          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">\n            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1351B4] text-white"><Landmark className="h-6 w-6" /></div>\n            <div className="min-w-0 space-y-1">\n              <p className="max-w-full break-words text-[11px] font-bold uppercase leading-5 tracking-[0.16em] text-[#1351B4] sm:text-xs sm:tracking-[0.22em]">gov.br · carteira digital de dados</p>\n              <h1 className="max-w-full break-words text-xl font-bold leading-tight sm:text-2xl">{isPersonal ? "Personal dWallet GovBR" : "Business dWallet GovBR"}</h1>\n            </div>\n          </div>\n          <div className="flex flex-wrap gap-2">', 'header principal legível');

gov = replaceOnce(gov, '            <h2 className="max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">{isPersonal ? "Carteira cidadã para controlar, autorizar e monetizar dados." : "DrumWave dWallets®"}</h2>\n            <p className="max-w-3xl text-base leading-7 text-blue-50">Este front-end reproduz a navegação pública, onboarding e telas internas mapeadas das dWallets® DrumWave, redesenhadas com hierarquia visual, cores, foco acessível e linguagem institucional do governo brasileiro</p>', '            <h2 className="max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">{isPersonal ? "Carteira cidadã para controlar, autorizar e monetizar dados." : "DrumWave dWallets®"}</h2>\n            <p className="max-w-3xl text-base leading-7 text-blue-50">Este front-end reproduz a navegação pública, onboarding e telas internas mapeadas das dWallets® DrumWave, redesenhadas com hierarquia visual, cores, foco acessível e linguagem institucional do governo brasileiro.</p>', 'hero principal legível');

gov = replaceOnce(gov, 'APIs Dataprev protegidas usam o M2M token gerado na aba Variáveis enquanto ele estiver ativo.', 'APIs Dataprev protegidas usam o M2M token gerado na aba Variáveis enquanto ele estiver ativo. As respostas ficam preservadas ao alternar entre Home, PdW e BdW até a limpeza explícita.', 'descrição persistência');

gov = replaceOnce(gov, '<TabsTrigger value="variaveis">Variáveis de teste</TabsTrigger>\n              <TabsTrigger value="credenciais">Credenciais</TabsTrigger>', '<TabsTrigger value="teste">Inputs de teste</TabsTrigger>\n              <TabsTrigger value="variaveis">Variáveis</TabsTrigger>', 'rótulos de abas');
gov = replaceOnce(gov, '<TabsContent value="variaveis">\n              <TestVariablesPanel variables={testVariables} values={mergedState} onChange={updateField} onReset={resetTestVariables} />\n            </TabsContent>\n            <TabsContent value="credenciais" className="space-y-6">', '<TabsContent value="teste">\n              <TestVariablesPanel variables={testVariables} values={mergedState} onChange={updateField} onReset={resetTestVariables} />\n            </TabsContent>\n            <TabsContent value="variaveis" className="space-y-6">', 'conteúdo das abas');

home = home.replaceAll('aba Credenciais', 'aba Variáveis');
home = home.replaceAll('pasta de credenciais', 'pasta de variáveis');
home = home.replaceAll('Pasta de credenciais', 'Pasta de variáveis');
home = home.replaceAll('bloco Credenciais e chaves', 'bloco Credenciais e chaves');
home = home.replaceAll('/business-govbr?tab=credenciais', '/business-govbr?tab=variaveis');
home = home.replaceAll('área de credenciais', 'área de variáveis');
home = home.replaceAll('na aba Credenciais', 'na aba Variáveis');
home = home.replaceAll('Credenciais guarda respostas úteis', 'Variáveis guardam respostas úteis');
home = home.replaceAll('A aba reúne valores retornados por API', 'A aba reúne variáveis e valores retornados por API');
home = home.replaceAll('Esse ID fica disponível na aba Credenciais', 'Esse ID fica disponível na aba Variáveis');
home = home.replaceAll('gere o M2M token na aba Credenciais', 'gere o M2M token na aba Variáveis');

fs.writeFileSync(govPath, gov);
fs.writeFileSync(homePath, home);
console.log('Alterações de header, persistência e Variáveis aplicadas.');
