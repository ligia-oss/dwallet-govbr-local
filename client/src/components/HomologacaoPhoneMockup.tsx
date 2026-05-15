import React, { useState, useEffect, useRef, useMemo } from "react";

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

// ─── Schema theme helpers ─────────────────────────────────────────────────────

// Detecta categoria a partir do nome/id do schema
function detectSchemaCategory(name: string): { label: string; color: string; icon: React.ReactNode } {
  const n = name.toLowerCase();
  if (n.includes("rideshare") || n.includes("ride") || n.includes("transport") || n.includes("mobility") || n.includes("uber") || n.includes("taxi")) {
    return {
      label: "Mobilidade",
      color: "#0ea5e9",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2" />
          <circle cx="7.5" cy="17.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      ),
    };
  }
  if (n.includes("telecom") || n.includes("phone") || n.includes("mobile") || n.includes("subscription") || n.includes("celular") || n.includes("internet")) {
    return {
      label: "Telecom",
      color: "#8b5cf6",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    };
  }
  if (n.includes("finance") || n.includes("bank") || n.includes("payment") || n.includes("credit") || n.includes("loan") || n.includes("invest") || n.includes("financ") || n.includes("pagament") || n.includes("conta") || n.includes("saldo")) {
    return {
      label: "Finanças",
      color: "#10b981",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    };
  }
  if (n.includes("health") || n.includes("medical") || n.includes("saude") || n.includes("saúde") || n.includes("hospital") || n.includes("clinic") || n.includes("pharma")) {
    return {
      label: "Saúde",
      color: "#ef4444",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    };
  }
  if (n.includes("energy") || n.includes("electric") || n.includes("energia") || n.includes("luz") || n.includes("gas") || n.includes("water") || n.includes("água")) {
    return {
      label: "Energia & Utilidades",
      color: "#f59e0b",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    };
  }
  if (n.includes("retail") || n.includes("shop") || n.includes("ecommerce") || n.includes("commerce") || n.includes("store") || n.includes("loja") || n.includes("compra")) {
    return {
      label: "Varejo",
      color: "#f97316",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    };
  }
  if (n.includes("location") || n.includes("address") || n.includes("geo") || n.includes("place") || n.includes("endereço") || n.includes("localiza")) {
    return {
      label: "Localização",
      color: "#06b6d4",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    };
  }
  if (n.includes("profile") || n.includes("user") || n.includes("identity") || n.includes("perfil") || n.includes("identidade") || n.includes("pessoa") || n.includes("person")) {
    return {
      label: "Perfil & Identidade",
      color: "#6366f1",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    };
  }
  if (n.includes("insurance") || n.includes("seguro") || n.includes("protect")) {
    return {
      label: "Seguros",
      color: "#0891b2",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    };
  }
  if (n.includes("employ") || n.includes("work") || n.includes("job") || n.includes("salary") || n.includes("emprego") || n.includes("salario") || n.includes("trabalhista")) {
    return {
      label: "Emprego & Renda",
      color: "#84cc16",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
    };
  }
  // Default: dados genéricos
  return {
    label: "Dados",
    color: "#1351b4",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  };
}

// Extrai tipo e categoria de um schema a partir do nome/id
function parseSchemaType(name: string, sid: string): { type: string; category: string } {
  const combined = (name + " " + sid).toLowerCase();
  // Tipo: inferido pelo padrão do nome
  let type = "Standard";
  if (combined.includes("event") || combined.includes("evento")) type = "Evento";
  else if (combined.includes("profile") || combined.includes("perfil")) type = "Perfil";
  else if (combined.includes("transaction") || combined.includes("transac")) type = "Transação";
  else if (combined.includes("subscription") || combined.includes("assinatura")) type = "Assinatura";
  else if (combined.includes("location") || combined.includes("localiza")) type = "Localização";
  else if (combined.includes("fare") || combined.includes("tarifa") || combined.includes("price")) type = "Tarifa";
  else if (combined.includes("certificate") || combined.includes("certificado")) type = "Certificado";
  // Categoria: inferida pelo domínio
  const cat = detectSchemaCategory(name);
  return { type, category: cat.label };
}

