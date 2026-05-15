import React, { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RunState = Record<string, string | number | boolean | null>;

type ActionResult = {
  actionId: string;
  actionTitle: string;
  status: string;
  ok: boolean;
  httpStatus?: number;
  method?: string;
  url?: string;
  message?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: Record<string, unknown>;
  executedAt?: string;
};

type PhoneField = {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  sensitive?: boolean;
};

type PhoneScreenConfig = {
  stepId: number;
  actionId?: string;
  appKind: "BdW" | "PdW" | "BdW/PdW" | "Ambos";
  screenTitle: string;
  screenSubtitle: string;
  appHeader: string;
  appLead: string;
  ctaLabel: string;
  fields: PhoneField[];
  resultTitle: (result: ActionResult) => string;
  resultBody: (result: ActionResult, state: RunState) => string;
  resultDetails?: (result: ActionResult) => string | undefined;
  gapMessage?: string;
  // Sub-telas por ação (para passos com múltiplas ações sequenciais)
  actionScreens?: Record<string, Partial<Omit<PhoneScreenConfig, "actionScreens" | "stepId" | "appKind">>>;
};

// ─── Per-step screen configurations ──────────────────────────────────────────

export const PHONE_SCREENS: Record<number, PhoneScreenConfig> = {
  0: {
    stepId: 0,
    appKind: "BdW/PdW",
    screenTitle: "Autenticação técnica",
    screenSubtitle: "Pré-requisito de sandbox — não visível ao usuário final",
    appHeader: "Autenticação",
    appLead: "Gerando credencial de acesso à sandbox Dataprev.",
    ctaLabel: "Gerar M2M Token",
    fields: [],
    resultTitle: (r) => r.ok ? "Token gerado com sucesso" : "Falha na autenticação",
    resultBody: (r) => r.ok
      ? "Token M2M ativo. Todas as chamadas protegidas usarão este token como Bearer."
      : r.message ?? "Verifique as credenciais e tente novamente.",
  },
  1: {
    stepId: 1,
    appKind: "BdW",
    screenTitle: "Empresa cria conta",
    screenSubtitle: "Cadastro do responsável e criação da Business dWallet",
    appHeader: "Criar sua conta",
    appLead: "Informe os dados do responsável para iniciar a Business dWallet.",
    ctaLabel: "Criar conta do funcionário",
    fields: [
      { key: "employeeFirstName", label: "Nome", placeholder: "Maria", required: true },
      { key: "employeeLastName", label: "Sobrenome", placeholder: "Silva", required: true },
      { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@empresa.com", type: "email", required: true },
      { key: "employeePassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
    ],
    resultTitle: (r) => r.ok ? "Conta criada com sucesso" : "Erro ao criar conta",
    resultBody: (r, s) => r.ok
      ? `Conta criada para ${String(s.employeeEmail ?? "o responsável")}. Próximo passo: verificar o e-mail.`
      : r.message ?? "Verifique os dados e tente novamente.",
    resultDetails: (r) => r.ok ? "O código de verificação foi enviado para o e-mail cadastrado." : undefined,
    actionScreens: {
      step1_employee_signup: {
        appHeader: "Criar sua conta",
        appLead: "Informe os dados do responsável para iniciar a Business dWallet.",
        ctaLabel: "Criar conta do funcionário",
        fields: [
          { key: "employeeFirstName", label: "Nome", placeholder: "Maria", required: true },
          { key: "employeeLastName", label: "Sobrenome", placeholder: "Silva", required: true },
          { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@empresa.com", type: "email", required: true },
          { key: "employeePassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
        ],
        resultTitle: (r) => r.ok ? "Conta criada" : "Erro ao criar conta",
        resultBody: (r, s) => r.ok
          ? `Conta criada para ${String(s.employeeEmail ?? "o responsável")}. Verifique o e-mail.`
          : r.message ?? "Verifique os dados e tente novamente.",
      },
      step1_employee_send_code: {
        appHeader: "Verificação de e-mail",
        appLead: "Um código foi enviado para o seu e-mail corporativo. Aguarde e informe-o no próximo passo.",
        ctaLabel: "Enviar código de verificação",
        fields: [],
        resultTitle: (r) => r.ok ? "Código enviado" : "Erro ao enviar código",
        resultBody: (r, s) => r.ok
          ? `Código enviado para ${String(s.employeeEmail ?? "o e-mail")}. Informe-o no próximo passo.`
          : r.message ?? "Não foi possível enviar o código.",
      },
      step1_employee_verify_code: {
        appHeader: "Confirmar código",
        appLead: "Informe o código de verificação recebido no e-mail corporativo.",
        ctaLabel: "Confirmar código",
        fields: [
          { key: "employeeVerificationCode", label: "Código de verificação (e-mail)", placeholder: "Digite o código recebido", required: true },
        ],
        resultTitle: (r) => r.ok ? "E-mail verificado" : "Código inválido",
        resultBody: (r) => r.ok
          ? "E-mail corporativo verificado com sucesso. Próximo passo: fazer login."
          : r.message ?? "Código inválido ou expirado. Solicite um novo código.",
      },
      step1_employee_signin: {
        appHeader: "Entrar na conta",
        appLead: "Faça login com as credenciais do colaborador Business.",
        ctaLabel: "Entrar",
        fields: [
          { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@empresa.com", type: "email", required: true },
          { key: "employeePassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
        ],
        resultTitle: (r) => r.ok ? "Login realizado" : "Erro no login",
        resultBody: (r) => r.ok
          ? "Login realizado com sucesso. Token de colaborador salvo."
          : r.message ?? "Credenciais inválidas.",
      },
      step1_business_create: {
        appHeader: "Criar empresa",
        appLead: "Informe os dados da empresa para criar a Business dWallet.",
        ctaLabel: "Criar Business dWallet",
        fields: [
          { key: "businessName", label: "Nome da empresa", placeholder: "Empresa Teste LTDA", required: false },
          { key: "businessCnpj", label: "CNPJ", placeholder: "00.000.000/0001-00", required: false },
        ],
        resultTitle: (r) => r.ok ? "Empresa criada" : "Erro ao criar empresa",
        resultBody: (r, s) => r.ok
          ? `Business dWallet criada para ${String(s.businessName ?? "a empresa")}.`
          : r.message ?? "Não foi possível criar a empresa.",
      },
    },
  },
  2: {
    stepId: 2,
    appKind: "PdW",
    screenTitle: "Pessoa cria carteira",
    screenSubtitle: "Cadastro da pessoa física e criação da Personal dWallet",
    appHeader: "Criar sua conta",
    appLead: "Informe seus dados para criar a carteira de dados pessoal.",
    ctaLabel: "Criar conta pessoal",
    fields: [
      { key: "personFirstName", label: "Nome", placeholder: "João", required: true },
      { key: "personLastName", label: "Sobrenome", placeholder: "Santos", required: true },
      { key: "personEmail", label: "E-mail", placeholder: "joao@email.com", type: "email", required: true },
      { key: "personPassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
      { key: "personCpf", label: "CPF", placeholder: "000.000.000-00", required: false },
    ],
    resultTitle: (r) => r.ok ? "Conta criada com sucesso" : "Erro ao criar conta",
    resultBody: (r, s) => r.ok
      ? `Conta criada para ${String(s.personEmail ?? "a pessoa")}. Verifique o e-mail para continuar.`
      : r.message ?? "Verifique os dados e tente novamente.",
    actionScreens: {
      step2_person_signup: {
        appHeader: "Criar sua conta",
        appLead: "Informe seus dados para criar a carteira de dados pessoal.",
        ctaLabel: "Criar conta pessoal",
        fields: [
          { key: "personFirstName", label: "Nome", placeholder: "João", required: true },
          { key: "personLastName", label: "Sobrenome", placeholder: "Santos", required: true },
          { key: "personEmail", label: "E-mail", placeholder: "joao@email.com", type: "email", required: true },
          { key: "personPassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
          { key: "personCpf", label: "CPF", placeholder: "000.000.000-00", required: false },
        ],
        resultTitle: (r) => r.ok ? "Conta criada" : "Erro ao criar conta",
        resultBody: (r, s) => r.ok
          ? `Conta criada para ${String(s.personEmail ?? "a pessoa")}. Verifique o e-mail.`
          : r.message ?? "Verifique os dados e tente novamente.",
      },
      step2_person_send_code: {
        appHeader: "Verificação de e-mail",
        appLead: "Um código será enviado para o seu e-mail pessoal. Aguarde e informe-o no próximo passo.",
        ctaLabel: "Enviar código de verificação",
        fields: [],
        resultTitle: (r) => r.ok ? "Código enviado" : "Erro ao enviar código",
        resultBody: (r, s) => r.ok
          ? `Código enviado para ${String(s.personEmail ?? "o e-mail")}. Informe-o no próximo passo.`
          : r.message ?? "Não foi possível enviar o código.",
      },
      step2_person_verify_code: {
        appHeader: "Confirmar código",
        appLead: "Informe o código de verificação recebido no seu e-mail pessoal.",
        ctaLabel: "Confirmar código",
        fields: [
          { key: "personVerificationCode", label: "Código de verificação (e-mail)", placeholder: "Digite o código recebido", required: true },
        ],
        resultTitle: (r) => r.ok ? "E-mail verificado" : "Código inválido",
        resultBody: (r) => r.ok
          ? "E-mail pessoal verificado com sucesso. Próximo passo: fazer login."
          : r.message ?? "Código inválido ou expirado. Solicite um novo código.",
      },
      step2_person_signin: {
        appHeader: "Entrar na carteira",
        appLead: "Faça login com as credenciais da sua Personal dWallet.",
        ctaLabel: "Entrar",
        fields: [
          { key: "personEmail", label: "E-mail", placeholder: "joao@email.com", type: "email", required: true },
          { key: "personPassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true, sensitive: true },
        ],
        resultTitle: (r) => r.ok ? "Login realizado" : "Erro no login",
        resultBody: (r) => r.ok
          ? "Login realizado com sucesso. Token pessoal salvo."
          : r.message ?? "Credenciais inválidas.",
      },
    },
  },
  3: {
    stepId: 3,
    appKind: "BdW",
    screenTitle: "Consultar schemas",
    screenSubtitle: "Empresa consulta os Standard Value Schemas disponíveis",
    appHeader: "Catálogo de schemas",
    appLead: "Veja os schemas de dados disponíveis para criar produtos.",
    ctaLabel: "Consultar schemas",
    fields: [],
    resultTitle: (r) => r.ok ? "Schemas carregados" : "Erro ao consultar schemas",
    resultBody: (r) => r.ok
      ? "Lista de Standard Value Schemas retornada pela sandbox."
      : r.message ?? "Não foi possível carregar os schemas.",
    resultDetails: (r: ActionResult): string | undefined => {
      if (!r.ok) return undefined;
      const body = r.responseBody as Record<string, unknown> | undefined;
      if (!body) return undefined;
      const items = (body.items ?? body.data ?? body.valueSchemas ?? body.schemas) as unknown[];
      if (Array.isArray(items) && items.length > 0) {
        return `${items.length} schema(s) disponível(is).`;
      }
      return "Resposta recebida da sandbox.";
    },
  },
  4: {
    stepId: 4,
    appKind: "BdW",
    screenTitle: "Produtos da empresa",
    screenSubtitle: "Empresa consulta e cadastra produtos de dados",
    appHeader: "Meus produtos",
    appLead: "Gerencie os produtos de dados da sua empresa.",
    ctaLabel: "Consultar produtos",
    fields: [],
    resultTitle: (r) => r.ok ? "Produtos carregados" : "Erro ao consultar produtos",
    resultBody: (r) => r.ok
      ? "Catálogo de produtos retornado pela sandbox."
      : r.message ?? "Não foi possível carregar os produtos.",
  },
  5: {
    stepId: 5,
    appKind: "PdW",
    screenTitle: "Explorar produtos",
    screenSubtitle: "Pessoa consulta produtos e empresas disponíveis",
    appHeader: "Marketplace",
    appLead: "Descubra produtos e empresas que oferecem serviços de dados.",
    ctaLabel: "Ver produtos disponíveis",
    fields: [],
    resultTitle: (r) => r.ok ? "Catálogo carregado" : "Erro ao carregar catálogo",
    resultBody: (r) => r.ok
      ? "Produtos e empresas disponíveis na sandbox."
      : r.message ?? "Não foi possível carregar o catálogo.",
  },
  6: {
    stepId: 6,
    appKind: "PdW",
    screenTitle: "Solicitar dados",
    screenSubtitle: "Pessoa solicita dados a uma empresa",
    appHeader: "Solicitar dados",
    appLead: "Envie uma solicitação de dados para a empresa selecionada.",
    ctaLabel: "Enviar solicitação",
    fields: [
      { key: "businessDwalletId", label: "ID da Business dWallet", placeholder: "Preenchido automaticamente", required: true },
      { key: "valueSchemaSid", label: "Schema selecionado", placeholder: "Preenchido automaticamente", required: false },
    ],
    resultTitle: (r) => r.ok ? "Solicitação enviada" : "Erro ao enviar solicitação",
    resultBody: (r, s) => r.ok
      ? `Solicitação enviada para a empresa ${String(s.businessDwalletId ?? "selecionada")}.`
      : r.message ?? "Não foi possível enviar a solicitação.",
    resultDetails: (r: ActionResult): string | undefined => {
      if (!r.ok) return undefined;
      const upd = r.stateUpdates as Record<string, unknown> | undefined;
      if (upd?.requestId) return `ID da solicitação: ${String(upd.requestId)}`;
      return "Aguarde a resposta da empresa.";
    },
  },
  7: {
    stepId: 7,
    appKind: "BdW",
    screenTitle: "Responder solicitação",
    screenSubtitle: "Empresa consulta e aceita ou rejeita solicitações de dados",
    appHeader: "Solicitações recebidas",
    appLead: "Gerencie as solicitações de dados enviadas pelas pessoas.",
    ctaLabel: "Consultar solicitações",
    fields: [
      { key: "requestId", label: "ID da solicitação", placeholder: "Preenchido automaticamente", required: false },
    ],
    resultTitle: (r) => r.ok ? "Ação executada" : "Erro ao processar solicitação",
    resultBody: (r) => r.ok
      ? "Solicitação processada com sucesso."
      : r.message ?? "Não foi possível processar a solicitação.",
    actionScreens: {
      step7_list_business_requests: {
        appHeader: "Solicitações recebidas",
        appLead: "Consulte as solicitações de dados enviadas pelas pessoas.",
        ctaLabel: "Consultar solicitações",
        fields: [],
        resultTitle: (r) => r.ok ? "Solicitações carregadas" : "Erro ao consultar",
        resultBody: (r) => r.ok
          ? "Lista de solicitações de dados retornada."
          : r.message ?? "Não foi possível carregar as solicitações.",
      },
      step7_accept_data_request: {
        appHeader: "Aceitar solicitação",
        appLead: "Confirme o aceite da solicitação de dados selecionada.",
        ctaLabel: "Aceitar solicitação",
        fields: [
          { key: "dataRequestId", label: "ID da solicitação", placeholder: "Preenchido automaticamente", required: false },
        ],
        resultTitle: (r) => r.ok ? "Solicitação aceita" : "Erro ao aceitar",
        resultBody: (r) => r.ok
          ? "Solicitação de dados aceita com sucesso."
          : r.message ?? "Não foi possível aceitar a solicitação.",
      },
      step7_reject_data_request: {
        appHeader: "Rejeitar solicitação",
        appLead: "Confirme a rejeição da solicitação de dados selecionada.",
        ctaLabel: "Rejeitar solicitação",
        fields: [
          { key: "dataRequestId", label: "ID da solicitação", placeholder: "Preenchido automaticamente", required: false },
        ],
        resultTitle: (r) => r.ok ? "Solicitação rejeitada" : "Erro ao rejeitar",
        resultBody: (r) => r.ok
          ? "Solicitação de dados rejeitada com sucesso."
          : r.message ?? "Não foi possível rejeitar a solicitação.",
      },
    },
  },
  8: {
    stepId: 8,
    appKind: "PdW",
    screenTitle: "Certificados pessoais",
    screenSubtitle: "Pessoa consulta certificados da carteira pessoal",
    appHeader: "Meus certificados",
    appLead: "Veja os certificados de dados associados à sua carteira.",
    ctaLabel: "Ver certificados",
    fields: [],
    resultTitle: (r) => r.ok ? "Certificados carregados" : "Erro ao carregar certificados",
    resultBody: (r) => r.ok
      ? "Certificados da Personal dWallet retornados."
      : r.message ?? "Não foi possível carregar os certificados.",
  },
  9: {
    stepId: 9,
    appKind: "BdW",
    screenTitle: "Certificados empresariais",
    screenSubtitle: "Tela de certificados da empresa — endpoint não disponível nesta sandbox",
    appHeader: "Certificados da empresa",
    appLead: "Certificados associados à carteira empresarial (Business dWallet).",
    ctaLabel: "Ver certificados",
    fields: [],
    gapMessage: "Endpoint de certificados empresariais não disponível nesta sandbox. A tela permanece visível na jornada para documentar o passo.",
    resultTitle: (r) => r.ok ? "Certificados carregados" : "API não disponível",
    resultBody: (r) => r.ok
      ? "Certificados da Business dWallet retornados."
      : r.message ?? "Endpoint não disponível nesta sandbox.",
  },
  10: {
    stepId: 10,
    appKind: "PdW",
    screenTitle: "Planos de poupança",
    screenSubtitle: "Pessoa consulta e adere a um Data Savings Plan",
    appHeader: "Planos DSP",
    appLead: "Escolha um plano de poupança de dados para sua carteira.",
    ctaLabel: "Ver planos disponíveis",
    fields: [
      { key: "selectedDspId", label: "DSP selecionado", placeholder: "Preenchido ao escolher um plano", required: false },
    ],
    resultTitle: (r) => r.ok ? "Plano carregado" : "Erro ao carregar planos",
    resultBody: (r) => r.ok
      ? "Planos DSP disponíveis na sandbox."
      : r.message ?? "Não foi possível carregar os planos.",
    actionScreens: {
      step10_commercial_dsps: {
        appHeader: "Planos comerciais",
        appLead: "Veja os planos DSP comerciais disponíveis.",
        ctaLabel: "Consultar planos comerciais",
        fields: [],
        resultTitle: (r) => r.ok ? "Planos comerciais" : "Erro ao carregar",
        resultBody: (r) => r.ok ? "Planos DSP comerciais retornados." : r.message ?? "Não foi possível carregar.",
      },
      step10_standard_dsps: {
        appHeader: "Planos padrão",
        appLead: "Veja os planos DSP padrão disponíveis.",
        ctaLabel: "Consultar planos padrão",
        fields: [],
        resultTitle: (r) => r.ok ? "Planos padrão" : "Erro ao carregar",
        resultBody: (r) => r.ok ? "Planos DSP padrão retornados." : r.message ?? "Não foi possível carregar.",
      },
      step10_dsp_details: {
        appHeader: "Detalhes do plano",
        appLead: "Veja os detalhes do plano DSP selecionado.",
        ctaLabel: "Ver detalhes do plano",
        fields: [
          { key: "selectedDspId", label: "ID do plano", placeholder: "Preenchido automaticamente", required: false },
        ],
        resultTitle: (r) => r.ok ? "Detalhes carregados" : "Erro ao carregar",
        resultBody: (r) => r.ok ? "Detalhes do plano DSP retornados." : r.message ?? "Não foi possível carregar.",
      },
      step10_create_dsp_account: {
        appHeader: "Aderir ao plano",
        appLead: "Confirme a adesão ao plano DSP selecionado.",
        ctaLabel: "Aderir ao plano",
        fields: [
          { key: "selectedDspId", label: "DSP selecionado", placeholder: "Preenchido ao escolher um plano", required: false },
        ],
        resultTitle: (r) => r.ok ? "Adesão realizada" : "Erro ao aderir",
        resultBody: (r) => r.ok ? "Conta DSP criada com sucesso." : r.message ?? "Não foi possível aderir ao plano.",
      },
    },
  },
  11: {
    stepId: 11,
    appKind: "BdW",
    screenTitle: "Criar ofertas",
    screenSubtitle: "Empresa cria ofertas no marketplace de dados",
    appHeader: "Minhas ofertas",
    appLead: "Crie e gerencie ofertas de dados para o marketplace.",
    ctaLabel: "Criar oferta",
    fields: [],
    gapMessage: "Endpoint de criação de ofertas não disponível na sandbox atual. A tela permanece visível na jornada para documentar o passo.",
    resultTitle: (r) => r.ok ? "Oferta criada" : "API não disponível",
    resultBody: (r) => r.ok
      ? "Oferta publicada no marketplace."
      : r.message ?? "Endpoint não disponível nesta sandbox.",
  },
  12: {
    stepId: 12,
    appKind: "PdW",
    screenTitle: "Visualizar ofertas",
    screenSubtitle: "Pessoa visualiza ofertas disponíveis no marketplace",
    appHeader: "Ofertas disponíveis",
    appLead: "Veja as ofertas de dados disponíveis para você.",
    ctaLabel: "Ver ofertas",
    fields: [
      { key: "offerId", label: "ID da oferta", placeholder: "Preenchido ao selecionar uma oferta", required: false },
    ],
    resultTitle: (r) => r.ok ? "Ofertas carregadas" : "Erro ao carregar ofertas",
    resultBody: (r) => r.ok
      ? "Ofertas disponíveis no marketplace."
      : r.message ?? "Não foi possível carregar as ofertas.",
  },
  13: {
    stepId: 13,
    appKind: "PdW",
    screenTitle: "Aceitar oferta",
    screenSubtitle: "Pessoa aceita ou rejeita uma oferta do marketplace",
    appHeader: "Confirmar oferta",
    appLead: "Revise os termos e confirme sua decisão sobre a oferta.",
    ctaLabel: "Aceitar oferta",
    fields: [
      { key: "offerId", label: "ID da oferta", placeholder: "Preenchido automaticamente", required: true },
    ],
    resultTitle: (r) => r.ok ? "Decisão registrada" : "Erro ao processar oferta",
    resultBody: (r) => r.ok
      ? "Sua decisão sobre a oferta foi registrada."
      : r.message ?? "Não foi possível processar a oferta.",
  },
  14: {
    stepId: 14,
    appKind: "Ambos",
    screenTitle: "Extrato da carteira",
    screenSubtitle: "Histórico de movimentações financeiras",
    appHeader: "Extrato",
    appLead: "Acompanhe as movimentações da sua carteira.",
    ctaLabel: "Ver extrato",
    fields: [],
    resultTitle: (r) => r.ok ? "Extrato carregado" : "Erro ao carregar extrato",
    resultBody: (r) => r.ok
      ? "Movimentações da carteira retornadas."
      : r.message ?? "Não foi possível carregar o extrato.",
  },
  15: {
    stepId: 15,
    appKind: "Ambos",
    screenTitle: "Solicitar resgate",
    screenSubtitle: "Solicitação de resgate de saldo da carteira",
    appHeader: "Resgatar saldo",
    appLead: "Solicite o resgate do saldo disponível na carteira.",
    ctaLabel: "Solicitar resgate",
    fields: [],
    resultTitle: (r) => r.ok ? "Resgate solicitado" : "Erro ao solicitar resgate",
    resultBody: (r) => r.ok
      ? "Solicitação de resgate registrada."
      : r.message ?? "Não foi possível solicitar o resgate.",
  },
  16: {
    stepId: 16,
    appKind: "Ambos",
    screenTitle: "Cadastrar Pix / Conta",
    screenSubtitle: "Registro de chave Pix ou conta para recebimentos",
    appHeader: "Chave Pix",
    appLead: "Vincule uma chave Pix ou conta bancária à sua carteira.",
    ctaLabel: "Cadastrar chave",
    fields: [
      { key: "btgPixKey", label: "Chave Pix", placeholder: "cpf, e-mail ou telefone", required: false },
    ],
    gapMessage: "Cadastro de chave Pix não disponível na sandbox atual. A tela permanece visível na jornada.",
    resultTitle: (r) => r.ok ? "Chave cadastrada" : "API não disponível",
    resultBody: (r) => r.ok
      ? "Chave Pix vinculada à carteira."
      : r.message ?? "Endpoint não disponível nesta sandbox.",
  },
  17: {
    stepId: 17,
    appKind: "Ambos",
    screenTitle: "Histórico de resgates",
    screenSubtitle: "Consulta ao histórico de resgates realizados",
    appHeader: "Histórico",
    appLead: "Veja todos os resgates realizados pela carteira.",
    ctaLabel: "Ver histórico",
    fields: [],
    gapMessage: "Histórico de resgates não disponível na sandbox atual. A tela permanece visível na jornada.",
    resultTitle: (r) => r.ok ? "Histórico carregado" : "API não disponível",
    resultBody: (r) => r.ok
      ? "Histórico de resgates retornado."
      : r.message ?? "Endpoint não disponível nesta sandbox.",
  },
};

// ─── App color by kind ────────────────────────────────────────────────────────

function getAppColors(appKind: PhoneScreenConfig["appKind"]) {
  if (appKind === "BdW") return { bg: "#0b3d2e", accent: "#168821", badge: "bg-emerald-600" };
  if (appKind === "PdW") return { bg: "#071d41", accent: "#1351b4", badge: "bg-blue-600" };
  return { bg: "#3d0b3d", accent: "#7c3aed", badge: "bg-purple-600" };
}

// ─── Response renderer ────────────────────────────────────────────────────────

function ResponseRenderer({ result, screen, runState }: {
  result: ActionResult;
  screen: PhoneScreenConfig;
  runState: RunState;
}) {
  const body = result.responseBody as Record<string, unknown> | null | undefined;

  // Extract list items from common response shapes
  const extractItems = (data: unknown): Record<string, unknown>[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data.slice(0, 5) as Record<string, unknown>[];
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidates = [obj.items, obj.data, obj.results, obj.valueSchemas, obj.schemas,
        obj.products, obj.dskus, obj.plans, obj.dataSavingsPlans, obj.certificates, obj.content];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return (c as Record<string, unknown>[]).slice(0, 5);
      }
    }
    return [];
  };

  const pickText = (record: Record<string, unknown>, keys: string[], fallback: string) => {
    for (const key of keys) {
      const v = record[key];
      if (v !== undefined && v !== null && String(v).trim()) return String(v);
    }
    return fallback;
  };

  const items = extractItems(body);
  const stateUpdates = result.stateUpdates as Record<string, unknown> | undefined;
  const capturedKeys = stateUpdates ? Object.keys(stateUpdates).filter(k => stateUpdates[k] !== null && stateUpdates[k] !== undefined) : [];

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div className={`rounded-2xl p-3 ${result.ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{result.ok ? "✅" : "❌"}</span>
          <span className="text-sm font-bold text-slate-900">{screen.resultTitle(result)}</span>
        </div>
        <p className="text-xs leading-5 text-slate-600">{screen.resultBody(result, runState)}</p>
        {screen.resultDetails && screen.resultDetails(result) && (
          <p className="text-xs leading-5 text-slate-500 mt-1">{screen.resultDetails(result)}</p>
        )}
        {result.httpStatus && (
          <span className={`inline-block mt-2 text-xs font-mono font-bold px-2 py-0.5 rounded ${result.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            HTTP {result.httpStatus}
          </span>
        )}
      </div>

      {/* Captured variables */}
      {capturedKeys.length > 0 && (
        <div className="rounded-2xl bg-white border border-blue-100 p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#1351b4] mb-2">📥 Variáveis capturadas</p>
          <div className="space-y-1.5">
            {capturedKeys.slice(0, 4).map(key => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-semibold text-[#1351b4] shrink-0">{key}</span>
                <span className="text-[10px] font-mono text-slate-600 truncate">
                  {String(stateUpdates![key]).length > 30
                    ? `${String(stateUpdates![key]).slice(0, 12)}…${String(stateUpdates![key]).slice(-8)}`
                    : String(stateUpdates![key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List items from response */}
      {items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Retorno da API</p>
          <div className="space-y-2">
            {items.map((item, idx) => {
              const name = pickText(item, ["name", "title", "label", "displayName", "description"], `Item ${idx + 1}`);
              const id = pickText(item, ["id", "sid", "dsku", "planId", "requestId", "offerId", "schemaId", "valueSchemaSid"], "");
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                  {id && <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{id}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main PhoneMockup component ───────────────────────────────────────────────

export type PhoneMockupPhase = "input" | "loading" | "result";

export function HomologacaoPhoneMockup({
  stepId,
  runState,
  activeResult,
  isExecuting,
  actionId,
  stepActions,
  executedActionIds,
  onFieldChange,
  onExecute,
  onAutoAdvance,
  lang = "pt",
}: {
  stepId: number;
  runState: RunState;
  activeResult?: ActionResult;
  isExecuting: boolean;
  actionId?: string;
  stepActions?: Array<{ id: string; title: string }>;
  executedActionIds?: Set<string>;
  onFieldChange: (key: string, value: string) => void;
  onExecute: (actionId: string) => void;
  onAutoAdvance?: (nextActionId: string) => void;
  lang?: "pt" | "en";
}) {
  const screen = PHONE_SCREENS[stepId];
  const [phase, setPhase] = useState<PhoneMockupPhase>("input");
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActionIdRef = useRef<string | undefined>(actionId);

  // Sync phase with execution state and result
  useEffect(() => {
    if (isExecuting) {
      setPhase("loading");
    } else if (activeResult) {
      setPhase("result");
    } else {
      setPhase("input");
    }
  }, [isExecuting, activeResult]);

  // Auto-advance to next sub-action after successful result (1.8s delay)
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (
      !isExecuting &&
      activeResult?.ok &&
      phase === "result" &&
      stepActions &&
      stepActions.length > 1 &&
      actionId &&
      onAutoAdvance
    ) {
      const currentIdx = stepActions.findIndex(a => a.id === actionId);
      const nextAction = stepActions[currentIdx + 1];
      if (nextAction) {
        autoAdvanceTimer.current = setTimeout(() => {
          onAutoAdvance(nextAction.id);
          setPhase("input");
        }, 1800);
      }
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isExecuting, activeResult, phase, stepActions, actionId, onAutoAdvance]);

  // Reset phase to input when actionId changes (user moved to next sub-action)
  useEffect(() => {
    if (prevActionIdRef.current !== actionId) {
      prevActionIdRef.current = actionId;
      setPhase("input");
    }
  }, [actionId]);
  if (!screen) return null;
  // Merge sub-tela da ação atual sobre a tela base do passo
  const actionSubScreen = actionId && screen.actionScreens ? screen.actionScreens[actionId] : undefined;
  const activeScreen: PhoneScreenConfig = actionSubScreen
    ? { ...screen, ...actionSubScreen }
    : screen;
  const colors = getAppColors(screen.appKind);
  const isGap = Boolean(activeScreen.gapMessage);
  const hasFields = activeScreen.fields.length > 0;

  const appKindLabel = screen.appKind === "BdW" ? "Business dWallet®"
    : screen.appKind === "PdW" ? "Personal dWallet®"
    : "dWallet®";

  const handleCta = () => {
    if (!actionId || isGap) return;
    onExecute(actionId);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Phone shell — identidade visual gov.br */}
      <div
        className="relative w-[320px] rounded-[2.5rem] shadow-2xl overflow-hidden border-[7px]"
        style={{ background: "#f0f4fa", minHeight: 600, borderColor: "#1c1c1e" }}
        aria-label={`Mockup do aplicativo — Passo ${stepId}: ${activeScreen.screenTitle}`}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[22px] rounded-b-2xl z-20" style={{ background: "#1c1c1e" }} />

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 pt-8 pb-1 text-[10px] font-semibold text-white/90"
          style={{ background: colors.bg }}
        >
          <span className="font-mono tracking-wide">9:41</span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="4" width="2" height="6" rx="0.5"/><rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/><rect x="6" y="1" width="2" height="9" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><path d="M7 2.5C9.2 2.5 11.2 3.5 12.5 5.1L14 3.5C12.3 1.4 9.8 0 7 0S1.7 1.4 0 3.5L1.5 5.1C2.8 3.5 4.8 2.5 7 2.5z"/><path d="M7 5.5C8.4 5.5 9.7 6.1 10.6 7.1L12.1 5.5C10.8 4.1 9 3.2 7 3.2S3.2 4.1 1.9 5.5L3.4 7.1C4.3 6.1 5.6 5.5 7 5.5z"/><circle cx="7" cy="9" r="1.5"/></svg>
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" strokeOpacity="0.5"/><rect x="2" y="2" width="14" height="7" rx="1.5" fill="currentColor"/><path d="M19.5 3.5v4a2 2 0 000-4z" fill="currentColor" fillOpacity="0.4"/></svg>
          </span>
        </div>

        {/* Gov.br header strip */}
        <div style={{ background: colors.bg }} className="px-4 pt-2 pb-4 text-white">
          {/* Gov.br brand row */}
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/10">
            {/* Brasão simplificado */}
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2zm0 2.18l7 3.89V12c0 4.25-2.95 8.2-7 9.45C7.95 20.2 5 16.25 5 12V8.07l7-3.89z"/>
                <path d="M12 6l-4 2.2V12c0 2.6 1.75 5.1 4 5.75 2.25-.65 4-3.15 4-5.75V8.2L12 6z" opacity="0.6"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none">gov.br</p>
              <p className="text-[10px] font-semibold text-white/80 leading-tight">{appKindLabel}</p>
            </div>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white/90"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Passo {stepId}
            </span>
          </div>

          {/* Screen header */}
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
              <span className="text-base">{activeScreen.appHeader.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{activeScreen.appHeader}</p>
              <p className="text-[10px] text-white/65 leading-snug mt-0.5 line-clamp-2">{activeScreen.appLead}</p>
            </div>
          </div>

          {/* Multi-action progress indicator */}
          {stepActions && stepActions.length > 1 && (() => {
            const currentIdx = stepActions.findIndex(a => a.id === actionId);
            const displayIdx = currentIdx >= 0 ? currentIdx : 0;
            return (
              <div className="mt-3 flex items-center gap-1.5">
                {stepActions.map((action, idx) => {
                  const isDone = executedActionIds?.has(action.id);
                  const isCurrent = action.id === actionId;
                  return (
                    <div key={action.id} className="flex items-center gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                          isDone ? "bg-emerald-400 text-white" :
                          isCurrent ? "bg-white text-slate-800 ring-2 ring-white/40" :
                          "bg-white/15 text-white/40"
                        }`}
                        title={action.title}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      {idx < stepActions.length - 1 && (
                        <div className={`h-0.5 w-4 rounded-full transition-all ${isDone ? "bg-emerald-400" : "bg-white/15"}`} />
                      )}
                    </div>
                  );
                })}
                <span className="ml-1 text-[9px] text-white/50">
                  {displayIdx + 1}/{stepActions.length}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Screen content */}
        <div className="overflow-y-auto" style={{ maxHeight: 390 }}>
          {/* GAP state */}
          {isGap && (
            <div className="p-4 space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                <div className="text-3xl mb-2">🚧</div>
                <p className="text-sm font-bold text-amber-800">API não disponível</p>
                <p className="text-xs text-amber-600 mt-2 leading-5">{activeScreen.gapMessage}</p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Tela esperada no app</p>
                <p className="text-xs text-slate-600 leading-5">{activeScreen.screenSubtitle}</p>
              </div>
            </div>
          )}

          {/* LOADING state */}
          {!isGap && phase === "loading" && (
            <div className="p-4 flex flex-col items-center justify-center gap-4 py-12">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `${colors.accent}30`, borderTopColor: colors.accent }}
              />
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: colors.bg }}>Processando…</p>
                <p className="text-xs text-slate-500 mt-1">Aguarde a resposta da API</p>
              </div>
            </div>
          )}

          {/* RESULT state */}
          {!isGap && phase === "result" && activeResult && (
            <div className="p-4 space-y-3">
              <ResponseRenderer result={activeResult} screen={activeScreen} runState={runState} />
              {/* Auto-advance hint for multi-step */}
              {stepActions && stepActions.length > 1 && activeResult.ok && (() => {
                const currentIdx = stepActions.findIndex(a => a.id === actionId);
                const nextAction = stepActions[currentIdx + 1];
                return nextAction ? (
                  <div className="rounded-xl px-3 py-2 text-center" style={{ background: `${colors.accent}10`, border: `1px solid ${colors.accent}30` }}>
                    <p className="text-[10px] font-semibold" style={{ color: colors.accent }}>
                      ⏳ Avançando para: {nextAction.title}…
                    </p>
                  </div>
                ) : null;
              })()}
              <button
                onClick={() => setPhase("input")}
                className="w-full text-xs font-semibold text-slate-500 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                ← Voltar ao formulário
              </button>
            </div>
          )}

          {/* INPUT state */}
          {!isGap && phase === "input" && (
            <div className="p-4 space-y-3">
              {/* Previous result indicator */}
              {activeResult && (
                <button
                  onClick={() => setPhase("result")}
                  className={`w-full text-xs font-semibold py-2 rounded-2xl border transition-colors ${
                    activeResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {activeResult.ok ? "✅ Ver último resultado →" : "❌ Ver último erro →"}
                </button>
              )}

              {/* Form fields */}
              {hasFields && (
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dados da operação</p>
                  {activeScreen.fields.map(field => {
                    const value = String(runState[field.key] ?? "");
                    const displayValue = field.sensitive && value ? "••••••••" : value;
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[10px] font-semibold" style={{ color: colors.bg }}>
                          {field.label}{field.required ? " *" : ""}
                        </label>
                        <input
                          type={field.type ?? "text"}
                          value={field.sensitive ? value : displayValue}
                          placeholder={field.placeholder}
                          onChange={e => onFieldChange(field.key, e.target.value)}
                          className="w-full text-xs border rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono transition-shadow"
                          style={{
                            borderColor: `${colors.accent}40`,
                            "--tw-ring-color": colors.accent,
                          } as React.CSSProperties}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No fields — info card */}
              {!hasFields && (
                <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 leading-5">
                    Esta etapa não requer campos de entrada. Toque no botão abaixo para executar a API.
                  </p>
                </div>
              )}

              {/* CTA button — gov.br style */}
              {actionId && !isGap && (
                <button
                  onClick={handleCta}
                  disabled={isExecuting}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                  style={{ background: colors.accent }}
                >
                  {isExecuting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                      </svg>
                      Enviando…
                    </span>
                  ) : activeScreen.ctaLabel}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Home indicator (sem barra de navegação) */}
        <div className="flex justify-center pb-2 pt-1 bg-white/80">
          <div className="w-24 h-1 rounded-full" style={{ background: "#1c1c1e", opacity: 0.2 }} />
        </div>
      </div>

      {/* Screen label below phone */}
      <div className="mt-3 text-center">
        <p className="text-xs font-semibold text-slate-700">{activeScreen.screenTitle}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{activeScreen.screenSubtitle}</p>
      </div>
    </div>
  );
}
