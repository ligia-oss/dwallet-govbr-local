import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.WEBDEV_PREVIEW_URL || "http://127.0.0.1:3000";
const runId = String(Date.now()).slice(-10);
const editedEmail = `browser-direct-${runId}@example.com`;
const artifactDir = "validation-artifacts";
mkdirSync(artifactDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const consoleMessages = [];
page.on("console", message => consoleMessages.push({ type: message.type(), text: message.text() }));

await page.goto(`${baseUrl}/personal-govbr`, { waitUntil: "networkidle" });
await page.locator("#direct-entrada-personEmail").waitFor({ state: "visible", timeout: 30000 });
await page.locator("#direct-entrada-personEmail").fill(editedEmail);
await page.getByRole("button", { name: /Criar conta gov\.br de dados/i }).click();
await page.getByText("Requisição enviada pela tela", { exact: false }).waitFor({ state: "visible", timeout: 60000 });

const bodyText = await page.locator("body").innerText();
const bodyTextContent = await page.locator("body").evaluate(element => element.textContent || "");
const inputValue = await page.locator("#direct-entrada-personEmail").inputValue();
const preTexts = await page.locator("pre").allTextContents();
const requestPanelText = preTexts.find(text => text.includes("email") || text.includes("browser-direct")) || "";
const normalizedPageEvidence = [bodyText, bodyTextContent, ...preTexts].join("\n").replace(/\s+/g, "");
const normalizedEditedEmail = editedEmail.replace(/\s+/g, "");
const passwordLeaked = [bodyText, bodyTextContent, ...preTexts].some(text => text.includes("SenhaDireta123") || text.includes("SecurePass123!"));
const containsEditedEmail = inputValue === editedEmail && normalizedPageEvidence.includes(normalizedEditedEmail);
const markerIndex = [bodyText, bodyTextContent, ...preTexts].join("\n").indexOf("browser-direct");
const bodyTextEmailSnippet = markerIndex >= 0 ? [bodyText, bodyTextContent, ...preTexts].join("\n").slice(Math.max(0, markerIndex - 120), markerIndex + 260) : "";
const screenshotPath = `${artifactDir}/direct-edit-browser-evidence.png`;
await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

const result = {
  validatedAt: new Date().toISOString(),
  scenario: "browser-direct-edit-to-ui-executed-api-evidence",
  route: `${baseUrl}/personal-govbr`,
  editedFieldSelector: "#direct-entrada-personEmail",
  editedEmail,
  inputValue,
  containsEditedEmail,
  passwordLeaked,
  requestPanelText,
  normalizedMatch: normalizedPageEvidence.includes(normalizedEditedEmail),
  bodyTextEmailSnippet,
  screenshotPath,
  consoleMessages: consoleMessages.slice(-20),
};

const jsonPath = `${artifactDir}/direct-edit-browser-evidence.json`;
writeFileSync(jsonPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: containsEditedEmail && !passwordLeaked,
  editedEmail,
  containsEditedEmail,
  passwordLeaked,
  jsonPath,
  screenshotPath,
}, null, 2));

if (!containsEditedEmail || passwordLeaked) {
  process.exitCode = 1;
}