// ─── SchemaCardList: lista visual de schemas com filtro ───────────────────────

function SchemaCardList({ items, pickText }: {
  items: Record<string, unknown>[];
  pickText: (r: Record<string, unknown>, keys: string[], fallback: string) => string;
}) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Enriquecer items com metadados
  const enriched = useMemo(() => items.map((item, idx) => {
    const name = pickText(item, ["name", "title", "label", "displayName", "description"], `Schema ${idx + 1}`);
    const sid = pickText(item, ["id", "sid", "dsku", "planId", "schemaId", "valueSchemaSid"], "");
    const theme = detectSchemaCategory(name);
    const { type, category } = parseSchemaType(name, sid);
    return { name, sid, theme, type, category, raw: item };
  }), [items]);

  // Coletar tipos e categorias únicos
  const allTypes = useMemo(() => Array.from(new Set(enriched.map(e => e.type))).sort(), [enriched]);
  const allCategories = useMemo(() => Array.from(new Set(enriched.map(e => e.category))).sort(), [enriched]);

  // Filtrar
  const filtered = useMemo(() => enriched.filter(e => {
    const typeOk = selectedTypes.size === 0 || selectedTypes.has(e.type);
    const catOk = selectedCategories.size === 0 || selectedCategories.has(e.category);
    return typeOk && catOk;
  }), [enriched, selectedTypes, selectedCategories]);

  const toggleType = (t: string) => setSelectedTypes(prev => {
    const next = new Set(prev);
    next.has(t) ? next.delete(t) : next.add(t);
    return next;
  });
  const toggleCategory = (c: string) => setSelectedCategories(prev => {
    const next = new Set(prev);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });

  const hasFilters = selectedTypes.size > 0 || selectedCategories.size > 0;

  return (
    <div className="space-y-2">
      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Filtrar planos</p>
          {hasFilters && (
            <button
              onClick={() => { setSelectedTypes(new Set()); setSelectedCategories(new Set()); }}
              className="text-[9px] text-[#1351b4] font-semibold underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
        {/* Tipos */}
        {allTypes.length > 1 && (
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Tipo</p>
            <div className="flex flex-wrap gap-1">
              {allTypes.map(t => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="text-[9px] px-2 py-0.5 rounded-full border font-semibold transition-all"
                  style={{
                    background: selectedTypes.has(t) ? "#1351b4" : "white",
                    color: selectedTypes.has(t) ? "white" : "#475569",
                    borderColor: selectedTypes.has(t) ? "#1351b4" : "#cbd5e1",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Categorias */}
        {allCategories.length > 1 && (
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Categoria</p>
            <div className="flex flex-wrap gap-1">
              {allCategories.map(c => {
                const theme = detectSchemaCategory(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className="text-[9px] px-2 py-0.5 rounded-full border font-semibold transition-all"
                    style={{
                      background: selectedCategories.has(c) ? theme.color : "white",
                      color: selectedCategories.has(c) ? "white" : "#475569",
                      borderColor: selectedCategories.has(c) ? theme.color : "#cbd5e1",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Contagem */}
      <p className="text-[9px] text-slate-400 text-right">
        {filtered.length} de {enriched.length} plano(s)
      </p>

      {/* Cards de schemas */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-400">Nenhum plano corresponde aos filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, idx) => (
            <div
              key={idx}
              className="rounded-xl border bg-white p-3 flex items-start gap-3 shadow-sm"
              style={{ borderColor: `${e.theme.color}30` }}
            >
              {/* Ícone temático */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${e.theme.color}15`, color: e.theme.color }}
              >
                {e.theme.icon}
              </div>
              {/* Informações */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{e.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {/* Badge tipo */}
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#f1f5f9", color: "#475569" }}
                  >
                    {e.type}
                  </span>
                  {/* Badge categoria */}
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${e.theme.color}15`, color: e.theme.color }}
                  >
                    {e.category}
                  </span>
                </div>
                {e.sid && (
                  <p className="text-[9px] font-mono text-slate-400 truncate mt-1">{e.sid}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponseRenderer({ result, screen, runState }: {
  result: ActionResult;
  screen: PhoneScreenConfig;
  runState: RunState;
}) {
  const body = result.responseBody as Record<string, unknown> | null | undefined;

  // Extract list items from common response shapes
  const extractItems = (data: unknown): Record<string, unknown>[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidates = [obj.items, obj.data, obj.results, obj.valueSchemas, obj.schemas,
        obj.products, obj.dskus, obj.plans, obj.dataSavingsPlans, obj.certificates, obj.content];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c as Record<string, unknown>[];
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

  const allItems = extractItems(body);
  // Para exibição genérica limitamos a 5; schemas têm lista completa
  const isSchemaStep = screen.stepId === 3;
  const items = isSchemaStep ? allItems : allItems.slice(0, 5);

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

      {/* Lista de schemas com cards visuais e filtro (passo 3) */}
      {isSchemaStep && result.ok && items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Planos de dados disponíveis</p>
          <SchemaCardList items={items} pickText={pickText} />
        </div>
      )}

      {/* Lista genérica para outros passos */}
      {!isSchemaStep && items.length > 0 && (
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

export type PhoneMockupPhase = "input" | "loading" | "result" | "email-sent" | "app-home" | "signin-success";

// Ações de signup que disparam a tela "Código enviado por e-mail"
// Apenas os cadastros de usuário (não inclui business_create, que é criação de empresa após login)
const SIGNUP_ACTION_IDS = new Set([
  "step1_employee_signup",
  "step2_person_signup",
]);

// Ações de verificação de código que disparam a tela "Home do app" (pós-cadastro)
const VERIFY_CODE_ACTION_IDS = new Set([
  "step1_employee_verify_code",
  "step2_person_verify_code",
]);

// Ações de login que disparam a tela "Home do app" (pós-login)
const SIGNIN_ACTION_IDS = new Set([
  "step1_employee_signin",
  "step2_person_signin",
]);

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
    } else if (activeResult?.ok && actionId && SIGNUP_ACTION_IDS.has(actionId)) {
      // Após signup bem-sucedido → tela "Código enviado"
      setPhase("email-sent");
    } else if (activeResult?.ok && actionId && VERIFY_CODE_ACTION_IDS.has(actionId)) {
      // Após verificação de código bem-sucedida → tela "Home do app" (pós-cadastro)
      setPhase("app-home");
    } else if (activeResult?.ok && actionId && SIGNIN_ACTION_IDS.has(actionId)) {
      // Após login bem-sucedido → tela "Home do app" (pós-login)
      setPhase("signin-success");
    } else if (activeResult) {
      setPhase("result");
    } else {
      setPhase("input");
    }
  }, [isExecuting, activeResult, actionId]);

  // Auto-advance to next sub-action after successful result (1.8s delay)
  // Não auto-avança quando está nas telas especiais email-sent ou app-home
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

          {/* EMAIL-SENT state — após signup bem-sucedido */}
          {!isGap && phase === "email-sent" && (() => {
            const userEmail = String(
              runState.employeeEmail ?? runState.personEmail ?? "seu e-mail"
            );
            return (
              <div className="p-5 flex flex-col items-center gap-5">
                {/* Ícone de envelope animado */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mt-4"
                  style={{ background: `${colors.accent}15`, border: `3px solid ${colors.accent}30` }}
                >
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={colors.accent} strokeWidth="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M2 7l10 7 10-7" />
                  </svg>
                </div>
                {/* Texto principal */}
                <div className="text-center space-y-2">
                  <p className="text-base font-bold text-slate-900 leading-snug">
                    Enviamos um código para seu e-mail
                  </p>
                  <p className="text-xs text-slate-500 leading-5">
                    Verifique a caixa de entrada de{" "}
                    <span className="font-semibold" style={{ color: colors.accent }}>{userEmail}</span>{" "}
                    e informe o código recebido.
                  </p>
                </div>
                {/* Card informativo */}
                <div
                  className="w-full rounded-2xl p-3 text-center"
                  style={{ background: `${colors.accent}08`, border: `1px solid ${colors.accent}20` }}
                >
                  <p className="text-[10px] text-slate-500 leading-5">
                    O código expira em <span className="font-semibold">15 minutos</span>.
                    Verifique também a pasta de spam.
                  </p>
                </div>
                {/* Botão Informar código */}
                <button
                  onClick={() => {
                    // Avançar para a próxima ação (send_code ou verify_code)
                    if (onAutoAdvance && stepActions && actionId) {
                      const currentIdx = stepActions.findIndex(a => a.id === actionId);
                      const nextAction = stepActions[currentIdx + 1];
                      if (nextAction) {
                        onAutoAdvance(nextAction.id);
                        setPhase("input");
                        return;
                      }
                    }
                    setPhase("input");
                  }}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-95"
                  style={{ background: colors.accent }}
                >
                  Informar código
                </button>
                <button
                  onClick={() => setPhase("result")}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Ver detalhes da resposta
                </button>
              </div>
            );
          })()}

          {/* APP-HOME state — após verificação de código bem-sucedida */}
          {!isGap && phase === "app-home" && (() => {
            // Extrair nome do usuário da resposta ou do runState
            const respBody = activeResult?.responseBody as Record<string, unknown> | null | undefined;
            const firstName = String(
              respBody?.firstName ?? respBody?.first_name ?? respBody?.name ??
              runState.employeeFirstName ?? runState.personFirstName ?? "Usuário"
            );
            const isBdW = screen.appKind === "BdW";
            const appLabel = isBdW ? "Business dWallet®" : "Personal dWallet®";
            const accentBg = colors.bg;
            return (
              <div className="flex flex-col" style={{ background: accentBg, minHeight: 390 }}>
                {/* Header com saudão */}
                <div className="px-4 pt-3 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {/* Avatar */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    >
                      {/* Desenho de pessoa (silhueta neutra) */}
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/50 leading-none">Olá,</p>
                      <p className="text-sm font-bold text-white leading-tight">{firstName}!</p>
                    </div>
                  </div>
                  {/* Menu icon */}
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                      <rect x="3" y="6" width="18" height="2" rx="1" />
                      <rect x="3" y="11" width="18" height="2" rx="1" />
                      <rect x="3" y="16" width="18" height="2" rx="1" />
                    </svg>
                  </div>
                </div>

                {/* Área central — avatar grande + título */}
                <div className="flex flex-col items-center pt-5 pb-3 px-4">
                  {/* Avatar grande com anel */}
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      boxShadow: `0 0 0 4px rgba(255,255,255,0.15), 0 0 0 8px rgba(255,255,255,0.06)`
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="44" height="44" fill="white">
                      <circle cx="12" cy="8" r="4.5" />
                      <path d="M3 22c0-5 4-9 9-9s9 4 9 9" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-white">{firstName}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{appLabel}</p>
                </div>

                {/* Cards de ações */}
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Minhas solicitações</p>

                  {/* Stats row */}
                  <div
                    className="rounded-2xl p-3 flex justify-around"
                    style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    {[{label: "Pendente", value: "0"}, {label: "Aceito", value: "0"}, {label: "Recusado", value: "0"}].map((s, i) => (
                      <div key={i} className="text-center">
                        <p className="text-lg font-bold text-white">{s.value}</p>
                        <p className="text-[9px] text-white/60">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Botões de ação */}
                  <button
                    className="w-full rounded-xl py-2.5 text-xs font-bold text-white border border-white/30 transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                    onClick={() => setPhase("input")}
                  >
                    Solicitar dados
                  </button>
                  <button
                    className="w-full rounded-xl py-2.5 text-xs font-bold text-white border border-white/30 transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                    onClick={() => setPhase("input")}
                  >
                    Ver minhas solicitações
                  </button>

                  {/* Continuar jornada */}
                  <button
                    onClick={() => {
                      if (onAutoAdvance && stepActions && actionId) {
                        const currentIdx = stepActions.findIndex(a => a.id === actionId);
                        const nextAction = stepActions[currentIdx + 1];
                        if (nextAction) {
                          onAutoAdvance(nextAction.id);
                          setPhase("input");
                          return;
                        }
                      }
                      setPhase("input");
                    }}
                    className="w-full rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.95)", color: accentBg }}
                  >
                    Continuar jornada →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* SIGNIN-SUCCESS state — tela Home completa após login bem-sucedido */}
          {!isGap && phase === "signin-success" && (() => {
            const respBody = activeResult?.responseBody as Record<string, unknown> | null | undefined;
            // Extrair nome do usuário da resposta ou do runState
            const firstName = String(
              respBody?.firstName ?? respBody?.first_name ??
              respBody?.name ?? respBody?.username ??
              runState.employeeFirstName ?? runState.personFirstName ?? "Usuário"
            );
            const isBdW = screen.appKind === "BdW";
            const appLabel = isBdW ? "Business dWallet®" : "Personal dWallet®";
            const accentBg = colors.bg;
            const accentColor = colors.accent;

            // Avatar SVG: homem para BdW, mulher para PdW
            const AvatarSVG = isBdW ? (
              // Homem: cabeça com cabelo curto
              <svg viewBox="0 0 80 80" width="64" height="64" fill="none">
                {/* Corpo */}
                <ellipse cx="40" cy="68" rx="22" ry="12" fill="rgba(255,255,255,0.25)" />
                {/* Pescoço */}
                <rect x="35" y="46" width="10" height="10" rx="3" fill="rgba(255,255,255,0.5)" />
                {/* Cabeça */}
                <ellipse cx="40" cy="34" rx="16" ry="17" fill="rgba(255,255,255,0.85)" />
                {/* Cabelo curto */}
                <path d="M24 30 Q24 14 40 14 Q56 14 56 30" fill="rgba(255,255,255,0.4)" />
                {/* Orelhas */}
                <ellipse cx="24" cy="35" rx="3" ry="4" fill="rgba(255,255,255,0.6)" />
                <ellipse cx="56" cy="35" rx="3" ry="4" fill="rgba(255,255,255,0.6)" />
                {/* Olhos */}
                <circle cx="34" cy="33" r="2.5" fill={accentBg} opacity="0.7" />
                <circle cx="46" cy="33" r="2.5" fill={accentBg} opacity="0.7" />
                {/* Boca */}
                <path d="M34 42 Q40 46 46 42" stroke={accentBg} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              </svg>
            ) : (
              // Mulher: cabeça com cabelo longo
              <svg viewBox="0 0 80 80" width="64" height="64" fill="none">
                {/* Cabelo longo (atrás) */}
                <path d="M22 32 Q18 55 22 70 Q30 76 40 76 Q50 76 58 70 Q62 55 58 32" fill="rgba(255,255,255,0.3)" />
                {/* Corpo */}
                <ellipse cx="40" cy="68" rx="20" ry="10" fill="rgba(255,255,255,0.25)" />
                {/* Pescoço */}
                <rect x="36" y="47" width="8" height="9" rx="3" fill="rgba(255,255,255,0.5)" />
                {/* Cabeça */}
                <ellipse cx="40" cy="34" rx="15" ry="16" fill="rgba(255,255,255,0.85)" />
                {/* Cabelo topo */}
                <path d="M25 28 Q25 14 40 13 Q55 14 55 28" fill="rgba(255,255,255,0.45)" />
                {/* Orelhas */}
                <ellipse cx="25" cy="35" rx="3" ry="4" fill="rgba(255,255,255,0.6)" />
                <ellipse cx="55" cy="35" rx="3" ry="4" fill="rgba(255,255,255,0.6)" />
                {/* Olhos */}
                <ellipse cx="34" cy="33" rx="3" ry="2.5" fill={accentBg} opacity="0.7" />
                <ellipse cx="46" cy="33" rx="3" ry="2.5" fill={accentBg} opacity="0.7" />
                {/* Cílios */}
                <path d="M31 30.5 Q34 29 37 30.5" stroke={accentBg} strokeWidth="1" fill="none" opacity="0.5" />
                <path d="M43 30.5 Q46 29 49 30.5" stroke={accentBg} strokeWidth="1" fill="none" opacity="0.5" />
                {/* Boca */}
                <path d="M35 42 Q40 46 45 42" stroke={accentBg} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              </svg>
            );

            return (
              <div className="flex flex-col" style={{ background: accentBg, minHeight: 420 }}>

                {/* Header: saudão + avatar pequeno + menu */}
                <div
                  className="px-4 pt-3 pb-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar pequeno no header */}
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: `${accentColor}40`, border: "2px solid rgba(255,255,255,0.3)" }}
                    >
                      <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
                        {isBdW ? (
                          <>
                            <ellipse cx="20" cy="34" rx="11" ry="6" fill="rgba(255,255,255,0.3)" />
                            <ellipse cx="20" cy="17" rx="8" ry="8.5" fill="rgba(255,255,255,0.9)" />
                            <path d="M12 15 Q12 7 20 7 Q28 7 28 15" fill="rgba(255,255,255,0.4)" />
                          </>
                        ) : (
                          <>
                            <path d="M11 16 Q9 27 11 35 Q15 38 20 38 Q25 38 29 35 Q31 27 29 16" fill="rgba(255,255,255,0.25)" />
                            <ellipse cx="20" cy="17" rx="7.5" ry="8" fill="rgba(255,255,255,0.9)" />
                            <path d="M12.5 14 Q12.5 7 20 6.5 Q27.5 7 27.5 14" fill="rgba(255,255,255,0.4)" />
                          </>
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/50 leading-none">Olá,</p>
                      <p className="text-sm font-bold text-white leading-tight">{firstName}!</p>
                    </div>
                  </div>
                  {/* Menu hamburguer */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                      <rect x="3" y="6" width="18" height="2" rx="1" />
                      <rect x="3" y="11" width="18" height="2" rx="1" />
                      <rect x="3" y="16" width="18" height="2" rx="1" />
                    </svg>
                  </div>
                </div>

                {/* Área central: avatar grande + nome + app */}
                <div className="flex flex-col items-center pt-5 pb-4 px-4">
                  {/* Avatar grande com anéis concêntricos */}
                  <div
                    className="relative w-24 h-24 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: `${accentColor}30`,
                      boxShadow: `0 0 0 5px ${accentColor}25, 0 0 0 10px ${accentColor}12, 0 0 0 16px ${accentColor}06`
                    }}
                  >
                    {AvatarSVG}
                  </div>
                  <p className="text-base font-bold text-white tracking-wide">{firstName}</p>
                  <p className="text-[10px] text-white/55 mt-0.5">{appLabel}</p>
                </div>

                {/* Título seção */}
                <div className="px-4 pb-1">
                  <p className="text-sm font-bold text-white text-center">Minhas solicitações</p>
                  <p className="text-[10px] text-white/50 text-center mt-0.5">Solicite dados das empresas com as quais possui relação</p>
                </div>

                {/* Stats */}
                <div className="px-4 py-3">
                  <div
                    className="rounded-2xl flex justify-around py-3"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    {[
                      { label: "Pendente", value: "0" },
                      { label: "Aceito", value: "0" },
                      { label: "Recusado", value: "0" },
                    ].map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <div style={{ width: 1, background: "rgba(255,255,255,0.15)" }} />}
                        <div className="text-center px-3">
                          <p className="text-xl font-bold text-white">{s.value}</p>
                          <p className="text-[9px] text-white/55 mt-0.5">{s.label}</p>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="px-4 pb-4 space-y-2">
                  <button
                    className="w-full rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.95)", color: accentBg }}
                    onClick={() => setPhase("input")}
                  >
                    Solicite mais dados
                  </button>
                  <button
                    className="w-full rounded-2xl py-3 text-sm font-bold text-white border transition-all active:scale-95"
                    style={{ background: "transparent", borderColor: "rgba(255,255,255,0.4)" }}
                    onClick={() => setPhase("input")}
                  >
                    Ver minhas solicitações
                  </button>
                  {/* Continuar jornada */}
                  <button
                    onClick={() => {
                      if (onAutoAdvance && stepActions && actionId) {
                        const currentIdx = stepActions.findIndex(a => a.id === actionId);
                        const nextAction = stepActions[currentIdx + 1];
                        if (nextAction) {
                          onAutoAdvance(nextAction.id);
                          setPhase("input");
                          return;
                        }
                      }
                      setPhase("input");
                    }}
                    className="w-full rounded-2xl py-2.5 text-xs font-semibold text-white/70 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    Continuar jornada →
                  </button>
                </div>
              </div>
            );
          })()}

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
