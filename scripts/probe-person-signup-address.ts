const baseUrl = (process.env.DATAPREV_BASE_URL || "https://api.sandbox.drumwave.com.br").replace(/\/+$/, "");
const apiKey = process.env.DATAPREV_API_KEY || "";

if (!apiKey) {
  throw new Error("DATAPREV_API_KEY ausente no ambiente.");
}

const runId = String(Date.now()).slice(-10);
const variants = [
  {
    name: "sem_address",
    body: {
      email: `probe-no-address-${runId}@example.com`,
      password: "SenhaDireta123!",
      firstName: "Probe",
      lastName: "SemEndereco",
      phoneNumber: "+5511999988888",
    },
  },
  {
    name: "address_state_only",
    body: {
      email: `probe-state-only-${runId}@example.com`,
      password: "SenhaDireta123!",
      firstName: "Probe",
      lastName: "Estado",
      phoneNumber: "+5511999988888",
      address: { state: "DF" },
    },
  },
  {
    name: "address_state_country",
    body: {
      email: `probe-state-country-${runId}@example.com`,
      password: "SenhaDireta123!",
      firstName: "Probe",
      lastName: "Pais",
      phoneNumber: "+5511999988888",
      address: { state: "DF", country: "BR" },
    },
  },
  {
    name: "address_empty_object",
    body: {
      email: `probe-empty-address-${runId}@example.com`,
      password: "SenhaDireta123!",
      firstName: "Probe",
      lastName: "Vazio",
      phoneNumber: "+5511999988888",
      address: {},
    },
  },
];

const results = [];
for (const variant of variants) {
  const response = await fetch(`${baseUrl}/v1/dwallet/person/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-region": "BR",
    },
    body: JSON.stringify(variant.body),
  });
  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("json") ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
  results.push({
    name: variant.name,
    status: response.status,
    ok: response.ok,
    requestBody: { ...variant.body, password: "<REDACTED>" },
    responseBody,
  });
}

console.log(JSON.stringify(results, null, 2));
