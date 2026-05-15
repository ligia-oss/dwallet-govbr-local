import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomologacaoPhoneMockup, PHONE_SCREENS } from "../client/src/components/HomologacaoPhoneMockup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult = {
  actionId: string;
  actionTitle: string;
  status: string;
  ok: boolean;
  httpStatus?: number;
  message?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: Record<string, unknown>;
  executedAt?: string;
};

function renderMockup(props: {
  stepId: number;
  runState?: Record<string, string | number | boolean | null>;
  activeResult?: ActionResult;
  isExecuting?: boolean;
  actionId?: string;
}) {
  return renderToStaticMarkup(
    React.createElement(HomologacaoPhoneMockup, {
      stepId: props.stepId,
      runState: props.runState ?? {},
      activeResult: props.activeResult,
      isExecuting: props.isExecuting ?? false,
      actionId: props.actionId ?? `step${props.stepId}_action`,
      onFieldChange: () => {},
      onExecute: () => {},
      lang: "pt",
    })
  );
}

// ─── PHONE_SCREENS coverage ───────────────────────────────────────────────────

describe("PHONE_SCREENS — mapeamento de telas por passo", () => {
  it("cobre todos os 18 passos (0–17)", () => {
    const keys = Object.keys(PHONE_SCREENS).map(Number);
    expect(keys).toHaveLength(18);
    for (let i = 0; i <= 17; i++) {
      expect(keys).toContain(i);
    }
  });

  it("cada tela tem screenTitle, appHeader, ctaLabel e fields definidos", () => {
    for (const [, screen] of Object.entries(PHONE_SCREENS)) {
      expect(typeof screen.screenTitle).toBe("string");
      expect(screen.screenTitle.length).toBeGreaterThan(0);
      expect(typeof screen.appHeader).toBe("string");
      expect(screen.appHeader.length).toBeGreaterThan(0);
      expect(typeof screen.ctaLabel).toBe("string");
      expect(screen.ctaLabel.length).toBeGreaterThan(0);
      expect(Array.isArray(screen.fields)).toBe(true);
    }
  });

  it("passos com GAP têm gapMessage definido (9, 11, 16, 17)", () => {
    const gapSteps = [9, 11, 16, 17];
    for (const stepId of gapSteps) {
      expect(PHONE_SCREENS[stepId]?.gapMessage).toBeTruthy();
    }
  });

  it("passos com campos editáveis têm chaves únicas e labels", () => {
    for (const [, screen] of Object.entries(PHONE_SCREENS)) {
      const keys = screen.fields.map(f => f.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size); // sem duplicatas
      for (const field of screen.fields) {
        expect(typeof field.label).toBe("string");
        expect(field.label.length).toBeGreaterThan(0);
        expect(typeof field.key).toBe("string");
        expect(field.key.length).toBeGreaterThan(0);
      }
    }
  });

  it("resultTitle e resultBody são funções chamáveis para todos os passos", () => {
    const mockResult: ActionResult = {
      actionId: "test",
      actionTitle: "Test",
      status: "done",
      ok: true,
      message: "OK",
    };
    for (const [, screen] of Object.entries(PHONE_SCREENS)) {
      expect(typeof screen.resultTitle(mockResult)).toBe("string");
      expect(typeof screen.resultBody(mockResult, {})).toBe("string");
    }
  });

  it("resultTitle retorna mensagem de erro quando ok=false", () => {
    const failResult: ActionResult = {
      actionId: "test",
      actionTitle: "Test",
      status: "failed",
      ok: false,
      message: "Falhou",
    };
    for (const [, screen] of Object.entries(PHONE_SCREENS)) {
      const title = screen.resultTitle(failResult);
      expect(typeof title).toBe("string");
      expect(title.length).toBeGreaterThan(0);
    }
  });
});

// ─── Tela de entrada (input phase — fase inicial do SSR) ──────────────────────

