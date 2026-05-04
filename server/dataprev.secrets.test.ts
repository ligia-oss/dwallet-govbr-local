import { describe, expect, it } from "vitest";

const requiredEnv = [
  "DATAPREV_BASE_URL",
  "DATAPREV_API_KEY",
  "DATAPREV_CLIENT_ID",
  "DATAPREV_CLIENT_SECRET",
] as const;

describe("credenciais Dataprev/DrumWave", () => {
  it("obtém token M2M com as variáveis de ambiente do servidor", async () => {
    for (const key of requiredEnv) {
      expect(process.env[key], `${key} deve estar configurada`).toBeTruthy();
    }

    const baseUrl = String(process.env.DATAPREV_BASE_URL).replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/v1/auth/token/iam/authn/services/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": String(process.env.DATAPREV_API_KEY),
      },
      body: JSON.stringify({
        client_id: process.env.DATAPREV_CLIENT_ID,
        client_secret: process.env.DATAPREV_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    const payload = await response.json().catch(() => ({}));

    expect(response.status, JSON.stringify(payload)).toBeGreaterThanOrEqual(200);
    expect(response.status, JSON.stringify(payload)).toBeLessThan(300);
    expect(payload).toHaveProperty("access_token");
    expect(typeof payload.access_token).toBe("string");
    expect(payload.access_token.length).toBeGreaterThan(20);
  }, 30_000);
});
