import { describe, expect, it } from "vitest";
import { sanitizeDataprevEvidence } from "./dataprev";

describe("sanitizeDataprevEvidence", () => {
  it("remove cabeçalhos sensíveis, segredos e tokens das evidências", () => {
    const apiKey = process.env.DATAPREV_API_KEY || "api-key-de-teste";
    const clientSecret = process.env.DATAPREV_CLIENT_SECRET || "client-secret-de-teste";
    const evidence = sanitizeDataprevEvidence({
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.fake.payload",
      "x-api-key": apiKey,
      nested: {
        clientSecret,
        publicValue: `prefixo ${clientSecret} sufixo`,
      },
    });

    const text = JSON.stringify(evidence);
    expect(text).not.toContain(apiKey);
    expect(text).not.toContain(clientSecret);
    expect(text).toContain("<REDACTED>");
    expect(text).toContain("<REDACTED_SECRET>");
  });
});