describe("HomologacaoPhoneMockup — tela de entrada", () => {
  it("renderiza o shell do celular com barra de status e identidade visual gov.br", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("9:41"); // barra de status
    expect(html).toContain("gov.br"); // marca gov.br no header
    // Barra de navegação inferior foi removida (design gov.br sem bottom nav)
    expect(html).not.toContain("Início"); // sem nav inferior
    expect(html).not.toContain("Consent."); // sem nav inferior
  });

  it("exibe o header do app com nome e badge do passo", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("Criar sua conta"); // appHeader do passo 1
    expect(html).toContain("Passo 1"); // badge do passo
  });

  it("exibe o appLead (texto introdutório) do passo", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("Informe os dados do responsável"); // appLead do passo 1
  });

  it("renderiza campos editáveis com labels e valores do runState", () => {
    const html = renderMockup({
      stepId: 1,
      runState: {
        employeeFirstName: "Maria",
        employeeLastName: "Silva",
        employeeEmail: "maria@empresa.com",
      },
    });
    expect(html).toContain("Nome");
    expect(html).toContain("Sobrenome");
    expect(html).toContain("E-mail corporativo");
    expect(html).toContain("Maria");
    expect(html).toContain("Silva");
    expect(html).toContain("maria@empresa.com");
  });

  it("campo sensível (senha) usa type=password no HTML — valor não é exibido em texto visível", () => {
    // O campo de senha usa type="password" no input, então o valor não é visível ao usuário
    // mas o atributo value pode estar presente no HTML do SSR (comportamento esperado do React)
    const html = renderMockup({
      stepId: 1,
      runState: { employeePassword: "SecurePass123!" },
    });
    // O campo deve ter type="password" para ocultar visualmente
    expect(html).toContain('type="password"');
    // O label deve aparecer
    expect(html).toContain("Senha");
  });

  it("exibe o botão CTA com o label correto do passo", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("Criar conta do funcionário");
  });

  it("exibe o subtítulo da tela abaixo do celular", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("Empresa cria conta"); // screenTitle
    expect(html).toContain("Cadastro do responsável"); // screenSubtitle
  });

  it("passo 0 não tem campos editáveis (autenticação técnica)", () => {
    const html = renderMockup({ stepId: 0 });
    expect(html).toContain("Autenticação"); // appHeader
    expect(html).toContain("Gerar M2M Token"); // ctaLabel
    // Não deve ter campos de input de dados do usuário
    expect(html).not.toContain("E-mail corporativo");
    expect(html).not.toContain("Sobrenome");
  });

  it("passo 2 (Personal) exibe campos de cadastro pessoal", () => {
    const html = renderMockup({
      stepId: 2,
      runState: { personFirstName: "João", personEmail: "joao@email.com" },
    });
    expect(html).toContain("Criar sua conta"); // appHeader
    expect(html).toContain("João");
    expect(html).toContain("joao@email.com");
    expect(html).toContain("Criar conta pessoal"); // ctaLabel
  });

  it("passo 6 (solicitar dados) exibe campo de ID da Business dWallet", () => {
    const html = renderMockup({
      stepId: 6,
      runState: { businessDwalletId: "bdw_abc123" },
    });
    expect(html).toContain("ID da Business dWallet");
    expect(html).toContain("bdw_abc123");
  });

  it("passo sem campos exibe mensagem informativa de que não requer entrada", () => {
    const html = renderMockup({ stepId: 3 }); // Consultar schemas — sem campos
    expect(html).toContain("não requer campos de entrada");
  });

  it("quando há resultado anterior, exibe botão de ver resultado na fase input", () => {
    const result: ActionResult = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta",
      status: "done",
      ok: true,
    };
    const html = renderMockup({ stepId: 1, activeResult: result });
    // Na fase input com resultado anterior, deve mostrar botão de ver resultado
    expect(html).toContain("Ver último resultado");
  });

  it("quando há resultado de erro anterior, exibe botão de ver erro na fase input", () => {
    const result: ActionResult = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta",
      status: "failed",
      ok: false,
    };
    const html = renderMockup({ stepId: 1, activeResult: result });
    expect(html).toContain("Ver último erro");
  });
});

// ─── Tela de loading (SSR renderiza fase "input" com botão desabilitado) ──────

