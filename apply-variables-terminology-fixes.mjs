import { readFileSync, writeFileSync } from 'node:fs';

const replacements = [
  {
    file: 'client/src/pages/GovBRWalletApp.tsx',
    pairs: [
      ['usuário ou sessão retornados pela API são salvos automaticamente em Credenciais.', 'usuário ou sessão retornados pela API são salvos automaticamente em Variáveis.'],
      ['Quando uma tela Personal exigir Business ID, abra a Business dWallet, crie/abra a BdW e copie da pasta Credenciais o ID da BdW gerado pela API empresarial.', 'Quando uma tela Personal exigir Business ID, abra a Business dWallet, crie/abra a BdW e copie da aba Variáveis o ID da BdW gerado pela API empresarial.'],
      ['Execute uma tela por vez, salvando IDs de produto, schema, solicitação ou consentimento em Credenciais para chamadas relacionadas.', 'Execute uma tela por vez, salvando IDs de produto, schema, solicitação ou consentimento em Variáveis para chamadas relacionadas.'],
      ['Siga esta ordem para testar a {appName} dentro do mockup. Edite os dados no telefone, execute uma API por vez e confira quais informações foram salvas em Credenciais para alimentar etapas seguintes.', 'Siga esta ordem para testar a {appName} dentro do mockup. Edite os dados no telefone, execute uma API por vez e confira quais informações foram salvas em Variáveis para alimentar etapas seguintes.'],
      ['Cada linha representa uma etapa da execução. As etapas ficam concluídas quando a API retorna OK, e os valores gerados ficam disponíveis em Credenciais para serem reutilizados como input em outras APIs.', 'Cada linha representa uma etapa da execução. As etapas ficam concluídas quando a API retorna OK, e os valores gerados ficam disponíveis em Variáveis para serem reutilizados como input em outras APIs.'],
      ['<strong>1.</strong> Preencha na aba Credenciais', '<strong>1.</strong> Preencha na aba Variáveis'],
      ['new URLSearchParams(window.location.search).get("tab") === "credenciais"', 'new URLSearchParams(window.location.search).get("tab") === "variaveis"'],
    ],
  },
  {
    file: 'client/src/pages/Home.tsx',
    pairs: [
      ['pasta de credenciais', 'aba Variáveis'],
      ['aba Credenciais', 'aba Variáveis'],
      ['Credenciais', 'Variáveis'],
      ['credenciais', 'variáveis'],
      ['tab=credenciais', 'tab=variaveis'],
    ],
  },
  {
    file: 'server/dataprev.ts',
    pairs: [
      ['aba Credenciais', 'aba Variáveis'],
      ['aba credenciais', 'aba Variáveis'],
    ],
  },
];

for (const { file, pairs } of replacements) {
  let content = readFileSync(file, 'utf8');
  const before = content;
  for (const [from, to] of pairs) {
    content = content.split(from).join(to);
  }
  if (content !== before) {
    writeFileSync(file, content);
    console.log(`updated ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}
