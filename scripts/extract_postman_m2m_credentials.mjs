import fs from 'node:fs';

const filePath = '/home/ubuntu/upload/DrumWavePlatform-API—Dataprev-Sandbox-Test.postman_collection.json';
const raw = fs.readFileSync(filePath, 'utf8');
const collection = JSON.parse(raw);

const candidates = [];
const variables = {};

function mask(value) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      return `${u.origin}${u.pathname.replace(/[^/]+/g, segment => segment.length > 8 ? `${segment.slice(0, 4)}…${segment.slice(-2)}` : segment)}`;
    } catch {
      return `${s.slice(0, 18)}…${s.slice(-8)}`;
    }
  }
  if (s.length <= 8) return `${s.slice(0, 2)}…${s.slice(-1)} (${s.length} chars)`;
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
}

function addVariable(key, value, source) {
  if (!key) return;
  const normalized = String(key).trim();
  if (!normalized) return;
  variables[normalized] = { value, source, masked: mask(value) };
}

for (const section of ['variable']) {
  for (const item of collection[section] ?? []) {
    addVariable(item.key ?? item.name, item.value ?? item.initial ?? item.current, `collection.${section}`);
  }
}

function walk(items, path = []) {
  for (const item of items ?? []) {
    const nextPath = [...path, item.name].filter(Boolean);
    if (Array.isArray(item.item)) {
      walk(item.item, nextPath);
      continue;
    }
    const req = item.request;
    if (!req) continue;
    const method = req.method || '';
    const urlRaw = typeof req.url === 'string' ? req.url : (req.url?.raw ?? '');
    const headers = Object.fromEntries((req.header ?? []).map(h => [String(h.key || '').toLowerCase(), h.value]));
    const bodyRaw = req.body?.raw ?? '';
    const haystack = `${nextPath.join(' / ')} ${method} ${urlRaw} ${JSON.stringify(headers)} ${bodyRaw}`.toLowerCase();
    if (haystack.includes('m2m') || haystack.includes('oauth') || haystack.includes('token') || haystack.includes('auth')) {
      candidates.push({
        name: nextPath.join(' / '),
        method,
        urlRaw,
        maskedUrl: mask(urlRaw),
        headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, mask(v)])),
        bodyKeys: bodyRaw ? Object.keys(safeJson(bodyRaw)).sort() : [],
        hasRawBody: Boolean(bodyRaw),
      });
      for (const [k, v] of Object.entries(headers)) {
        if (/api|key|client|secret|token/i.test(k)) addVariable(k, v, `request.header:${nextPath.join(' / ')}`);
      }
      const parsed = safeJson(bodyRaw);
      for (const [k, v] of Object.entries(parsed)) {
        if (/api|key|client|secret|token|url|base/i.test(k)) addVariable(k, v, `request.body:${nextPath.join(' / ')}`);
      }
    }
  }
}

function safeJson(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

walk(collection.item ?? []);

const interestingVariables = Object.fromEntries(
  Object.entries(variables)
    .filter(([key]) => /url|base|api|key|client|secret|token|auth|oauth/i.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => [key, { masked: entry.masked, source: entry.source }])
);

const actual = Object.fromEntries(Object.entries(variables).map(([key, entry]) => [key, entry.value]));
const exactOut = '/home/ubuntu/dwallet-govbr-local/.tmp_postman_m2m_exact.json';
fs.writeFileSync(exactOut, JSON.stringify({ variables: actual, candidates }, null, 2));
fs.chmodSync(exactOut, 0o600);

console.log(JSON.stringify({
  collection: collection.info?.name,
  candidateCount: candidates.length,
  candidates: candidates.map(c => ({ name: c.name, method: c.method, maskedUrl: c.maskedUrl, bodyKeys: c.bodyKeys, headers: c.headers })),
  interestingVariables,
  exactOut,
}, null, 2));
