import fs from 'node:fs';

const input = '/home/ubuntu/upload/BTGPactualEmpresarUSER.postman_collection.json';
const output = '/home/ubuntu/dwallet-govbr-local/btg_postman_endpoints_summary.md';
const collection = JSON.parse(fs.readFileSync(input, 'utf8'));

const rows = [];

function walk(items, trail = []) {
  for (const item of items ?? []) {
    const name = item.name ?? 'Sem nome';
    if (item.request) {
      const request = item.request;
      const url = typeof request.url === 'string' ? request.url : request.url?.raw ?? '';
      const method = request.method ?? '';
      const authType = request.auth?.type ?? '';
      const bodyMode = request.body?.mode ?? '';
      const rawBody = request.body?.raw ?? '';
      const urlEncoded = request.body?.urlencoded?.map((entry) => `${entry.key}=${entry.value}`).join('&') ?? '';
      rows.push({
        folder: trail.join(' / '),
        name,
        method,
        url,
        authType,
        bodyMode,
        bodyPreview: (rawBody || urlEncoded || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      });
    }
    if (item.item) walk(item.item, [...trail, name]);
  }
}

walk(collection.item);

const relevant = rows.filter((row) => {
  const haystack = `${row.folder} ${row.name} ${row.url}`.toLowerCase();
  return /pix|payment|pagamento|transfer|extrato|statement|balance|saldo|receipt|receb|cobran|qr|barcode|cash|account|banking/.test(haystack);
});

const lines = [];
lines.push('# Resumo dos endpoints BTG Pactual extraídos da coleção Postman');
lines.push('');
lines.push(`Coleção: **${collection.info?.name ?? 'sem nome'}**.`);
lines.push('');
lines.push('| Pasta | Requisição | Método | URL | Auth | Body |');
lines.push('|---|---|---:|---|---|---|');
for (const row of relevant) {
  const safe = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  lines.push(`| ${safe(row.folder)} | ${safe(row.name)} | ${safe(row.method)} | \`${safe(row.url)}\` | ${safe(row.authType)} | ${safe(row.bodyPreview)} |`);
}

lines.push('');
lines.push('## JSON estruturado');
lines.push('');
lines.push('```json');
lines.push(JSON.stringify(relevant, null, 2));
lines.push('```');

fs.writeFileSync(output, lines.join('\n') + '\n');
console.log(`Extraídos ${relevant.length} endpoints relevantes para ${output}`);
