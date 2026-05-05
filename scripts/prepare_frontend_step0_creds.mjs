import fs from 'node:fs';

const exactPath = '/home/ubuntu/dwallet-govbr-local/.tmp_postman_m2m_exact.json';
const data = JSON.parse(fs.readFileSync(exactPath, 'utf8'));
const vars = data.variables || {};

function resolveTemplate(value, depth = 0) {
  if (value === undefined || value === null) return '';
  let text = String(value);
  if (depth > 8) return text;
  let changed = false;
  text = text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const replacement = vars[key];
    if (replacement === undefined || replacement === null) return `{{${key}}}`;
    changed = true;
    return String(replacement);
  });
  return changed ? resolveTemplate(text, depth + 1) : text;
}

function looksPlaceholder(value) {
  const s = String(value ?? '').trim();
  return !s || /<\s*YOUR|YOUR_|TODO|REPLACE|CHANGE_ME|\{\{/i.test(s);
}

const prepared = {
  baseUrl: resolveTemplate(vars.base_url || vars.DATAPREV_BASE_URL || ''),
  apiKey: resolveTemplate(vars.gateway_api_key || vars.apiKey || vars['x-api-key'] || vars.DATAPREV_API_KEY || ''),
  clientId: resolveTemplate(vars.app_client_id || vars.client_id || vars.DATAPREV_CLIENT_ID || ''),
  clientSecret: resolveTemplate(vars.app_client_secret || vars.client_secret || vars.DATAPREV_CLIENT_SECRET || ''),
};

const fields = Object.fromEntries(Object.entries(prepared).map(([key, value]) => [key, {
  present: Boolean(String(value).trim()),
  placeholder: looksPlaceholder(value),
  length: String(value ?? '').length,
  preview: key === 'baseUrl' ? String(value) : (String(value).length ? `${String(value).slice(0, 4)}…${String(value).slice(-4)}` : ''),
}]));

const outPath = '/home/ubuntu/dwallet-govbr-local/.tmp_frontend_step0_creds.json';
fs.writeFileSync(outPath, JSON.stringify(prepared, null, 2));
fs.chmodSync(outPath, 0o600);
console.log(JSON.stringify({ outPath, fields, usable: Object.values(fields).every(f => f.present && !f.placeholder) }, null, 2));