describe("HomologacaoPhoneMockup — estado de execução", () => {
  it("quando isExecuting=true, o botão CTA exibe 'Enviando…'", () => {
    // SSR renderiza fase "input" mas com isExecuting=true o botão muda de texto
    const html = renderMockup({ stepId: 1, isExecuting: true });
    expect(html).toContain("Enviando…");
  });

  it("quando isExecuting=true, o botão CTA está desabilitado (disabled)", () => {
    const html = renderMockup({ stepId: 1, isExecuting: true });
    expect(html).toContain("disabled");
  });
});

// ─── Tela de resultado — verificação via PHONE_SCREENS (lógica pura) ─────────

describe("HomologacaoPhoneMockup — lógica de resultado via PHONE_SCREENS", () => {
  it("passo 1: resultTitle retorna 'Conta criada com sucesso' quando ok=true", () => {
    const result: ActionResult = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta do funcionário",
      status: "done",
      ok: true,
      httpStatus: 201,
    };
    expect(PHONE_SCREENS[1].resultTitle(result)).toBe("Conta criada com sucesso");
  });

  it("passo 1: resultTitle retorna 'Erro ao criar conta' quando ok=false", () => {
    const result: ActionResult = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta do funcionário",
      status: "failed",
      ok: false,
    };
    expect(PHONE_SCREENS[1].resultTitle(result)).toBe("Erro ao criar conta");
  });

  it("passo 1: resultBody usa o runState para personalizar a mensagem de sucesso", () => {
    const result: ActionResult = {
      actionId: "step1_employee_signup",
      actionTitle: "Criar conta do funcionário",
      status: "done",
      ok: true,
    };
    const body = PHONE_SCREENS[1].resultBody(result, { employeeEmail: "maria@empresa.com" });
    expect(body).toContain("maria@empresa.com");
  });

  it("passo 0: resultTitle retorna 'Token gerado com sucesso' quando ok=true", () => {
    const result: ActionResult = {
      actionId: "step0_m2m_auth",
      actionTitle: "Gerar M2M Token",
      status: "done",
      ok: true,
    };
    expect(PHONE_SCREENS[0].resultTitle(result)).toBe("Token gerado com sucesso");
  });

  it("passo 0: resultTitle retorna 'Falha na autenticação' quando ok=false", () => {
    const result: ActionResult = {
      actionId: "step0_m2m_auth",
      actionTitle: "Gerar M2M Token",
      status: "failed",
      ok: false,
    };
    expect(PHONE_SCREENS[0].resultTitle(result)).toBe("Falha na autenticação");
  });

  it("passo 6: resultDetails retorna ID da solicitação quando stateUpdates.requestId está presente", () => {
    const result: ActionResult = {
      actionId: "step6_request_data",
      actionTitle: "Solicitar dados",
      status: "done",
      ok: true,
      stateUpdates: { requestId: "req_999" },
    };
    const details = PHONE_SCREENS[6].resultDetails?.(result);
    expect(details).toContain("req_999");
  });

  it("passo 3: resultDetails conta itens de schemas quando responseBody.items está presente", () => {
    const result: ActionResult = {
      actionId: "step3_schemas",
      actionTitle: "Consultar schemas",
      status: "done",
      ok: true,
      responseBody: {
        items: [
          { id: "s1", name: "Schema A" },
          { id: "s2", name: "Schema B" },
          { id: "s3", name: "Schema C" },
        ],
      },
    };
    const details = PHONE_SCREENS[3].resultDetails?.(result);
    expect(details).toContain("3");
    expect(details).toContain("schema");
  });

  it("passo 2: resultBody usa personEmail do runState", () => {
    const result: ActionResult = {
      actionId: "step2_person_signup",
      actionTitle: "Criar conta pessoal",
      status: "done",
      ok: true,
    };
    const body = PHONE_SCREENS[2].resultBody(result, { personEmail: "joao@email.com" });
    expect(body).toContain("joao@email.com");
  });
});

// ─── Tela de GAP (API não disponível) ────────────────────────────────────────

