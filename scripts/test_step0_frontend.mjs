import fs from 'node:fs';
import { chromium } from 'playwright';

const credentials = JSON.parse(fs.readFileSync('/home/ubuntu/dwallet-govbr-local/.tmp_frontend_step0_creds.json', 'utf8'));
const url = process.env.FRONTEND_URL || 'http://127.0.0.1:3000/personal-govbr';
const artifactPath = '/home/ubuntu/dwallet-govbr-local/validation-artifacts/step0-frontend-evidence.json';
const screenshotPath = '/home/ubuntu/dwallet-govbr-local/validation-artifacts/step0-frontend-result.png';
fs.mkdirSync('/home/ubuntu/dwallet-govbr-local/validation-artifacts', { recursive: true });

function mask(value) {
  const s = String(value ?? '');
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
}

function classify(value) {
  const s = String(value ?? '').trim();
  return {
    present: Boolean(s),
    placeholder: /<\s*YOUR|YOUR_|TODO|REPLACE|CHANGE_ME|\{\{/i.test(s),
    length: s.length,
    preview: mask(s),
  };
}

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const network = [];
page.on('response', async response => {
  const request = response.request();
  const reqUrl = response.url();
  if (reqUrl.includes('/api/trpc')) {
    network.push({ method: request.method(), url: reqUrl.replace(/batch=1.*/, 'batch=1…'), status: response.status() });
  }
});

let outcome = 'unknown';
let resultText = '';
let errorText = '';
let resultJson = null;

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.getByRole('tab', { name: 'Credenciais' }).click();
  await page.locator('#dataprev-base-url').fill(credentials.baseUrl || '');
  await page.locator('#dataprev-api-key').fill(credentials.apiKey || '');
  await page.locator('#dataprev-client-id').fill(credentials.clientId || '');
  await page.locator('#dataprev-client-secret').fill(credentials.clientSecret || '');
  await page.getByRole('button', { name: /Passo 0 — Autenticar M2M/i }).first().click();
  await page.waitForTimeout(8000);

  const textareas = await page.locator('textarea').all();
  for (const textarea of textareas) {
    const value = await textarea.inputValue().catch(() => '');
    if (value.includes('executedAt') || value.includes('httpStatus') || value.includes('tokenHandle') || value.includes('Falha')) {
      resultText = value;
    }
  }
  const bodyText = await page.locator('body').innerText();
  const failureMatch = bodyText.match(/Falha no Passo 0[\s\S]{0,500}/i);
  errorText = failureMatch ? failureMatch[0].replace(/\s+/g, ' ').trim() : '';

  try { resultJson = resultText ? JSON.parse(resultText) : null; } catch { resultJson = null; }
  if (resultJson?.ok === true || /ativo no servidor/i.test(bodyText)) outcome = 'success';
  else if (errorText || resultJson?.ok === false || resultJson?.status === 'failed') outcome = 'failed';
  else outcome = 'indeterminate';

  await page.screenshot({ path: screenshotPath, fullPage: true });
} catch (error) {
  outcome = 'automation_error';
  errorText = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
}

const sanitizedResult = resultJson ? {
  status: resultJson.status,
  ok: resultJson.ok,
  method: resultJson.method,
  url: resultJson.url,
  httpStatus: resultJson.httpStatus,
  tokenHandle: resultJson.tokenHandle ? mask(resultJson.tokenHandle) : undefined,
  expiresAt: resultJson.expiresAt,
  active: resultJson.active,
  message: resultJson.message,
  executedAt: resultJson.executedAt,
  requestHeaders: resultJson.requestHeaders,
  requestBody: resultJson.requestBody,
  responseBody: resultJson.responseBody,
} : null;

const evidence = {
  testedAt: new Date().toISOString(),
  route: url,
  credentialSource: '/home/ubuntu/upload/DrumWavePlatform-API—Dataprev-Sandbox-Test.postman_collection.json',
  credentialFields: Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, classify(value)])),
  outcome,
  errorText,
  sanitizedResult,
  network,
  screenshotPath,
};
fs.writeFileSync(artifactPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
