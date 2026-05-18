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
    const step10Actions = metadata.steps.find(step => step.id === 10)?.actions;
    expect(step10Actions?.some(action => action.id === "step10_dsp_details")).toBe(true);
    expect(step10Actions?.map(action => ({ id: action.id, apiClassification: action.apiClassification }))).toEqual([
      { id: "step10_commercial_dsps", apiClassification: "10.a" },
      { id: "step10_standard_dsps", apiClassification: "10.b" },
      { id: "step10_dsp_details", apiClassification: "10.c" },
      { id: "step10_create_dsp_account", apiClassification: "10.d" },
    ]);
    expect(metadata.credentialsConfigured).toBe(true);
    expect(metadata.steps.some(step => step.app === "Personal")).toBe(true);
    expect(metadata.steps.some(step => step.app === "Business")).toBe(true);
    expect(metadata.steps.some(step => step.status === "gap")).toBe(true);
  });

  it("passo 4 contém as três ações na ordem correta: listar produtos, adicionar ao carrinho e criar CVS", async () => {
    const caller = appRouter.createCaller(ctx);
    const metadata = await caller.dataprev.metadata();
    const step4 = metadata.steps.find(step => step.id === 4);
    expect(step4).toBeDefined();
    const step4ActionIds = step4!.actions.map(a => a.id);
    expect(step4ActionIds).toEqual([
      "step4_list_products",
      "step4_add_dsku_to_cart",
      "step4_create_commercial_value_schema",
    ]);
  });

  it("step4_add_dsku_to_cart requer produto selecionado e businessDwalletId", async () => {
    const caller = appRouter.createCaller(ctx);
    // Sem produto selecionado (com token simulado para passar a guarda de requiresUser)
    const evidenceNoProduct = await caller.dataprev.executeAction({
      actionId: "step4_add_dsku_to_cart",
      state: { businessDwalletId: "bdw-123", employeeTokenHandle: "__test_skip__" },
    });
    expect(evidenceNoProduct.ok).toBe(false);
    expect(evidenceNoProduct.message).toContain("produto");
    // Sem businessDwalletId
    const evidenceNoBdw = await caller.dataprev.executeAction({
      actionId: "step4_add_dsku_to_cart",
      state: { selectedProductDsku: "dsku-abc", employeeTokenHandle: "__test_skip__" },
    });
    expect(evidenceNoBdw.ok).toBe(false);
    expect(evidenceNoBdw.message).toContain("Business dWallet");
  });

  it("step4_create_commercial_value_schema requer produto e valueSchemaSid", async () => {
    const caller = appRouter.createCaller(ctx);
    // Sem produto (com token simulado para passar a guarda de requiresUser)
    const evidenceNoProduct = await caller.dataprev.executeAction({
      actionId: "step4_create_commercial_value_schema",
      state: { valueSchemaSid: "vs-123", employeeTokenHandle: "__test_skip__" },
    });
    expect(evidenceNoProduct.ok).toBe(false);
    expect(evidenceNoProduct.message).toContain("produto");
    // Sem valueSchemaSid
    const evidenceNoSchema = await caller.dataprev.executeAction({
      actionId: "step4_create_commercial_value_schema",
      state: { selectedProductDsku: "dsku-abc", employeeTokenHandle: "__test_skip__" },
    });
    expect(evidenceNoSchema.ok).toBe(false);
    expect(evidenceNoSchema.message).toContain("Standard Value Schema");
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