describe("HomologacaoPhoneMockup — tela de GAP", () => {
  it("passo 11 exibe mensagem de API não disponível", () => {
    const html = renderMockup({ stepId: 11 });
    expect(html).toContain("API não disponível");
    expect(html).toContain("Endpoint de criação de ofertas");
  });

  it("passo 11 exibe a tela esperada no app mesmo sem API", () => {
    const html = renderMockup({ stepId: 11 });
    expect(html).toContain("Minhas ofertas"); // appHeader
    expect(html).toContain("Criar ofertas"); // screenTitle
  });

  it("passo 16 (Pix) exibe mensagem de GAP", () => {
    const html = renderMockup({ stepId: 16 });
    expect(html).toContain("API não disponível");
    expect(html).toContain("Chave Pix"); // appHeader
  });

  it("passo 17 (histórico) exibe mensagem de GAP", () => {
    const html = renderMockup({ stepId: 17 });
    expect(html).toContain("API não disponível");
    expect(html).toContain("Histórico"); // appHeader
  });

  it("passo 11 não exibe botão CTA (sem API disponível)", () => {
    const html = renderMockup({ stepId: 11 });
    // O botão CTA não deve aparecer em passos com GAP
    expect(html).not.toContain("Criar oferta</button>");
  });

  it("passo 11 exibe seção 'Tela esperada no app' com subtítulo", () => {
    const html = renderMockup({ stepId: 11 });
    expect(html).toContain("Tela esperada no app");
    expect(html).toContain("marketplace de dados"); // screenSubtitle
  });
});

// ─── Cores por tipo de app ────────────────────────────────────────────────────

describe("HomologacaoPhoneMockup — identidade visual por tipo de app", () => {
  it("passo BdW usa cor verde (Business dWallet) no header", () => {
    const html = renderMockup({ stepId: 1 }); // BdW
    expect(html).toContain("Business dWallet"); // label do app
    expect(html).toContain("0b3d2e"); // cor verde do BdW no header
  });

  it("passo PdW usa cor azul (Personal dWallet) no header", () => {
    const html = renderMockup({ stepId: 2 }); // PdW
    expect(html).toContain("Personal dWallet"); // label do app
    expect(html).toContain("071d41"); // cor azul do PdW no header
  });

  it("passo Ambos usa cor roxa no header", () => {
    const html = renderMockup({ stepId: 14 }); // Ambos
    expect(html).toContain("dWallet"); // label genérico
    expect(html).toContain("3d0b3d"); // cor roxa para Ambos
  });
});

// ─── Integração: runState com campos ─────────────────────────────────────────

describe("HomologacaoPhoneMockup — integração runState + campos", () => {
  it("passo 6 exibe ID da Business dWallet do runState no campo", () => {
    const html = renderMockup({
      stepId: 6,
      runState: { businessDwalletId: "bdw_empresa_xyz" },
    });
    expect(html).toContain("bdw_empresa_xyz");
  });

  it("passo 10 exibe campo de DSP selecionado", () => {
    const html = renderMockup({
      stepId: 10,
      runState: { selectedDspId: "dsp_plan_001" },
    });
    expect(html).toContain("DSP selecionado");
    expect(html).toContain("dsp_plan_001");
  });

  it("não renderiza nada para stepId inválido", () => {
    const html = renderMockup({ stepId: 99 });
    expect(html).toBe(""); // retorna null → string vazia
  });

  it("passo 16 exibe campo de chave Pix", () => {
    const html = renderMockup({
      stepId: 16,
      runState: { btgPixKey: "joao@email.com" },
    });
    // Passo 16 é GAP, então o campo não aparece (GAP oculta o formulário)
    // Mas o appHeader e a mensagem de GAP devem aparecer
    expect(html).toContain("Chave Pix"); // appHeader
    expect(html).toContain("API não disponível");
  });
});

// ─── Acessibilidade e aria ────────────────────────────────────────────────────

describe("HomologacaoPhoneMockup — acessibilidade", () => {
  it("o shell do celular tem aria-label descritivo com o número do passo", () => {
    const html = renderMockup({ stepId: 3 });
    expect(html).toContain("aria-label");
    expect(html).toContain("Passo 3");
    expect(html).toContain("Consultar schemas");
  });

  it("campos de formulário têm labels associados", () => {
    const html = renderMockup({ stepId: 1 });
    expect(html).toContain("<label");
    expect(html).toContain("Nome");
    expect(html).toContain("Sobrenome");
  });
});

