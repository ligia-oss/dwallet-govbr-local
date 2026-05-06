import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const ctx = {
  req: {} as any,
  res: {
    clearCookie: () => undefined,
  } as any,
  user: null,
};

describe("dataprevRouter", () => {
  it("expõe os passos da jornada com aplicações Personal e Business", async () => {
    const caller = appRouter.createCaller(ctx);
    const metadata = await caller.dataprev.metadata();

    expect(metadata.steps).toHaveLength(17);
    expect(metadata.steps.find(step => step.id === 10)?.actions.some(action => action.id === "step10_dsp_details")).toBe(true);
    expect(metadata.credentialsConfigured).toBe(true);
    expect(metadata.steps.some(step => step.app === "Personal")).toBe(true);
    expect(metadata.steps.some(step => step.app === "Business")).toBe(true);
    expect(metadata.steps.some(step => step.status === "gap")).toBe(true);
  });

  it("registra como evidência uma etapa sem API externa sem chamar serviços remotos", async () => {
    const caller = appRouter.createCaller(ctx);
    const evidence = await caller.dataprev.executeAction({
      actionId: "step16_accounts_gap",
      state: {},
    });

    expect(evidence.status).toBe("not_executable");
    expect(evidence.ok).toBe(true);
    expect(evidence.missingReason).toContain("accounts");
  });
});