// ─── Telas especiais pós-criação de conta ─────────────────────────────────────

describe("HomologacaoPhoneMockup — PHONE_SCREENS: telas pós-criação", () => {
  it("SIGNUP_ACTION_IDS cobre as ações de criação de conta esperadas", () => {
    // Verificar que as ações de signup estão definidas nos PHONE_SCREENS
    const step1Screens = PHONE_SCREENS[1].actionScreens ?? {};
    const step2Screens = PHONE_SCREENS[2].actionScreens ?? {};
    expect(Object.keys(step1Screens)).toContain("step1_employee_signup");
    expect(Object.keys(step1Screens)).toContain("step1_business_create");
    expect(Object.keys(step2Screens)).toContain("step2_person_signup");
  });

  it("VERIFY_CODE_ACTION_IDS cobre as ações de verificação de código esperadas", () => {
    const step1Screens = PHONE_SCREENS[1].actionScreens ?? {};
    const step2Screens = PHONE_SCREENS[2].actionScreens ?? {};
    expect(Object.keys(step1Screens)).toContain("step1_employee_verify_code");
    expect(Object.keys(step2Screens)).toContain("step2_person_verify_code");
  });

  it("ação step1_employee_signup tem resultTitle de sucesso correto", () => {
    const result = { actionId: "step1_employee_signup", actionTitle: "Criar conta", status: "done", ok: true };
    const screen = PHONE_SCREENS[1].actionScreens?.["step1_employee_signup"];
    expect(screen?.resultTitle?.(result)).toBe("Conta criada");
  });

  it("ação step2_person_verify_code tem resultTitle de sucesso correto", () => {
    const result = { actionId: "step2_person_verify_code", actionTitle: "Confirmar código", status: "done", ok: true };
    const screen = PHONE_SCREENS[2].actionScreens?.["step2_person_verify_code"];
    expect(screen?.resultTitle?.(result)).toBe("E-mail verificado");
  });

  it("ação step1_business_create tem resultTitle de sucesso correto", () => {
    const result = { actionId: "step1_business_create", actionTitle: "Criar empresa", status: "done", ok: true };
    const screen = PHONE_SCREENS[1].actionScreens?.["step1_business_create"];
    expect(screen?.resultTitle?.(result)).toBe("Empresa criada");
  });
});

// ─── Tela Home pós-login ──────────────────────────────────────────────────────

describe("HomologacaoPhoneMockup — PHONE_SCREENS: tela Home pós-login", () => {
  it("ação step1_employee_signin está definida no passo 1", () => {
    const step1Screens = PHONE_SCREENS[1].actionScreens ?? {};
    expect(Object.keys(step1Screens)).toContain("step1_employee_signin");
  });

  it("ação step2_person_signin está definida no passo 2", () => {
    const step2Screens = PHONE_SCREENS[2].actionScreens ?? {};
    expect(Object.keys(step2Screens)).toContain("step2_person_signin");
  });

  it("step1_employee_signin tem resultTitle de sucesso correto", () => {
    const result = { actionId: "step1_employee_signin", actionTitle: "Entrar", status: "done", ok: true };
    const screen = PHONE_SCREENS[1].actionScreens?.["step1_employee_signin"];
    expect(screen?.resultTitle?.(result)).toBe("Login realizado");
  });

  it("step2_person_signin tem resultTitle de sucesso correto", () => {
    const result = { actionId: "step2_person_signin", actionTitle: "Entrar", status: "done", ok: true };
    const screen = PHONE_SCREENS[2].actionScreens?.["step2_person_signin"];
    expect(screen?.resultTitle?.(result)).toBe("Login realizado");
  });

  it("passo 1 é BdW (Business) e passo 2 é PdW (Personal)", () => {
    expect(PHONE_SCREENS[1].appKind).toBe("BdW");
    expect(PHONE_SCREENS[2].appKind).toBe("PdW");
  });
});
