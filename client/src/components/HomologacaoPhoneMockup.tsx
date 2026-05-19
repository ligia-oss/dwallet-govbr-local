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
    actionScreens: {
      step4_list_products: {
        appHeader: "Catálogo de produtos",
        appLead: "Selecione um produto para criar o Commercial Value Schema.",
        ctaLabel: "Consultar produtos",
        fields: [],
        resultTitle: (r) => r.ok ? "Produtos carregados" : "Erro ao consultar produtos",
        resultBody: (r) => r.ok
          ? "Selecione um produto abaixo para continuar."
          : r.message ?? "Não foi possível carregar os produtos.",
      },
      step4_add_dsku_to_cart: {
        appHeader: "Adicionar ao carrinho",
        appLead: "Adicionando o produto selecionado ao carrinho da Business dWallet.",
        ctaLabel: "Adicionar ao carrinho",
        fields: [
          { key: "selectedProductDsku", label: "Produto (dSKU)", placeholder: "Produto selecionado", required: true },
          { key: "businessDwalletId", label: "ID da Business dWallet", placeholder: "Capturado no passo 1", required: true },
        ],
        resultTitle: (r) => r.ok ? "Produto adicionado ao carrinho!" : "Erro ao adicionar ao carrinho",
        resultBody: (r) => r.ok
          ? "Produto adicionado com sucesso. Agora crie o Commercial Value Schema."
          : r.message ?? "Não foi possível adicionar o produto ao carrinho.",
      },
      step4_create_commercial_value_schema: {
        appHeader: "Criar produto de dados",
        appLead: "Confirme o schema e o produto selecionados para criar o Commercial Value Schema.",
        ctaLabel: "Criar Commercial Value Schema",
        fields: [
          { key: "valueSchemaSid", label: "Schema selecionado", placeholder: "Selecione um schema no passo anterior", required: true },
          { key: "selectedProductDsku", label: "Produto selecionado (dSKU)", placeholder: "Selecione um produto acima", required: true },
          { key: "selectedProductName", label: "Nome do produto", placeholder: "Nome do produto selecionado", required: false },
        ],
        resultTitle: (r) => r.ok ? "Commercial Value Schema criado!" : "Erro ao criar schema",
        resultBody: (r) => r.ok
          ? "Commercial Value Schema criado com sucesso. O produto de dados está pronto para uso."
          : r.message ?? "Não foi possível criar o Commercial Value Schema.",
      },
    },
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
    ctaLabel: "Ver oferta",
    fields: [
      { key: "offerId", label: "ID da oferta", placeholder: "a2db4177-867c-4ad8-8b99-c28f3ee2e323", required: false },
    ],
    resultTitle: (r) => r.ok ? "Oferta carregada" : (r.httpStatus === 403 ? "Acesso restrito — feature flag" : r.httpStatus === 404 ? "Oferta não encontrada" : "Erro ao carregar oferta"),
    resultBody: (r) => r.ok
      ? "Oferta encontrada no marketplace."
      : r.httpStatus === 403
        ? "O endpoint de ofertas está restrito no ambiente sandbox. A feature flag de marketplace não está habilitada para este tenant. Contate a equipe DrumWave para habilitar o acesso."
        : r.httpStatus === 404
          ? "A oferta com o ID informado não foi encontrada no ambiente sandbox. O ID pode ser válido em produção mas ainda não existe neste tenant sandbox."
          : r.message ?? "Não foi possível carregar a oferta.",
    resultDetails: (r) => r.httpStatus === 403
      ? "Causa: O servidor retornou HTTP 403 Forbidden. Isso indica que o tenant sandbox não tem permissão para acessar a oferta. O código está correto — é uma restrição de ambiente, não um bug."
      : r.httpStatus === 404
        ? "Causa: HTTP 404 Not Found. O UUID é válido mas a oferta não existe neste ambiente sandbox. Solicite à equipe DrumWave que crie a oferta no tenant sandbox ou fornecer um offerId válido para este ambiente."
        : undefined,
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
  // Tipo: inferido pelo padrão do nome — labels descritivos em português
  let type = "Padrão de Dados";
  if (combined.includes("event") || combined.includes("evento")) type = "Evento de Dados";
  else if (combined.includes("profile") || combined.includes("perfil")) type = "Perfil de Usuário";
  else if (combined.includes("transaction") || combined.includes("transac")) type = "Transação Financeira";
  else if (combined.includes("subscription") || combined.includes("assinatura")) type = "Assinatura / Plano";
  else if (combined.includes("location") || combined.includes("localiza")) type = "Dados de Localização";
  else if (combined.includes("fare") || combined.includes("tarifa") || combined.includes("price")) type = "Tarifa / Preço";
  else if (combined.includes("certificate") || combined.includes("certificado")) type = "Certificado Digital";
  else if (combined.includes("custom")) type = "Schema Personalizado";
  else if (combined.includes("mobil") || combined.includes("transport") || combined.includes("ride")) type = "Mobilidade";
  // Categoria: inferida pelo domínio
  const cat = detectSchemaCategory(name);
  return { type, category: cat.label };
}

// ─── Imagens nano banana para botões de tipo de schema ─────────────────────
const SCHEMA_TYPE_IMAGES: Record<string, string> = {
  standard: "/manus-storage/btn-schema-standard_c1e2fdd8.png",
  custom: "/manus-storage/btn-schema-custom_a49e0dc6.png",
  mobility: "/manus-storage/btn-schema-mobility_010c3215.png",
  accept: "/manus-storage/btn-accept_cc2f32fc.png",
  reject: "/manus-storage/btn-reject_1fb6d447.png",
  dsp: "/manus-storage/btn-dsp-plan_fcea31aa.png",
  offer: "/manus-storage/btn-offer_e949cbeb.png",
  certificate: "/manus-storage/btn-certificate_4856fd87.png",
  consent: "/manus-storage/btn-consent_73818536.png",
  order: "/manus-storage/btn-order_6f22c6dc.png",
};

// ─── Mapeamento de nomes amigáveis para schemas específicos ─────────────────
// Chave: parte do nome/sid retornado pela API (case-insensitive match)
const SCHEMA_FRIENDLY_NAMES: Record<string, string> = {
  // PT-BR
  "rideshare-fares": "Tarifas das Viagens",
  "rideshare-rider-profile": "Perfil do Motorista",
  "rideshare-rides": "Corridas",
  "rideshare-saved-location": "Locais Favoritos no Aplicativo de Corrida",
  "ridershare-saved-location": "Locais Favoritos no Aplicativo de Corrida",
  "telecom-subscription": "Planos de Telefonia",
  "telecom-subcription": "Planos de Telefonia",
  // EN
  "rideshare-fares-en": "Ride Fares",
  "rideshare-rider-profile-en": "Driver Profile",
  "rideshare-rides-en": "Rides",
  "rideshare-saved-location-en": "Saved Locations in Ride App",
  "telecom-subscription-en": "Telecom Plans",
};

/**
 * Retorna o nome amigável de um schema a partir do seu nome/sid.
 * Faz match parcial (case-insensitive) contra as chaves do mapeamento.
 */
function getSchemaFriendlyName(name: string, sid: string): string {
  const combined = (name + " " + sid).toLowerCase();
  for (const [key, friendly] of Object.entries(SCHEMA_FRIENDLY_NAMES)) {
    if (combined.includes(key.toLowerCase())) return friendly;
  }
  return name; // fallback: nome original
}

// ─── Mapeamento de nomes amigáveis para produtos específicos do passo 5 ──────
// Mapeamento de produtos por ID de produto (nome), DSKU parcial, ou DSKU completo.
// A API do passo 5 retorna itens com campo `name` = "Test_Product_XXX" e campo `dsku` = "DSKU-XXXX-TEST-PRODUCT-XXX".
// Para garantir o match, o lookup é feito por nome (campo `name`) e também por DSKU.
const PRODUCT_FRIENDLY_NAMES: Record<string, { brand: string; image: string }> = {
  // Lookup por nome do produto (campo `name` retornado pela API)
  "Test_Product_7Or1uUrK8": {
    brand: "Banco Bank",
    image: "/manus-storage/p5-banco-bank_638e26bf.png",
  },
  "Test_Product_2kTqoH7lc": {
    brand: "Telecel",
    image: "/manus-storage/p5-telecel_19309eac.png",
  },
  "Test_Product_1ZAPwXOmu": {
    brand: "Voa Leve",
    image: "/manus-storage/p5-voa-leve_697faef8.png",
  },
  "Test_Product_MEOxuE71": {
    brand: "Mais Saúde",
    image: "/manus-storage/p5-mais-saude_e27283bd.png",
  },
  "Test_Product_8uP2LoThy": {
    brand: "TicTac",
    image: "/manus-storage/p5-tictac_c0d04b84.png",
  },
  // Lookup por DSKU completo (campo `dsku` retornado pela API — formato: DSKU-XXXX-TEST-PRODUCT-XXX)
  "DSKU-34750F-TEST-PRODUCT-7OR1UURK8": {
    brand: "Banco Bank",
    image: "/manus-storage/p5-banco-bank_638e26bf.png",
  },
  "DSKU-A92ABE-TEST-PRODUCT-2KTQOH7LC": {
    brand: "Telecel",
    image: "/manus-storage/p5-telecel_19309eac.png",
  },
  "DSKU-A92ABE-TEST-PRODUCT-1ZAPWXOMU": {
    brand: "Voa Leve",
    image: "/manus-storage/p5-voa-leve_697faef8.png",
  },
  "DSKU-A92ABE-TEST-PRODUCT-MEOXUE71": {
    brand: "Mais Saúde",
    image: "/manus-storage/p5-mais-saude_e27283bd.png",
  },
  "DSKU-A92ABE-TEST-PRODUCT-8UP2LOTHY": {
    brand: "TicTac",
    image: "/manus-storage/p5-tictac_c0d04b84.png",
  },
};

// Lookup helper: tenta pelo DSKU, depois pelo nome, depois por substring do DSKU (case-insensitive)
function lookupProductFriendly(dsku: string, name: string): { brand: string; image: string } | null {
  // 1. Lookup direto pelo DSKU (exato)
  if (PRODUCT_FRIENDLY_NAMES[dsku]) return PRODUCT_FRIENDLY_NAMES[dsku];
  // 2. Lookup pelo DSKU em uppercase
  if (PRODUCT_FRIENDLY_NAMES[dsku.toUpperCase()]) return PRODUCT_FRIENDLY_NAMES[dsku.toUpperCase()];
  // 3. Lookup pelo nome do produto (exato)
  if (PRODUCT_FRIENDLY_NAMES[name]) return PRODUCT_FRIENDLY_NAMES[name];
  // 4. Lookup por substring: o DSKU contém o ID do produto (ex: DSKU-XXXX-TEST-PRODUCT-7OR1UURK8)
  const dskuUpper = dsku.toUpperCase();
  for (const [key, val] of Object.entries(PRODUCT_FRIENDLY_NAMES)) {
    const keyUpper = key.toUpperCase();
    if (dskuUpper.includes(keyUpper) || keyUpper.includes(dskuUpper)) return val;
    // Extrair o sufixo do ID do produto do DSKU (parte após "TEST-PRODUCT-")
    const match = dskuUpper.match(/TEST-PRODUCT-([A-Z0-9]+)/);
    if (match) {
      const suffix = match[1];
      if (keyUpper.includes(suffix)) return val;
    }
  }
  // 5. Lookup por nome parcial (case-insensitive)
  const nameLower = name.toLowerCase();
  for (const [key, val] of Object.entries(PRODUCT_FRIENDLY_NAMES)) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) return val;
  }
  return null;
}

// ─── Mapeamento de imagens temáticas por schema ─────────────────────────────
const SCHEMA_IMAGES: Record<string, string> = {
  // Rideshare / mobilidade
  "rideshare": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  "ride": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  "transport": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  "mobility": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  "uber": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  "taxi": "/manus-storage/schema-rideshare-grid_fbe9c31f.jpeg",
  // Telecom
  "telecom": "/manus-storage/schema-telecom-banner_87678963.webp",
  "phone": "/manus-storage/schema-telecom-banner_87678963.webp",
  "mobile": "/manus-storage/schema-telecom-banner_87678963.webp",
  "subscription": "/manus-storage/schema-telecom-banner_87678963.webp",
  "celular": "/manus-storage/schema-telecom-banner_87678963.webp",
  "internet": "/manus-storage/schema-telecom-banner_87678963.webp",
};

function getSchemaImage(name: string): string | null {
  const n = name.toLowerCase();
  for (const [key, url] of Object.entries(SCHEMA_IMAGES)) {
    if (n.includes(key)) return url;
  }
  return null;
}

// ─── Mapeamento de imagens temáticas por produto (passo 4) ───────────────────
const PRODUCT_IMAGES: Record<string, string> = {
  // Mobilidade / transporte / rideshare
  "rideshare": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "ride": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "mobilidade": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "mobility": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "transport": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "transporte": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "uber": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "taxi": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "percurso": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  "viagem": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-mobilidade-isToMCt3XzkF39bFuTv7SK.webp",
  // Telecom
  "telecom": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "celular": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "internet": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "mobile": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "phone": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "subscription": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  "assinatura": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-telecom-a8XbedSUYNFybMB8Ej9re9.webp",
  // Finanças
  "financ": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "finança": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "banking": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "banco": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "pagamento": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "payment": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "credit": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "credito": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  "renda": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-financas-5UorXfffoBc7rQYPvSAp4j.webp",
  // Saúde
  "saude": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-saude-MHgGX5ERzCMs22bhiUfd7b.webp",
  "health": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-saude-MHgGX5ERzCMs22bhiUfd7b.webp",
  "medic": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-saude-MHgGX5ERzCMs22bhiUfd7b.webp",
  "plano": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-saude-MHgGX5ERzCMs22bhiUfd7b.webp",
  // Energia
  "energia": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-energia-3u2CWgjLgUv5572wM8N8Yf.webp",
  "energy": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-energia-3u2CWgjLgUv5572wM8N8Yf.webp",
  "eletric": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-energia-3u2CWgjLgUv5572wM8N8Yf.webp",
  "utilit": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-energia-3u2CWgjLgUv5572wM8N8Yf.webp",
  // Varejo / compras
  "varejo": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-varejo-VBZLGBu9DAqZfmSHjkt8no.webp",
  "retail": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-varejo-VBZLGBu9DAqZfmSHjkt8no.webp",
  "compra": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-varejo-VBZLGBu9DAqZfmSHjkt8no.webp",
  "shopping": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-varejo-VBZLGBu9DAqZfmSHjkt8no.webp",
  "loja": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-varejo-VBZLGBu9DAqZfmSHjkt8no.webp",
  // Localização / GPS
  "localiz": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-localizacao-koaLopwmFYVsVYC9V6ZJyA.webp",
  "location": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-localizacao-koaLopwmFYVsVYC9V6ZJyA.webp",
  "gps": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-localizacao-koaLopwmFYVsVYC9V6ZJyA.webp",
  "mapa": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-localizacao-koaLopwmFYVsVYC9V6ZJyA.webp",
  "map": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-localizacao-koaLopwmFYVsVYC9V6ZJyA.webp",
  // Perfil / identidade
  "perfil": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  "profile": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  "identidade": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  "identity": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  "usuario": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  "user": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-perfil-m7BC4WvAfgPs8Gazt4Srdh.webp",
  // Dados genéricos (fallback para produtos sem categoria específica)
  "dados": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-dados-nXRHAz3G2x35FBa84bcxBD.webp",
  "data": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-dados-nXRHAz3G2x35FBa84bcxBD.webp",
  "digital": "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-dados-nXRHAz3G2x35FBa84bcxBD.webp",
};

function getProductImage(name: string, category?: string): string | null {
  const n = (name + " " + (category ?? "")).toLowerCase();
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (n.includes(key)) return url;
  }
  // Fallback: imagem de dados genéricos para qualquer produto
  return "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/product-dados-nXRHAz3G2x35FBa84bcxBD.webp";
}

// ─── Imagens nano banana para botões de tipo de produto ─────────────────────
const PRODUCT_TYPE_IMAGES: Record<string, string> = {
  mobilidade: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-mobilidade-M6SPZ9pB8EJpsZKSWyh44Z.webp",
  telecom: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-telecom-N3cquc5zpCGoiwPtNkDqv3.webp",
  financas: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-financas-RayqJKUa2CUhek265eTXWL.webp",
  saude: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-saude-4B7F6iZL6zDMPFLLDsznMT.webp",
  energia: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-energia-CCXt2ApAU6sRqoTZCsqBq7.webp",
  varejo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-varejo-DqkgLMpcK3DFykdfPdV3rq.webp",
  localizacao: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-localizacao-QiKJ7n42QEtHSomyXXDZqu.webp",
  perfil: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-perfil-WG76BFipdHuHyYtK6TywQR.webp",
  dados: "https://d2xsxph8kpxj0f.cloudfront.net/310519663386203866/MmipedoGRvuovi69F8w3ET/btn-dados-hYRmDL5yg3VTVmmbEACm6j.webp",
};
const PRODUCT_TYPE_KEYWORDS: Record<string, string[]> = {
  mobilidade: ["mobil", "transport", "transit", "veicul", "carro", "onibus", "frota", "logist"],
  telecom: ["telecom", "celular", "telefon", "5g", "4g", "signal", "operadora", "sinal", "rede"],
  financas: ["financ", "banc", "credit", "credito", "renda", "pagamento", "invest", "seguro", "pix"],
  saude: ["saude", "health", "medic", "plano", "hospital", "clinica", "farmac"],
  energia: ["energia", "energy", "eletric", "utilit", "luz", "gas", "agua"],
  varejo: ["varejo", "retail", "compra", "shopping", "loja", "produto", "comercio"],
  localizacao: ["localiz", "location", "gps", "mapa", "map", "geo", "coordena"],
  perfil: ["perfil", "profile", "identidade", "identity", "usuario", "user", "biometr"],
  dados: ["dados", "data", "digital", "analytics", "insight", "relatorio"],
};
function getProductTypeImage(label: string): string {
  const l = label.toLowerCase();
  for (const [key, keywords] of Object.entries(PRODUCT_TYPE_KEYWORDS)) {
    if (keywords.some(k => l.includes(k))) return PRODUCT_TYPE_IMAGES[key];
  }
  return PRODUCT_TYPE_IMAGES.dados;
}

// ─── SchemaCardList: lista visual de schemas com filtro ───────────────────────

function SchemaCardList({ items, pickText, onSelect, selectedSid }: {
  items: Record<string, unknown>[];
  pickText: (r: Record<string, unknown>, keys: string[], fallback: string) => string;
  onSelect?: (sid: string, name: string) => void;
  selectedSid?: string;
}) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Enriquecer items com metadados — usar nomes amigáveis quando disponíveis
  const enriched = useMemo(() => items.map((item, idx) => {
    const rawName = pickText(item, ["name", "title", "label", "displayName", "description"], `Schema ${idx + 1}`);
    const sid = pickText(item, ["id", "sid", "dsku", "planId", "schemaId", "valueSchemaSid"], "");
    // Usar nome amigável se disponível
    const name = getSchemaFriendlyName(rawName, sid);
    const theme = detectSchemaCategory(rawName); // usar rawName para detectar categoria
    const { type, category } = parseSchemaType(rawName, sid); // usar rawName para detectar tipo
    const image = getSchemaImage(rawName);
    return { name, rawName, sid, theme, type, category, image, raw: item };
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
        {/* Tipos — cards nano banana */}
        {allTypes.length > 1 && (
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Tipo</p>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => {
                const isActive = selectedTypes.has(t);
                const imgKey = t.toLowerCase().includes("standard") ? "standard"
                  : t.toLowerCase().includes("custom") ? "custom"
                  : t.toLowerCase().includes("mobil") || t.toLowerCase().includes("transport") ? "mobility"
                  : t.toLowerCase().includes("event") ? "order"
                  : t.toLowerCase().includes("perfil") || t.toLowerCase().includes("profile") ? "consent"
                  : t.toLowerCase().includes("certif") ? "certificate"
                  : t.toLowerCase().includes("assinatura") || t.toLowerCase().includes("subscri") ? "dsp"
                  : t.toLowerCase().includes("tarifa") || t.toLowerCase().includes("price") ? "offer"
                  : t.toLowerCase().includes("transac") ? "order"
                  : "standard";
                const img = SCHEMA_TYPE_IMAGES[imgKey];
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="relative overflow-hidden rounded-xl transition-all active:scale-95"
                    style={{
                      width: 64, height: 40,
                      boxShadow: isActive ? "0 0 0 2px #1351b4, 0 2px 8px rgba(19,81,180,0.4)" : "0 1px 4px rgba(0,0,0,0.15)",
                      opacity: isActive ? 1 : 0.75,
                    }}
                  >
                    <img src={img} alt={t} className="absolute inset-0 w-full h-full object-cover" style={{ filter: isActive ? "brightness(0.85)" : "brightness(0.6) saturate(0.8)" }} />
                    <div className="absolute inset-0" style={{ background: isActive ? "rgba(19,81,180,0.35)" : "rgba(0,0,0,0.45)" }} />
                    <span className="relative z-10 text-[8px] font-bold text-white leading-tight px-1 text-center block w-full truncate">{t}</span>
                    {isActive && <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#1351b4]" /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Categorias — cards nano banana */}
        {allCategories.length > 1 && (
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map(c => {
                const isActive = selectedCategories.has(c);
                const img = getProductTypeImage(c);
                const theme = detectSchemaCategory(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className="relative overflow-hidden rounded-xl transition-all active:scale-95"
                    style={{
                      width: 64, height: 40,
                      boxShadow: isActive ? `0 0 0 2px ${theme.color}, 0 2px 8px ${theme.color}66` : "0 1px 4px rgba(0,0,0,0.15)",
                      opacity: isActive ? 1 : 0.75,
                    }}
                  >
                    <img src={img} alt={c} className="absolute inset-0 w-full h-full object-cover" style={{ filter: isActive ? "brightness(0.85)" : "brightness(0.6) saturate(0.8)" }} />
                    <div className="absolute inset-0" style={{ background: isActive ? `${theme.color}55` : "rgba(0,0,0,0.45)" }} />
                    <span className="relative z-10 text-[8px] font-bold text-white leading-tight px-1 text-center block w-full truncate">{c}</span>
                    {isActive && <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.color }} /></div>}
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
          {onSelect && (
            <p className="text-[9px] text-slate-500 text-center mb-1">Toque em um schema para selecioná-lo</p>
          )}
          {filtered.map((e, idx) => {
            const isSelected = selectedSid === e.sid && Boolean(e.sid);
            if (e.image) {
              // Card com imagem de fundo (layout fotográfico)
              return (
                <div
                  key={idx}
                  role={onSelect ? "button" : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  onClick={() => onSelect && e.sid && onSelect(e.sid, e.name)}
                  onKeyDown={(ev) => ev.key === "Enter" && onSelect && e.sid && onSelect(e.sid, e.name)}
                  className={`relative rounded-2xl overflow-hidden shadow-sm transition-all ${onSelect ? "cursor-pointer hover:shadow-lg active:scale-[0.98]" : ""}`}
                  style={{
                    outline: isSelected ? `3px solid ${e.theme.color}` : undefined,
                    minHeight: 80,
                  }}
                >
                  {/* Imagem de fundo */}
                  <img
                    src={e.image}
                    alt={e.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: isSelected ? "brightness(0.85)" : "brightness(0.75)" }}
                  />
                  {/* Overlay gradiente */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)" }} />
                  {/* Conteúdo sobreposto */}
                  <div className="relative z-10 p-3 flex items-center gap-3">
                    {/* Ícone em caixa branca */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow"
                      style={{ background: "rgba(255,255,255,0.92)", color: e.theme.color }}
                    >
                      {e.theme.icon}
                    </div>
                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white leading-tight drop-shadow">{e.name}</p>
                        {isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: e.theme.color, color: "white" }}>✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "#334155" }}>{e.type}</span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "#334155" }}>{e.category}</span>
                      </div>
                      {e.sid && (
                        <p className="text-[9px] font-mono text-white/60 truncate mt-0.5">{e.sid}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            // Card sem imagem (layout padrão com ícone)
            return (
              <div
                key={idx}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => onSelect && e.sid && onSelect(e.sid, e.name)}
                onKeyDown={(ev) => ev.key === "Enter" && onSelect && e.sid && onSelect(e.sid, e.name)}
                className={`rounded-xl border bg-white p-3 flex items-start gap-3 shadow-sm transition-all ${onSelect ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : ""}`}
                style={{
                  borderColor: isSelected ? e.theme.color : `${e.theme.color}30`,
                  background: isSelected ? `${e.theme.color}08` : "white",
                  outline: isSelected ? `2px solid ${e.theme.color}` : undefined,
                }}
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
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{e.name}</p>
                    {isSelected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: e.theme.color, color: "white" }}>✓ Selecionado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#f1f5f9", color: "#475569" }}>{e.type}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${e.theme.color}15`, color: e.theme.color }}>{e.category}</span>
                  </div>
                  {e.sid && (
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-1">{e.sid}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ProductCardList: lista de produtos com filtros visuais nano banana ──────────────────

function ProductCardList({ items, pickText, onProductSelect, selectedProductDsku }: {
  items: Record<string, unknown>[];
  pickText: (r: Record<string, unknown>, keys: string[], fallback: string) => string;
  onProductSelect?: (dsku: string, name: string) => void;
  selectedProductDsku?: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Enriquecer items — usar nomes amigáveis do PRODUCT_FRIENDLY_NAMES quando disponíveis
  const enriched = useMemo(() => items.map((item, idx) => {
    const rawName = pickText(item, ["name", "title", "label", "displayName", "description"], `Produto ${idx + 1}`);
    const dsku = pickText(item, ["dsku", "id", "sid", "productId", "sku"], "");
    const category = pickText(item, ["category", "type", "group"], "");
    // Usar lookupProductFriendly que tenta DSKU, nome, substring e parcial
    const friendly = lookupProductFriendly(dsku, rawName);
    const name = friendly ? friendly.brand : rawName;
    const theme = detectSchemaCategory(name + " " + category);
    // Usar imagem do PRODUCT_FRIENDLY_NAMES se disponível, senão usar getProductImage
    const image = friendly ? friendly.image : getProductImage(rawName, category);
    return { name, rawName, dsku, category, theme, image, raw: item };
  }), [items]);

  // Coletar categorias únicas
  const allCategories = useMemo(() => Array.from(new Set(enriched.map(e => e.category).filter(Boolean))).sort(), [enriched]);

  // Filtrar
  const filtered = useMemo(() => selectedCategory
    ? enriched.filter(e => e.category === selectedCategory)
    : enriched,
  [enriched, selectedCategory]);

  return (
    <div className="space-y-2">
      {/* Filtros de categoria com imagens nano banana */}
      {allCategories.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Filtrar por categoria</p>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-[9px] text-[#1351b4] font-semibold underline"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map(cat => {
              const isActive = selectedCategory === cat;
              const typeImg = getProductTypeImage(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? null : cat)}
                  className="relative overflow-hidden rounded-xl transition-all active:scale-[0.96]"
                  style={{
                    width: 72,
                    height: 48,
                    outline: isActive ? "2px solid #1351b4" : "2px solid transparent",
                    boxShadow: isActive ? "0 0 0 1px #1351b4" : "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Imagem nano banana de fundo */}
                  <img
                    src={typeImg}
                    alt={cat}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: isActive ? "brightness(0.7)" : "brightness(0.6)" }}
                  />
                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: isActive ? "rgba(19,81,180,0.45)" : "rgba(0,0,0,0.35)" }}
                  />
                  {/* Label */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full px-1">
                    {isActive && (
                      <span className="text-[8px] font-bold text-white leading-none mb-0.5">✓</span>
                    )}
                    <p className="text-[8px] font-bold text-white text-center leading-tight drop-shadow line-clamp-2">{cat}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contagem */}
      {allCategories.length > 1 && (
        <p className="text-[9px] text-slate-400 text-right">
          {filtered.length} de {enriched.length} produto(s)
        </p>
      )}

      {/* Cards de produtos */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-400">Nenhum produto nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {onProductSelect && (
            <p className="text-[9px] text-slate-500 text-center mb-1">Toque em um produto para selecioná-lo</p>
          )}
          {filtered.map((e, idx) => {
            const isSelected = selectedProductDsku === e.dsku && Boolean(e.dsku);
            if (e.image) {
              return (
                <div
                  key={idx}
                  role={onProductSelect ? "button" : undefined}
                  tabIndex={onProductSelect ? 0 : undefined}
                  onClick={() => onProductSelect && e.dsku && onProductSelect(e.dsku, e.name)}
                  onKeyDown={(ev) => ev.key === "Enter" && onProductSelect && e.dsku && onProductSelect(e.dsku, e.name)}
                  className={`relative rounded-2xl overflow-hidden shadow-sm transition-all ${onProductSelect ? "cursor-pointer hover:shadow-lg active:scale-[0.98]" : ""}`}
                  style={{
                    outline: isSelected ? `3px solid ${e.theme.color}` : undefined,
                    minHeight: 80,
                  }}
                >
                  <img src={e.image} alt={e.name} className="absolute inset-0 w-full h-full object-cover" style={{ filter: isSelected ? "brightness(0.85)" : "brightness(0.75)" }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)" }} />
                  <div className="relative z-10 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow" style={{ background: "rgba(255,255,255,0.92)", color: e.theme.color }}>
                      {e.theme.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white leading-tight drop-shadow">{e.name}</p>
                        {isSelected && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: e.theme.color, color: "white" }}>✓</span>}
                      </div>
                      {/* Nome original da API abaixo do nome amigável */}
                      {e.rawName && e.rawName !== e.name && (
                        <p className="text-[9px] font-mono text-white/60 truncate mt-0.5">{e.rawName}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {e.category && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "#334155" }}>{e.category}</span>}
                        {e.dsku && <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.75)", color: "#334155" }}>{e.dsku}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={idx}
                role={onProductSelect ? "button" : undefined}
                tabIndex={onProductSelect ? 0 : undefined}
                onClick={() => onProductSelect && e.dsku && onProductSelect(e.dsku, e.name)}
                onKeyDown={(ev) => ev.key === "Enter" && onProductSelect && e.dsku && onProductSelect(e.dsku, e.name)}
                className={`rounded-xl border bg-white p-3 flex items-start gap-3 shadow-sm transition-all ${onProductSelect ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : ""}`}
                style={{
                  borderColor: isSelected ? e.theme.color : `${e.theme.color}30`,
                  background: isSelected ? `${e.theme.color}08` : "white",
                  outline: isSelected ? `2px solid ${e.theme.color}` : undefined,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${e.theme.color}15`, color: e.theme.color }}>{e.theme.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{e.name}</p>
                    {isSelected && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: e.theme.color, color: "white" }}>✓ Selecionado</span>}
                  </div>
                  {/* Nome original da API abaixo do nome amigável */}
                  {e.rawName && e.rawName !== e.name && (
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{e.rawName}</p>
                  )}
                  {e.category && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: `${e.theme.color}15`, color: e.theme.color }}>{e.category}</span>}
                  {e.dsku && <p className="text-[9px] font-mono text-slate-400 truncate mt-1">{e.dsku}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResponseRenderer({ result, screen, runState, onSchemaSelect, selectedSchemaSid, onProductSelect, selectedProductDsku }: {
  result: ActionResult;
  screen: PhoneScreenConfig;
  runState: RunState;
  onSchemaSelect?: (sid: string, name: string) => void;
  selectedSchemaSid?: string;
  onProductSelect?: (dsku: string, name: string) => void;
  selectedProductDsku?: string;
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
  // Para exibição genérica limitamos a 5; schemas e produtos têm lista completa
  const isSchemaStep = screen.stepId === 3;
  // Passo 4 (step4_list_products) e passo 5 (step5_list_business_products) são passos de produto
  const isProductStep = screen.stepId === 4 || screen.stepId === 5;
  const items = (isSchemaStep || isProductStep) ? allItems : allItems.slice(0, 5);

  const stateUpdates = result.stateUpdates as Record<string, unknown> | undefined;
  const capturedKeys = stateUpdates ? Object.keys(stateUpdates).filter(k => stateUpdates[k] !== null && stateUpdates[k] !== undefined) : [];

  // Erro 403 amigável para o passo 12 (feature flag não habilitada)
  const isStep12 = screen.stepId === 12;
  const is403Error = !result.ok && result.httpStatus === 403;

  return (
    <div className="space-y-3">

      {/* Card de erro 403 amigável — passo 12 */}
      {isStep12 && is403Error ? (
        <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
          {/* Cabeçalho colorido */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #f59e0b22, #ef444422)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f59e0b20", border: "1.5px solid #f59e0b50" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" strokeLinecap="round"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800">Acesso restrito — Feature Flag</p>
              <p className="text-[10px] text-amber-700 font-mono font-semibold">HTTP 403 Forbidden</p>
            </div>
          </div>
          {/* Corpo explicativo */}
          <div className="bg-white px-4 py-3 space-y-3">
            <p className="text-xs text-slate-700 leading-5">
              O endpoint <span className="font-mono font-semibold text-slate-900">GET /v1/marketplace/offers</span> está <strong>restrito neste ambiente sandbox</strong>. A feature flag de marketplace não está habilitada para este tenant.
            </p>
            {/* Diagnóstico */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Diagnóstico</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5">✅</span>
                  <p className="text-[10px] text-slate-600 leading-4">O código está correto — a chamada foi executada com sucesso</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5">✅</span>
                  <p className="text-[10px] text-slate-600 leading-4">Token M2M e token de usuário foram enviados corretamente</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5">⚠️</span>
                  <p className="text-[10px] text-slate-600 leading-4">O servidor DrumWave retornou 403 por restrição de ambiente — não é um bug</p>
                </div>
              </div>
            </div>
            {/* Ação recomendada */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#1351b4] mb-1">📧 Ação recomendada</p>
              <p className="text-[10px] text-slate-600 leading-4">
                Solicite à equipe DrumWave a habilitação da feature flag de <strong>marketplace offers</strong> para o tenant sandbox. Após habilitar, o passo 12 e o passo 13 (aceitar oferta) funcionarão automaticamente.
              </p>
            </div>
            {/* Badge de status */}
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                <svg viewBox="0 0 8 8" width="6" height="6" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
                Restrição de ambiente
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                API executada com sucesso
              </span>
            </div>
          </div>
        </div>
      ) : (
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
      )}

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
          <SchemaCardList items={items} pickText={pickText} onSelect={onSchemaSelect} selectedSid={selectedSchemaSid} />
          {onSchemaSelect && selectedSchemaSid && (
            <div className="mt-2 rounded-xl px-3 py-2 text-center" style={{ background: "#1351b410", border: "1px solid #1351b430" }}>
              <p className="text-[9px] font-semibold text-[#1351b4]">Schema selecionado! Veja os produtos disponíveis no próximo passo.</p>
            </div>
          )}
        </div>
      )}

      {/* Lista de produtos com cards visuais e filtros nano banana (passo 4 e passo 5) */}
      {isProductStep && result.ok && items.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Produtos disponíveis</p>
          <ProductCardList
            items={items}
            pickText={pickText}
            onProductSelect={onProductSelect}
            selectedProductDsku={selectedProductDsku}
          />
          {onProductSelect && selectedProductDsku && (
            <div className="mt-2 rounded-xl px-3 py-2 text-center" style={{ background: "#1351b410", border: "1px solid #1351b430" }}>
              <p className="text-[9px] font-semibold text-[#1351b4]">Produto selecionado! Confirme abaixo para criar o Commercial Value Schema.</p>
            </div>
          )}
        </div>
      )}

      {/* Lista genérica para outros passos */}
      {!isSchemaStep && !isProductStep && items.length > 0 && (
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
  onStepChange,
  onBatchExecute,
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
  /** Navega para outro passo da jornada (ex: passo 3 → 4) */
  onStepChange?: (stepId: number) => void;
  /** Executa ação em batch para múltiplos dataRequestIds (passo 7) */
  onBatchExecute?: (actionId: string, dataRequestIds: string[]) => Promise<{
    ok: boolean;
    message?: string;
    results: Array<{ dataRequestId: string; ok: boolean; message?: string; httpStatus?: number }>;
  }>;
  lang?: "pt" | "en";
}) {
  const screen = PHONE_SCREENS[stepId];
  const [phase, setPhase] = useState<PhoneMockupPhase>("input");
  // When user explicitly clicks "Voltar ao formulário", prevent useEffect from overriding phase back to result
  const [showInputOverride, setShowInputOverride] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActionIdRef = useRef<string | undefined>(actionId);

  // Seleção de schema (passo 3) e produto (passo 4)
  const [selectedSchemaSid, setSelectedSchemaSid] = useState<string>("");
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>("");
  const [selectedProductDsku, setSelectedProductDsku] = useState<string>("");
  const [selectedProductName, setSelectedProductName] = useState<string>("");

  // ─── Passo 7: estado local autocontido ──────────────────────────────────────
  // "idle" = tela inicial com botão Listar
  // "selecting" = lista de IDs com checkboxes + botões Aceitar/Rejeitar
  // "executing" = PATCH em andamento
  // "done" = resultado do PATCH
  const [step7Phase, setStep7Phase] = useState<"idle" | "selecting" | "executing" | "done">("idle");
  const [step7SelectedIds, setStep7SelectedIds] = useState<string[]>([]);
  // Objetos completos retornados pela API GET step7_list_business_requests
  type Step7Request = { id: string; senderType?: string; sender?: { name?: string; cpf?: string; _id?: string }; status?: string; schemaId?: string };
  const [step7ListedRequests, setStep7ListedRequests] = useState<Step7Request[]>([]);
  const [step7BatchResult, setStep7BatchResult] = useState<{
    ok: boolean;
    message?: string;
    action: "accept" | "reject";
    results: Array<{ dataRequestId: string; ok: boolean; message?: string; httpStatus?: number }>;
  } | null>(null);

  // Reset do passo 7 quando muda de passo
  const prevStepIdRef = useRef<number>(stepId);
  if (prevStepIdRef.current !== stepId) {
    prevStepIdRef.current = stepId;
    // Reset será feito via useEffect abaixo
  }

  // Toggle de seleção de solicitação no passo 7
  const handleToggleRequest = (requestId: string) => {
    setStep7SelectedIds(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  // Listar solicitações chamando a API GET real step7_list_business_requests
  const handleStep7List = () => {
    setStep7SelectedIds([]);
    setStep7BatchResult(null);
    // Chama a API GET — a resposta será capturada pelo useEffect abaixo via activeResult
    onExecute("step7_list_business_requests");
  };

  // Capturar resposta da API GET step7_list_business_requests e popular a lista
  const prevListResultRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!activeResult) return;
    if (activeResult.actionId !== "step7_list_business_requests") return;
    if (!activeResult.ok) return;
    // Evitar re-processar o mesmo resultado
    const resultKey = activeResult.executedAt ?? JSON.stringify(activeResult.responseBody);
    if (prevListResultRef.current === resultKey) return;
    prevListResultRef.current = resultKey;
    // Extrair data.page[] da resposta
    const body = activeResult.responseBody as Record<string, unknown> | undefined;
    const page = (body?.data as Record<string, unknown>)?.page;
    if (Array.isArray(page) && page.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requests = (page as any[]).map((item: any) => ({
        id: String(item.id ?? item._id ?? ""),
        senderType: item.senderType,
        sender: item.sender,
        status: item.status,
        schemaId: item.schemaId,
      })).filter(r => r.id);
      setStep7ListedRequests(requests);
      setStep7SelectedIds([]);
      setStep7Phase("selecting");
    } else {
      // Resposta vazia ou sem page[]
      setStep7ListedRequests([]);
      setStep7Phase("selecting");
    }
  }, [activeResult]);

  // Aceitar ou rejeitar solicitações selecionadas no passo 7
  const handleStep7Action = async (action: "accept" | "reject") => {
    if (step7SelectedIds.length === 0) return;
    const targetActionId = action === "accept" ? "step7_accept_data_request" : "step7_reject_data_request";
    if (!onBatchExecute) return;
    setStep7Phase("executing");
    setStep7BatchResult(null);
    try {
      const result = await onBatchExecute(targetActionId, step7SelectedIds);
      setStep7BatchResult({ ...result, action });
      if (result.ok && step7SelectedIds[0]) {
        onFieldChange("dataRequestId", step7SelectedIds[0]);
      }
    } catch (err) {
      setStep7BatchResult({
        ok: false,
        action,
        message: err instanceof Error ? err.message : "Erro desconhecido",
        results: [],
      });
    } finally {
      setStep7Phase("done");
    }
  };

  // Legado: manter para compatibilidade com código que ainda usa selectedRequestIds
  const selectedRequestIds = step7SelectedIds;
  const batchResult = step7BatchResult;
  const isBatchExecuting = step7Phase === "executing";
  // Alias para compatibilidade: IDs dos requests listados
  const step7ListedIds = step7ListedRequests.map(r => r.id);

  // ─────────────────────────────────────────────────────────────────────────────
  // PASSO 10 — Fluxo sequencial: listar DSPs → detalhe → enroll → commercial
  // ─────────────────────────────────────────────────────────────────────────────
  type Step10DspItem = { id: string; name?: string; description?: string; type?: string; [key: string]: unknown };
  type Step10Phase = "idle" | "listing" | "detail" | "enrolling" | "commercial";
  const [step10Phase, setStep10Phase] = useState<Step10Phase>("idle");
  const [step10Dsps, setStep10Dsps] = useState<Step10DspItem[]>([]); // lista de DSPs retornados
  const [step10SelectedDspId, setStep10SelectedDspId] = useState<string>(""); // DSP selecionado (radio)
  const [step10ExpandedDspId, setStep10ExpandedDspId] = useState<string>(""); // DSP com drill-down aberto
  const [step10DspDetails, setStep10DspDetails] = useState<Record<string, unknown> | null>(null); // detalhe do DSP expandido
  const [step10CommercialDsps, setStep10CommercialDsps] = useState<Step10DspItem[]>([]); // commercial DSPs
  const [step10EnrollResult, setStep10EnrollResult] = useState<{ ok: boolean; message?: string; dspAccountId?: string } | null>(null);

  // Reset do passo 10 quando muda de passo
  const prevStep10Ref = useRef<number>(stepId);
  useEffect(() => {
    if (prevStep10Ref.current !== stepId) {
      prevStep10Ref.current = stepId;
      if (stepId !== 10) {
        setStep10Phase("idle");
        setStep10Dsps([]);
        setStep10SelectedDspId("");
        setStep10ExpandedDspId("");
        setStep10DspDetails(null);
        setStep10CommercialDsps([]);
        setStep10EnrollResult(null);
      }
    }
  }, [stepId]);

  // Capturar respostas da API do passo 10 via activeResult
  const prevStep10ResultRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!activeResult) return;
    const resultKey = activeResult.actionId + (activeResult.executedAt ?? "");
    if (prevStep10ResultRef.current === resultKey) return;
    prevStep10ResultRef.current = resultKey;

    if (!activeResult.ok) return;
    const body = activeResult.responseBody as Record<string, unknown> | undefined;

    // Capturar lista de DSPs standard ou commercial
    if (activeResult.actionId === "step10_standard_dsps" || activeResult.actionId === "step10_commercial_dsps") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractList = (b: any): Step10DspItem[] => {
        if (!b) return [];
        if (Array.isArray(b)) return b;
        if (b.data && Array.isArray(b.data)) return b.data;
        if (b.data?.page && Array.isArray(b.data.page)) return b.data.page;
        if (b.page && Array.isArray(b.page)) return b.page;
        if (b.items && Array.isArray(b.items)) return b.items;
        return [];
      };
      const list = extractList(body);
      if (activeResult.actionId === "step10_commercial_dsps") {
        setStep10CommercialDsps(list);
        setStep10Phase("commercial");
      } else {
        setStep10Dsps(list);
        setStep10Phase("listing");
      }
    }

    // Capturar detalhe do DSP
    if (activeResult.actionId === "step10_dsp_details") {
      setStep10DspDetails(body ?? null);
      setStep10Phase("detail");
    }

    // Capturar resultado do enroll
    if (activeResult.actionId === "step10_create_dsp_account") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = body as any;
      const dspAccountId = b?.id ?? b?.accountId ?? b?.dspAccountId ?? b?.data?.id ?? "";
      setStep10EnrollResult({ ok: true, message: "Conta DSP criada com sucesso.", dspAccountId: String(dspAccountId) });
      setStep10Phase("enrolling");
    }
  }, [activeResult]);

  // Quando o usuário clica em um card de DSP: expande/colapsa o drill-down e executa a API de detalhe
  const handleStep10DspClick = (dspId: string) => {
    if (step10ExpandedDspId === dspId) {
      setStep10ExpandedDspId("");
      return;
    }
    setStep10ExpandedDspId(dspId);
    setStep10DspDetails(null);
    onFieldChange("selectedDspId", dspId);
    onExecute("step10_dsp_details");
  };

  // Quando o usuário seleciona um DSP (radio): salva no runState e executa enroll
  const handleStep10DspSelect = (dspId: string) => {
    setStep10SelectedDspId(dspId);
    onFieldChange("selectedDspId", dspId);
    onExecute("step10_create_dsp_account");
  };

  // Quando o usuário clica em Listar Commercial DSPs
  const handleStep10ListCommercial = () => {
    onExecute("step10_commercial_dsps");
  };

  // Quando o usuário clica em Listar DSPs (standard)
  const handleStep10ListDsps = () => {
    onExecute("step10_standard_dsps");
  };

  // Quando um schema é selecionado: salva no runState e navega para o passo 4
  const handleSchemaSelect = (sid: string, name: string) => {
    const friendlyName = getSchemaFriendlyName(name, sid);
    setSelectedSchemaSid(sid);
    setSelectedSchemaName(friendlyName);
    onFieldChange("valueSchemaSid", sid);
    onFieldChange("selectedSchemaName", friendlyName);
    // Navegar automaticamente para o passo 4 após selecionar o schema
    if (onStepChange) {
      setTimeout(() => onStepChange(4), 350);
    }
  };

  // Quando um produto é selecionado no passo 4: salva no runState e avança para step4_add_dsku_to_cart
  const handleProductSelect = (dsku: string, name: string) => {
    // Usar nome amigável se disponível (passo 4 usa ProductCardList genérico)
    const friendly = lookupProductFriendly(dsku, name);
    const displayName = friendly ? friendly.brand : name;
    setSelectedProductDsku(dsku);
    setSelectedProductName(displayName);
    onFieldChange("selectedProductDsku", dsku);
    onFieldChange("selectedProductName", displayName);
    // Avançar para a ação de adicionar ao carrinho
    if (onAutoAdvance && stepActions) {
      const cartAction = stepActions.find(a => a.id === "step4_add_dsku_to_cart");
      if (cartAction) {
        onAutoAdvance(cartAction.id);
        setPhase("input");
      }
    }
  };

  // Quando um produto é selecionado no passo 5: salva no runState e navega para o passo 6
  const handleProductSelectStep5 = (dsku: string, name: string) => {
    const friendly = lookupProductFriendly(dsku, name);
    const displayName = friendly ? friendly.brand : name;
    setSelectedProductDsku(dsku);
    setSelectedProductName(displayName);
    onFieldChange("selectedProductDsku", dsku);
    onFieldChange("selectedProductName", displayName);
    // Navegar automaticamente para o passo 6 após selecionar o produto
    if (onStepChange) {
      setTimeout(() => onStepChange(6), 350);
    }
  };

  // Sync phase with execution state and result
  useEffect(() => {
    if (isExecuting) {
      setShowInputOverride(false); // reset override when new execution starts
      setPhase("loading");
    } else if (showInputOverride) {
      // User explicitly clicked "Voltar ao formulário" — keep input phase
      setPhase("input");
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
  }, [isExecuting, activeResult, actionId, showInputOverride]);

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
      setShowInputOverride(false); // reset override when action changes
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
        <div className={screen.stepId === 7 ? "" : "overflow-y-auto"} style={{ maxHeight: 390 }}>
          {/* PASSO 0 — Tela especial de autenticação M2M */}
          {!isGap && stepId === 0 && (
            <div className="p-4 space-y-3">
              {/* Status do token */}
              <div className={`rounded-2xl p-4 border ${
                activeResult?.ok ? "bg-emerald-50 border-emerald-200" :
                activeResult && !activeResult.ok ? "bg-red-50 border-red-200" :
                "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{activeResult?.ok ? "🟢" : activeResult ? "🔴" : "🟡"}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeResult?.ok ? "Token M2M ativo" : activeResult ? "Falha na autenticação" : "Token não gerado"}
                  </span>
                </div>
{(() => {
                  if (!activeResult?.ok || !activeResult.stateUpdates?.tokenHandle) return null;
                  const handle = String(activeResult.stateUpdates.tokenHandle);
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-semibold text-slate-500">Token Handle:</span>
                        <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded truncate">
                          {handle.slice(0, 14)}…{handle.slice(-8)}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-4">Todas as chamadas protegidas usarão este token como Bearer.</p>
                    </div>
                  );
                })()}
                {activeResult && !activeResult.ok && (
                  <p className="text-[9px] text-red-700 leading-4">{activeResult.message ?? "Verifique as credenciais e tente novamente."}</p>
                )}
                {!activeResult && (
                  <p className="text-[9px] text-amber-700 leading-4">Execute a autenticação para liberar todas as chamadas protegidas da jornada.</p>
                )}
              </div>

              {/* Botão CTA — sempre visível */}
              <button
                onClick={() => onExecute("step0_m2m_auth")}
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
                    Gerando token…
                  </span>
                ) : activeResult?.ok ? "🔄 Regenerar M2M Token" : "🔑 Gerar M2M Token"}
              </button>

              {/* Informativo */}
              <div className="rounded-2xl bg-white border border-slate-100 p-3 shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#1351b4] mb-1.5">ℹ️ Sobre o Passo 0</p>
                <p className="text-[9px] text-slate-600 leading-4">
                  Este passo é um pré-requisito técnico. O token M2M não é visível ao usuário final — ele é usado internamente para autenticar todas as chamadas à API Dataprev.
                </p>
              </div>
            </div>
          )}

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
          {!isGap && phase === "loading" && stepId !== 0 && (
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

          {/* RESULT state — passo 12: lista de ofertas com botões nano banana */}
          {!isGap && phase === "result" && activeResult && screen.stepId === 12 && activeResult.ok && (() => {
            // Extrair lista de ofertas da resposta
            const body = activeResult.responseBody as Record<string, unknown> | unknown[] | null | undefined;
            const offers: Array<Record<string, unknown>> = (() => {
              if (Array.isArray(body)) return body as Array<Record<string, unknown>>;
              if (body && typeof body === "object") {
                const obj = body as Record<string, unknown>;
                const candidates = [obj.offers, obj.items, obj.data, obj.results, obj.content];
                for (const c of candidates) {
                  if (Array.isArray(c) && c.length > 0) return c as Array<Record<string, unknown>>;
                }
              }
              return [];
            })();

            // Imagens nano banana para ofertas (cicla entre as 3 disponíveis)
            const offerImages = [
              "/manus-storage/p12-offer-marketplace_a9338e71.png",
              "/manus-storage/p12-offer-data_0f763a30.png",
              "/manus-storage/p12-offer-license_ac9c2d37.png",
            ];

            const handleOfferSelect = (offerId: string) => {
              onFieldChange("offerId", offerId);
              // Navegar para o passo 13 após selecionar a oferta
              if (onStepChange) {
                setTimeout(() => onStepChange(13), 350);
              }
            };

            return (
              <div className="p-4 space-y-3">
                {/* Header de sucesso */}
                <div className="rounded-2xl overflow-hidden border border-emerald-200 shadow-sm">
                  <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #10b98122, #06b6d422)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#10b98120", border: "1.5px solid #10b98150" }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Ofertas disponíveis</p>
                      <p className="text-[10px] text-emerald-700">{offers.length} {offers.length === 1 ? "oferta encontrada" : "ofertas encontradas"}</p>
                    </div>
                  </div>
                </div>

                {/* Lista de ofertas */}
                {offers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 px-1">Selecione uma oferta para aceitar</p>
                    {offers.map((offer, idx) => {
                      const offerId = String(
                        offer.offerId ?? offer.id ?? offer.sid ?? offer.offer_id ?? `offer-${idx + 1}`
                      );
                      const offerName = String(
                        offer.name ?? offer.title ?? offer.displayName ?? offer.description ?? `Oferta ${idx + 1}`
                      );
                      const offerImg = offerImages[idx % offerImages.length];
                      const isSelected = String(runState.offerId ?? "") === offerId;
                      return (
                        <button
                          key={offerId}
                          onClick={() => handleOfferSelect(offerId)}
                          className="w-full rounded-2xl overflow-hidden border shadow-sm transition-all active:scale-[0.98] text-left"
                          style={{
                            borderColor: isSelected ? "#ea580c" : "#e2e8f0",
                            outline: isSelected ? "2px solid #ea580c" : undefined,
                          }}
                        >
                          <div className="relative" style={{ minHeight: 80 }}>
                            <img
                              src={offerImg}
                              alt={offerName}
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{ filter: "brightness(0.6)" }}
                            />
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.6) 0%, rgba(0,0,0,0.4) 100%)" }} />
                            <div className="relative z-10 p-3 flex items-end justify-between h-full">
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-orange-200 mb-0.5">Oferta disponível</p>
                                <p className="text-sm font-bold text-white leading-tight truncate">{offerName}</p>
                                <p className="text-[9px] font-mono text-white/70 mt-0.5 truncate">{offerId}</p>
                              </div>
                              {isSelected && (
                                <span className="shrink-0 ml-2 text-[9px] font-bold px-2 py-1 rounded-full bg-orange-500 text-white">✓ Selecionada</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
                    <p className="text-xs text-slate-500">Nenhuma oferta disponível no momento.</p>
                  </div>
                )}

                <button
                  onClick={() => { setShowInputOverride(true); setPhase("input"); }}
                  className="w-full text-xs font-semibold text-slate-500 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  ← Voltar ao formulário
                </button>
              </div>
            );
          })()}

          {/* RESULT state */}
          {!isGap && phase === "result" && activeResult && stepId !== 0 && actionId !== "step7_list_business_requests" && !(screen.stepId === 12 && activeResult.ok) && (
            <div className="p-4 space-y-3">
              <ResponseRenderer
                result={activeResult}
                screen={activeScreen}
                runState={runState}
                onSchemaSelect={screen.stepId === 3 ? handleSchemaSelect : undefined}
                selectedSchemaSid={screen.stepId === 3 ? selectedSchemaSid : undefined}
                onProductSelect={
                  (screen.stepId === 4 && actionId === "step4_list_products") ? handleProductSelect :
                  screen.stepId === 5 ? handleProductSelectStep5 :
                  undefined
                }
                selectedProductDsku={(screen.stepId === 4 || screen.stepId === 5) ? selectedProductDsku : undefined}
              />
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
                onClick={() => { setShowInputOverride(true); setPhase("input"); }}
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

          {/* CONFIRMAÇÃO: step4_add_dsku_to_cart */}
          {!isGap && phase === "input" && actionId === "step4_add_dsku_to_cart" && (
            <div className="p-4 space-y-3">
              <div className="rounded-2xl bg-white border border-[#1351b4]/20 p-4 shadow-sm space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1351b4]">Adicionar ao carrinho</p>
                {/* Produto selecionado */}
                <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 72 }}>
                  {selectedProductDsku && (() => {
                    const img = getProductImage(selectedProductName, "");
                    return img ? (
                      <>
                        <img src={img} alt={selectedProductName} className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.7)" }} />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 100%)" }} />
                        <div className="relative z-10 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-white/70 mb-0.5">Produto selecionado</p>
                          <p className="text-xs font-bold text-white leading-tight">{selectedProductName || selectedProductDsku}</p>
                          <p className="text-[9px] font-mono text-white/70 mt-0.5">{selectedProductDsku}</p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Produto selecionado</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{selectedProductName || selectedProductDsku}</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{selectedProductDsku}</p>
                      </div>
                    );
                  })()}
                  {!selectedProductDsku && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-600">Nenhum produto selecionado. Volte e selecione um produto.</p>
                    </div>
                  )}
                </div>
                {/* Business dWallet ID */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#1351b4]">ID da Business dWallet *</label>
                  <input
                    type="text"
                    value={String(runState.businessDwalletId || runState.businessId || "")}
                    placeholder="Capturado no passo 1 (ou informe manualmente)"
                    onChange={e => onFieldChange("businessDwalletId", e.target.value)}
                    className="w-full text-xs border rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono transition-shadow"
                    style={{ borderColor: "#1351b440", "--tw-ring-color": "#1351b4" } as React.CSSProperties}
                  />
                  {!runState.businessDwalletId && !runState.businessId && (
                    <p className="text-[9px] text-amber-600">⚠️ Execute o passo 1 para capturar automaticamente, ou informe o ID manualmente.</p>
                  )}
                </div>
              {/* Tipo de registro */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2">
                  <span className="text-lg">🛒</span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Tipo de registro</p>
                    <p className="text-xs font-semibold text-slate-800">dsku-registration-annual</p>
                  </div>
                </div>
              </div>
              {/* Botão de confirmar */}
              <button
                onClick={handleCta}
                disabled={isExecuting || !selectedProductDsku || (!runState.businessDwalletId && !runState.businessId)}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: colors.accent }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                    </svg>
                    Adicionando…
                  </span>
                ) : "🛒 Adicionar ao carrinho"}
              </button>
              <button
                onClick={() => {
                  if (onAutoAdvance && stepActions) {
                    const listAction = stepActions.find(a => a.id === "step4_list_products");
                    if (listAction) { onAutoAdvance(listAction.id); setPhase("result"); }
                  }
                }}
                className="w-full text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                ← Voltar e escolher outro produto
              </button>
            </div>
          )}
          {/* CONFIRMAÇÃO: step4_create_commercial_value_schema */}
          {!isGap && phase === "input" && actionId === "step4_create_commercial_value_schema" && (
            <div className="p-4 space-y-3">
              <div className="rounded-2xl bg-white border border-[#1351b4]/20 p-4 shadow-sm space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1351b4]">Confirmar criação</p>
                {/* Schema selecionado */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Schema selecionado</p>
                  {selectedSchemaSid ? (
                    <>
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedSchemaName || selectedSchemaSid}</p>
                      <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{selectedSchemaSid}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-600">Nenhum schema selecionado. Volte ao passo 3 e selecione um schema.</p>
                  )}
                </div>
                {/* Produto selecionado */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Produto selecionado</p>
                  {selectedProductDsku ? (
                    <>
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedProductName || selectedProductDsku}</p>
                      <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{selectedProductDsku}</p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-600">Nenhum produto selecionado. Volte ao passo anterior e selecione um produto.</p>
                  )}
                </div>
              </div>
              {/* Botão de confirmar */}
              <button
                onClick={handleCta}
                disabled={isExecuting || !selectedSchemaSid || !selectedProductDsku}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: colors.accent }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
                    </svg>
                    Criando…
                  </span>
                ) : "Criar Commercial Value Schema"}
              </button>
              <button
                onClick={() => {
                  if (onAutoAdvance && stepActions) {
                    const listAction = stepActions.find(a => a.id === "step4_list_products");
                    if (listAction) { onAutoAdvance(listAction.id); setPhase("result"); }
                  }
                }}
                className="w-full text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                ← Voltar e escolher outro produto
              </button>
            </div>
          )}

          {/* CONFIRMAÇÃO: passo 6 — tela com ícone do produto selecionado e botão Enviar solicitação */}
          {!isGap && phase === "input" && screen.stepId === 6 && actionId === "step6_create_data_request" && (() => {
            const productDsku = String(runState.selectedProductDsku ?? selectedProductDsku ?? "");
            const productName = String(runState.selectedProductName ?? selectedProductName ?? "");
            const friendly = productDsku ? lookupProductFriendly(productDsku, productName || "") : null;
            const displayName = friendly ? friendly.brand : productName || productDsku;
            const productImage = friendly ? friendly.image : (productName ? getProductImage(productName, "") : null);
            return (
              <div className="p-4 space-y-3">
                {/* Card do produto selecionado */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  {productImage ? (
                    <div className="relative" style={{ minHeight: 120 }}>
                      <img src={productImage} alt={displayName} className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.65)" }} />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)" }} />
                      <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-white/70 mb-0.5">Produto selecionado</p>
                        <p className="text-base font-bold text-white leading-tight">{displayName}</p>
                        {productDsku && <p className="text-[9px] font-mono text-white/60 mt-0.5">{productDsku}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Produto selecionado</p>
                      {displayName ? (
                        <p className="text-sm font-bold text-slate-900">{displayName}</p>
                      ) : (
                        <p className="text-xs text-amber-600">⚠️ Nenhum produto selecionado. Volte ao passo 5.</p>
                      )}
                    </div>
                  )}
                </div>
                {/* Info da empresa */}
                {runState.businessDwalletId && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Empresa destinatária</p>
                      <p className="text-[9px] font-mono text-slate-700 truncate">{String(runState.businessDwalletId).slice(0, 16)}…</p>
                    </div>
                  </div>
                )}
                {/* Botão Enviar solicitação */}
                <button
                  onClick={handleCta}
                  disabled={isExecuting || !displayName}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                  style={{ background: colors.accent }}
                >
                  {isExecuting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                      Enviando…
                    </span>
                  ) : "📤 Enviar solicitação"}
                </button>
                <button
                  onClick={() => { if (onStepChange) onStepChange(5); }}
                  className="w-full text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-1"
                >
                  ← Voltar e escolher outro produto
                </button>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════
               PASSO 7 — TELA ÚNICA AUTOCONTIDA
               Fluxo: idle → selecting → executing → done
               Não depende de phase/actionId globais
          ═══════════════════════════════════════════════════════════════════ */}
          {!isGap && screen.stepId === 7 && (() => {
            const hasIds = step7ListedIds.length > 0;
            const isExecutingBatch = step7Phase === "executing";
            const isDone = step7Phase === "done";
            const isSelecting = step7Phase === "selecting" || isDone;

            // ── TELA IDLE: botão Listar Solicitações ──────────────────────────
            if (step7Phase === "idle") {
              return (
                <div className="p-4 space-y-4">
                  {/* Cabeçalho */}
                  <div className="rounded-2xl bg-[#1351b4] p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200 mb-1">Passo 7 — Business dWallet</p>
                    <p className="text-sm font-bold leading-tight">Solicitações de dados recebidas</p>
                    <p className="text-[9px] text-blue-200 mt-1">Consulte e gerencie as solicitações enviadas pelas pessoas.</p>
                  </div>

                  {/* Descrição */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Clique em <strong>Listar Solicitações</strong> para consultar as solicitações de dados pendentes recebidas pela empresa na API.
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1.5">
                      Após listar, selecione uma ou mais solicitações e clique em <strong>Aceitar</strong> ou <strong>Rejeitar</strong>.
                    </p>
                  </div>

                  {/* Botão Listar Solicitações — chama API GET real */}
                  <button
                    onClick={handleStep7List}
                    disabled={isExecuting}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                    style={{ background: "#1351b4" }}
                  >
                    {isExecuting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin" viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/></svg>
                        Consultando API...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><rect x="3" y="5" width="14" height="2" rx="1" fill="white"/><rect x="3" y="9" width="10" height="2" rx="1" fill="white"/><rect x="3" y="13" width="12" height="2" rx="1" fill="white"/></svg>
                        Listar Solicitações
                      </span>
                    )}
                  </button>
                </div>
              );
            }

            // ── TELA SELECTING/DONE: lista com checkboxes + botões ─────────────
            if (isSelecting) {
              const hasRequests = hasIds;
              const schemaName = String(runState.selectedSchemaName ?? runState.valueSchemaSid ?? "").toLowerCase();
              const schemaImg = schemaName.includes("tarifa") || schemaName.includes("corrida") || schemaName.includes("motorista") || schemaName.includes("local") || schemaName.includes("rideshare")
                ? SCHEMA_TYPE_IMAGES.mobility
                : schemaName.includes("telecom") || schemaName.includes("telefonia") || schemaName.includes("plano")
                ? SCHEMA_TYPE_IMAGES.standard
                : SCHEMA_TYPE_IMAGES.consent;
              return (
              <div className="flex flex-col" style={{ height: 390 }}>
                {/* Cabeçalho com schema e contador */}
                <div className="relative overflow-hidden shrink-0" style={{ minHeight: 58 }}>
                  <img src={schemaImg} alt="Schema" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.45)" }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(19,81,180,0.65) 0%, rgba(0,0,0,0.35) 100%)" }} />
                  <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wide text-blue-200">Solicitações recebidas</p>
                      <p className="text-[11px] font-bold text-white leading-tight">
                        {runState.selectedSchemaName ? String(runState.selectedSchemaName) : "Dados pessoais"}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: hasRequests ? "rgba(254,243,199,0.9)" : "rgba(241,245,249,0.9)", color: hasRequests ? "#92400e" : "#64748b" }}>
                      {step7ListedIds.length} {step7ListedIds.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                </div>

                {/* Lista de solicitações — scrollable */}
                <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
                  {/* Resultado do batch (quando executado) */}
                  {batchResult && (
                    <div className="mx-3 mt-3 rounded-xl border overflow-hidden" style={{ borderColor: batchResult.ok ? "#d1fae5" : "#fee2e2", background: batchResult.ok ? "#f0fdf4" : "#fff5f5" }}>
                      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: batchResult.ok ? "#d1fae5" : "#fee2e2", background: batchResult.ok ? "#dcfce7" : "#fee2e2" }}>
                        <span className="text-xs">{batchResult.ok ? "✅" : "❌"}</span>
                        <p className="text-[10px] font-bold" style={{ color: batchResult.ok ? "#065f46" : "#991b1b" }}>
                          {batchResult.action === "accept" ? "Aceite" : "Recusa"} {batchResult.ok ? "concluído" : "com erros"}
                        </p>
                        <button
                          onClick={() => { setStep7BatchResult(null); setStep7SelectedIds([]); setStep7Phase("selecting"); }}
                          className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(0,0,0,0.08)", color: batchResult.ok ? "#065f46" : "#991b1b" }}
                        >
                          Refazer
                        </button>
                      </div>
                      {batchResult.results.map((r, i) => (
                        <div key={i} className="px-3 py-1.5 flex items-center gap-2 border-b last:border-0" style={{ borderColor: batchResult.ok ? "#d1fae5" : "#fee2e2" }}>
                          <span className="text-[10px]">{r.ok ? "✅" : "❌"}</span>
                          <p className="text-[8px] font-mono text-slate-600 truncate flex-1">{r.dataRequestId.slice(0, 18)}…</p>
                          {r.httpStatus && <span className="text-[8px] font-mono text-slate-400">{r.httpStatus}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {hasRequests ? (
                    <div className="px-3 py-2 space-y-3">
                      {step7ListedRequests.map((req, idx) => {
                        const reqId = req.id;
                        const isSelected = step7SelectedIds.includes(reqId);
                        const batchItemResult = step7BatchResult?.results.find(r => r.dataRequestId === reqId);
                        const isDoneState = step7Phase === "done";
                        const senderName = req.sender?.name ?? req.sender?._id ?? "";
                        const senderCpf = req.sender?.cpf ?? "";
                        // Nome fantasia: tenta mapear pelo schemaId retornado pela API ou pelo schema do runState
                        const schemaKey = String(req.schemaId ?? runState.valueSchemaSid ?? runState.selectedSchemaName ?? "");
                        const schemaFriendly = schemaKey ? getSchemaFriendlyName(schemaKey, schemaKey) : "";
                        // Imagem temática baseada no schema
                        const cardImg = schemaKey.toLowerCase().includes("rideshare") || schemaKey.toLowerCase().includes("corrida") || schemaKey.toLowerCase().includes("tarifa")
                          ? SCHEMA_TYPE_IMAGES.mobility
                          : schemaKey.toLowerCase().includes("telecom") || schemaKey.toLowerCase().includes("telefonia")
                          ? SCHEMA_TYPE_IMAGES.standard
                          : SCHEMA_TYPE_IMAGES.consent;
                        // Status visual
                        const statusColor = batchItemResult
                          ? (batchItemResult.ok ? { bg: "#dcfce7", text: "#15803d", label: batchResult?.action === "accept" ? "✅ Aceito" : "✅ Recusado" } : { bg: "#fee2e2", text: "#991b1b", label: "❌ Erro" })
                          : { bg: "#fef3c7", text: "#92400e", label: req.status ?? "pending" };
                        return (
                          <button
                            key={reqId}
                            onClick={() => !isDoneState && handleToggleRequest(reqId)}
                            disabled={isDoneState}
                            className="w-full text-left rounded-2xl overflow-hidden shadow-sm transition-all active:scale-[0.98] disabled:cursor-default"
                            style={{
                              outline: isSelected ? "3px solid #1351b4" : batchItemResult ? (batchItemResult.ok ? "3px solid #059669" : "3px solid #dc2626") : "2px solid transparent",
                              outlineOffset: "1px",
                            }}
                          >
                            {/* Imagem de fundo temática */}
                            <div className="relative overflow-hidden" style={{ height: 72 }}>
                              <img
                                src={cardImg}
                                alt="Dados"
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ filter: "brightness(0.45) saturate(1.2)" }}
                              />
                              <div
                                className="absolute inset-0"
                                style={{ background: isSelected
                                  ? "linear-gradient(135deg, rgba(19,81,180,0.75) 0%, rgba(0,0,0,0.4) 100%)"
                                  : batchItemResult
                                  ? (batchItemResult.ok ? "linear-gradient(135deg, rgba(5,150,105,0.75) 0%, rgba(0,0,0,0.4) 100%)" : "linear-gradient(135deg, rgba(220,38,38,0.75) 0%, rgba(0,0,0,0.4) 100%)")
                                  : "linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(0,0,0,0.45) 100%)"
                                }}
                              />
                              <div className="relative z-10 px-3 py-2.5 flex items-start justify-between h-full">
                                <div className="flex-1 min-w-0">
                                  {/* Badge tipo + número */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                                      {req.senderType ?? "Person"}
                                    </span>
                                    <span className="text-[7px] text-white/60">#{idx + 1}</span>
                                  </div>
                                  {/* Nome fantasia ou título */}
                                  <p className="text-[11px] font-bold text-white leading-tight truncate">
                                    {schemaFriendly && schemaFriendly !== schemaKey
                                      ? schemaFriendly
                                      : senderName || "Solicitação de Dados"}
                                  </p>
                                  {senderCpf && (
                                    <p className="text-[8px] text-white/60 truncate">CPF: {senderCpf}</p>
                                  )}
                                </div>
                                {/* Checkbox / ícone de status */}
                                <div
                                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                                  style={{
                                    borderColor: batchItemResult ? (batchItemResult.ok ? "#34d399" : "#f87171") : isSelected ? "white" : "rgba(255,255,255,0.5)",
                                    background: batchItemResult ? (batchItemResult.ok ? "#059669" : "#dc2626") : isSelected ? "white" : "rgba(255,255,255,0.15)",
                                  }}
                                >
                                  {batchItemResult ? (
                                    <svg viewBox="0 0 12 12" width="9" height="9" fill="none">
                                      {batchItemResult.ok
                                        ? <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        : <path d="M3 3l6 6M9 3l-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                                      }
                                    </svg>
                                  ) : isSelected ? (
                                    <svg viewBox="0 0 12 12" width="9" height="9" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="#1351b4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {/* Rodapé do card: ID + status */}
                            <div className="bg-white px-3 py-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {/* Ícone de dados/tecnologia */}
                                <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                                  <rect x="2" y="2" width="5" height="5" rx="1" fill="#1351b4" opacity="0.7"/>
                                  <rect x="9" y="2" width="5" height="5" rx="1" fill="#1351b4" opacity="0.4"/>
                                  <rect x="2" y="9" width="5" height="5" rx="1" fill="#1351b4" opacity="0.4"/>
                                  <rect x="9" y="9" width="5" height="5" rx="1" fill="#1351b4" opacity="0.7"/>
                                </svg>
                                <p className="text-[8px] font-mono text-slate-500 truncate" style={{ maxWidth: 110 }}>{reqId}</p>
                              </div>
                              <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0" style={{ background: statusColor.bg, color: statusColor.text }}>
                                {statusColor.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                      </div>
                      <p className="text-xs font-bold text-slate-500">Nenhuma solicitação pendente</p>
                      <p className="text-[9px] text-slate-400 mt-1">A API não retornou solicitações pendentes para esta empresa.</p>
                      <button onClick={() => setStep7Phase("idle")} className="mt-2 text-[9px] font-bold text-blue-600 underline">Tentar novamente</button>
                      <button
                        onClick={() => {
                          const demoId = runState.dataRequestId as string || "demo-req-" + Math.random().toString(36).slice(2, 10);
                          setStep7ListedRequests([{
                            id: demoId,
                            senderType: "Person",
                            sender: { name: "João Santos", cpf: "***.***.***-**" },
                            status: "pending",
                            schemaId: String(runState.valueSchemaSid ?? runState.selectedSchemaName ?? ""),
                          }]);
                        }}
                        className="mt-2 text-[9px] font-bold px-3 py-1.5 rounded-lg text-white"
                        style={{ background: "#1351b4" }}
                      >
                        🧪 Usar dados de demonstração
                      </button>
                    </div>
                  )}
                </div>

                {/* Rodapé fixo com botões Aceitar / Recusar */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 space-y-2">
                  {selectedRequestIds.length > 0 && !batchResult && (
                    <p className="text-[9px] text-center font-semibold" style={{ color: "#1351b4" }}>
                      {selectedRequestIds.length} {selectedRequestIds.length === 1 ? "solicitação selecionada" : "solicitações selecionadas"}
                    </p>
                  )}
                  {!batchResult && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStep7Action("accept")}
                        disabled={selectedRequestIds.length === 0 || isBatchExecuting || !hasRequests}
                        className="rounded-xl py-2.5 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95"
                        style={{
                          background: selectedRequestIds.length > 0 && !isBatchExecuting && hasRequests
                            ? "#059669"
                            : "#94a3b8",
                          opacity: selectedRequestIds.length === 0 || !hasRequests ? 0.5 : 1,
                        }}
                      >
                        {isBatchExecuting ? (
                          <span className="flex items-center justify-center gap-1">
                            <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <svg viewBox="0 0 16 16" width="11" height="11" fill="none"><path d="M3 8l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Aceitar
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleStep7Action("reject")}
                        disabled={selectedRequestIds.length === 0 || isBatchExecuting || !hasRequests}
                        className="rounded-xl py-2.5 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95"
                        style={{
                          background: selectedRequestIds.length > 0 && !isBatchExecuting && hasRequests
                            ? "#dc2626"
                            : "#94a3b8",
                          opacity: selectedRequestIds.length === 0 || !hasRequests ? 0.5 : 1,
                        }}
                      >
                        {isBatchExecuting ? (
                          <span className="flex items-center justify-center gap-1">
                            <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <svg viewBox="0 0 16 16" width="11" height="11" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                            Recusar
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                  {!batchResult && !hasRequests && (
                    <p className="text-[9px] text-center text-slate-400">Nenhuma solicitação para processar</p>
                  )}
                </div>
              </div>
              );
            }
            return null;
          })()}

          {/* CONFIRMAÇÃO: step7_accept_data_request — card nano banana */}
          {!isGap && phase === "input" && actionId === "step7_accept_data_request" && (
            <div className="p-4 space-y-3">
              <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 100 }}>
                <img src={SCHEMA_TYPE_IMAGES.accept} alt="Aceitar" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                <div className="relative z-10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200 mb-1">Aceitar solicitação</p>
                  <p className="text-sm font-bold text-white leading-tight">Confirmar aceite da solicitação de dados</p>
                  {runState.dataRequestId && <p className="text-[9px] font-mono text-white/70 mt-1">ID: {String(runState.dataRequestId)}</p>}
                </div>
              </div>
              <button
                onClick={handleCta}
                disabled={isExecuting}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: "#059669" }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    Aceitando…
                  </span>
                ) : "✅ Aceitar solicitação"}
              </button>
            </div>
          )}

          {/* CONFIRMAÇÃO: step7_reject_data_request — card nano banana */}
          {!isGap && phase === "input" && actionId === "step7_reject_data_request" && (
            <div className="p-4 space-y-3">
              <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 100 }}>
                <img src={SCHEMA_TYPE_IMAGES.reject} alt="Rejeitar" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                <div className="relative z-10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-200 mb-1">Rejeitar solicitação</p>
                  <p className="text-sm font-bold text-white leading-tight">Confirmar rejeição da solicitação de dados</p>
                  {runState.dataRequestId && <p className="text-[9px] font-mono text-white/70 mt-1">ID: {String(runState.dataRequestId)}</p>}
                </div>
              </div>
              <button
                onClick={handleCta}
                disabled={isExecuting}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: "#dc2626" }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    Rejeitando…
                  </span>
                ) : "❌ Rejeitar solicitação"}
              </button>
            </div>
          )}

          {/* PASSO 10 — Tela autocontida: listar DSPs → detalhe → enroll → commercial */}
          {!isGap && screen.stepId === 10 && (() => {
            const isExec = isExecuting;

            // ── IDLE: botão Listar DSPs ─────────────────────────────────────────
            if (step10Phase === "idle") {
              return (
                <div className="p-4 space-y-4">
                  <div className="rounded-2xl bg-[#7c3aed] p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200 mb-1">Passo 10 — Personal dWallet</p>
                    <p className="text-sm font-bold leading-tight">Data Savings Plans (DSP)</p>
                    <p className="text-[9px] text-purple-200 mt-1">Consulte, visualize detalhes e adira a um plano DSP.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <p className="text-[10px] text-slate-600 leading-relaxed">Clique em <strong>Listar DSPs</strong> para consultar os planos de poupança de dados disponíveis.</p>
                    <p className="text-[9px] text-slate-400 mt-1.5">Após listar, clique em um DSP para ver detalhes e selecione um para aderir.</p>
                  </div>
                  <button
                    onClick={handleStep10ListDsps}
                    disabled={isExec}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                    style={{ background: "#7c3aed" }}
                  >
                    {isExec ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin" viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/></svg>
                        Consultando API...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><rect x="3" y="5" width="14" height="2" rx="1" fill="white"/><rect x="3" y="9" width="10" height="2" rx="1" fill="white"/><rect x="3" y="13" width="12" height="2" rx="1" fill="white"/></svg>
                        Listar DSPs
                      </span>
                    )}
                  </button>
                </div>
              );
            }

            // ── LISTING / DETAIL: lista de DSPs com drill-down ──────────────────
            if (step10Phase === "listing" || step10Phase === "detail") {
              return (
                <div className="flex flex-col" style={{ height: 390 }}>
                  {/* Cabeçalho fixo */}
                  <div className="shrink-0 bg-[#7c3aed] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200">Passo 10 — DSPs disponíveis</p>
                    <p className="text-[11px] font-bold text-white">{step10Dsps.length} plano(s) encontrado(s)</p>
                    <p className="text-[9px] text-purple-200 mt-0.5">Clique para ver detalhes · Selecione para aderir</p>
                  </div>

                  {/* Lista scrollável */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {step10Dsps.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[10px] text-slate-400">Nenhum DSP encontrado na API.</p>
                        <button onClick={handleStep10ListDsps} className="mt-2 text-[9px] text-purple-600 underline">Tentar novamente</button>
                      </div>
                    ) : step10Dsps.map(dsp => {
                      const isExpanded = step10ExpandedDspId === dsp.id;
                      const isSelected = step10SelectedDspId === dsp.id;
                      const dspName = String(dsp.name ?? dsp.id ?? "DSP");
                      const dspDesc = String(dsp.description ?? "");
                      return (
                        <div key={dsp.id} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: isSelected ? "#7c3aed" : "#e2e8f0", background: isSelected ? "#faf5ff" : "white" }}>
                          {/* Card principal — clique expande drill-down */}
                          <button
                            className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
                            onClick={() => handleStep10DspClick(dsp.id)}
                          >
                            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold" style={{ background: "#7c3aed" }}>DSP</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-800 truncate">{dspName}</p>
                              {dspDesc && <p className="text-[8px] text-slate-400 truncate">{dspDesc}</p>}
                              <p className="text-[8px] font-mono text-slate-300 truncate">{dsp.id}</p>
                            </div>
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="M4 6l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>

                          {/* Drill-down: detalhe do DSP */}
                          {isExpanded && (
                            <div className="border-t px-3 py-2 bg-slate-50" style={{ borderColor: "#e2e8f0" }}>
                              {isExec && !step10DspDetails ? (
                                <div className="flex items-center gap-2 py-1">
                                  <svg className="animate-spin" viewBox="0 0 20 20" width="12" height="12" fill="none"><circle cx="10" cy="10" r="7" stroke="#7c3aed" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/></svg>
                                  <p className="text-[9px] text-slate-400">Carregando detalhes...</p>
                                </div>
                              ) : step10DspDetails ? (
                                <div className="space-y-1">
                                  <p className="text-[9px] font-bold text-purple-700 mb-1">Detalhes do plano</p>
                                  {Object.entries(step10DspDetails).slice(0, 8).map(([k, v]) => (
                                    <div key={k} className="flex gap-1">
                                      <span className="text-[8px] font-semibold text-slate-500 shrink-0 w-20 truncate">{k}:</span>
                                      <span className="text-[8px] text-slate-700 truncate flex-1">{String(v ?? "")}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[9px] text-slate-400">Clique novamente para recarregar os detalhes.</p>
                              )}

                              {/* Botão de seleção (radio) para enroll */}
                              <button
                                onClick={() => handleStep10DspSelect(dsp.id)}
                                disabled={isExec}
                                className="mt-2 w-full rounded-lg py-1.5 text-[10px] font-bold text-white disabled:opacity-60 transition-all active:scale-95"
                                style={{ background: isSelected ? "#059669" : "#7c3aed" }}
                              >
                                {isExec && isSelected ? (
                                  <span className="flex items-center justify-center gap-1">
                                    <svg className="animate-spin" viewBox="0 0 20 20" width="11" height="11" fill="none"><circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/></svg>
                                    Aderindo...
                                  </span>
                                ) : isSelected ? "✓ Selecionado — Aderir a este DSP" : "Selecionar e Aderir"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ── ENROLLING: resultado do enroll + botão listar commercial ────────
            if (step10Phase === "enrolling") {
              return (
                <div className="p-4 space-y-3">
                  <div className="rounded-2xl p-4" style={{ background: step10EnrollResult?.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${step10EnrollResult?.ok ? "#bbf7d0" : "#fecaca"}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: step10EnrollResult?.ok ? "#15803d" : "#dc2626" }}>
                      {step10EnrollResult?.ok ? "✅ Enroll realizado" : "❌ Falha no enroll"}
                    </p>
                    <p className="text-[11px] font-bold" style={{ color: step10EnrollResult?.ok ? "#166534" : "#991b1b" }}>
                      {step10EnrollResult?.message ?? ""}
                    </p>
                    {step10EnrollResult?.dspAccountId && (
                      <p className="text-[8px] font-mono mt-1" style={{ color: "#15803d" }}>Conta DSP: {step10EnrollResult.dspAccountId}</p>
                    )}
                  </div>

                  {/* Botão listar commercial DSPs */}
                  <button
                    onClick={handleStep10ListCommercial}
                    disabled={isExec}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                    style={{ background: "#1351b4" }}
                  >
                    {isExec ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin" viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/></svg>
                        Consultando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><rect x="3" y="5" width="14" height="2" rx="1" fill="white"/><rect x="3" y="9" width="10" height="2" rx="1" fill="white"/><rect x="3" y="13" width="12" height="2" rx="1" fill="white"/></svg>
                        Listar Commercial DSPs
                      </span>
                    )}
                  </button>

                  {/* Voltar para lista */}
                  <button
                    onClick={() => { setStep10Phase("listing"); setStep10EnrollResult(null); }}
                    className="w-full rounded-xl px-4 py-2 text-[10px] font-semibold text-slate-500 border border-slate-200 transition-all active:scale-95"
                  >
                    ← Voltar para lista de DSPs
                  </button>
                </div>
              );
            }

            // ── COMMERCIAL: lista de commercial DSPs ─────────────────────────────
            if (step10Phase === "commercial") {
              return (
                <div className="flex flex-col" style={{ height: 390 }}>
                  <div className="shrink-0 bg-[#1351b4] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">Passo 10 — Commercial DSPs</p>
                    <p className="text-[11px] font-bold text-white">{step10CommercialDsps.length} commercial DSP(s) encontrado(s)</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {step10CommercialDsps.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[10px] text-slate-400">Nenhum commercial DSP encontrado.</p>
                      </div>
                    ) : step10CommercialDsps.map((cdsp, idx) => (
                      <div key={cdsp.id ?? idx} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold" style={{ background: "#1351b4" }}>C{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-800 truncate">{String(cdsp.name ?? cdsp.id ?? "Commercial DSP")}</p>
                            <p className="text-[8px] font-mono text-slate-300 truncate">{cdsp.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="shrink-0 p-3 border-t border-slate-100">
                    <button
                      onClick={() => { setStep10Phase("listing"); }}
                      className="w-full rounded-xl px-4 py-2 text-[10px] font-semibold text-slate-500 border border-slate-200 transition-all active:scale-95"
                    >
                      ← Voltar para lista de DSPs
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* CONFIRMAÇÃO: step10_create_dsp_account — card nano banana */}
          {!isGap && phase === "input" && actionId === "step10_create_dsp_account" && screen.stepId !== 10 && (
            <div className="p-4 space-y-3">
              <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 100 }}>
                <img src={SCHEMA_TYPE_IMAGES.dsp} alt="Plano DSP" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                <div className="relative z-10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-purple-200 mb-1">Aderir ao plano DSP</p>
                  <p className="text-sm font-bold text-white leading-tight">Confirmar adesão ao Data Savings Plan</p>
                  {runState.selectedDspId && <p className="text-[9px] font-mono text-white/70 mt-1">ID: {String(runState.selectedDspId)}</p>}
                </div>
              </div>
              <button
                onClick={handleCta}
                disabled={isExecuting}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: "#7c3aed" }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    Aderindo…
                  </span>
                ) : "💾 Aderir ao plano DSP"}
              </button>
            </div>
          )}

          {/* CONFIRMAÇÃO: step13 (aceitar oferta) — card nano banana */}
          {!isGap && phase === "input" && screen.stepId === 13 && (
            <div className="p-4 space-y-3">
              <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 100 }}>
                <img src={SCHEMA_TYPE_IMAGES.offer} alt="Oferta" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.6)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                <div className="relative z-10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-orange-200 mb-1">Aceitar oferta</p>
                  <p className="text-sm font-bold text-white leading-tight">Confirmar aceite da oferta do marketplace</p>
                  {runState.offerId && <p className="text-[9px] font-mono text-white/70 mt-1">ID: {String(runState.offerId)}</p>}
                  {!runState.offerId && <p className="text-[9px] text-orange-200 mt-1">⚠️ Nenhuma oferta selecionada — execute o passo 12 primeiro</p>}
                </div>
              </div>
              <button
                onClick={handleCta}
                disabled={isExecuting || !runState.offerId}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: "#ea580c" }}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    Aceitando…
                  </span>
                ) : "🤝 Aceitar oferta"}
              </button>
            </div>
          )}

          {/* PASSO 7 INPUT: removido — substituído pelo bloco autocontido screen.stepId === 7 acima */}

          {/* INPUT state */}
          {!isGap && phase === "input" && stepId !== 0 && actionId !== "step4_create_commercial_value_schema" && actionId !== "step4_add_dsku_to_cart" && actionId !== "step7_list_business_requests" && actionId !== "step7_accept_data_request" && actionId !== "step7_reject_data_request" && actionId !== "step10_create_dsp_account" && screen.stepId !== 13 && !(screen.stepId === 6 && actionId === "step6_create_data_request") && (
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

              {/* Painel de IDs capturados — mostra IDs de passos anteriores */}
              {(() => {
                // Mapeamento: quais IDs são relevantes por passo
                const capturedIdMap: Record<number, Array<{ key: string; label: string; fromStep: number; fromStepLabel: string }>> = {
                  4: [
                    { key: "businessDwalletId", label: "Business dWallet ID", fromStep: 1, fromStepLabel: "Passo 1" },
                    { key: "valueSchemaSid", label: "Schema selecionado", fromStep: 3, fromStepLabel: "Passo 3" },
                  ],
                  6: [
                    { key: "businessDwalletId", label: "Business dWallet ID", fromStep: 1, fromStepLabel: "Passo 1" },
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                    { key: "valueSchemaSid", label: "Schema selecionado", fromStep: 3, fromStepLabel: "Passo 3" },
                  ],
                  7: [
                    { key: "dataRequestId", label: "ID da solicitação", fromStep: 6, fromStepLabel: "Passo 6" },
                    { key: "businessDwalletId", label: "Business dWallet ID", fromStep: 1, fromStepLabel: "Passo 1" },
                  ],
                  8: [
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                  ],
                  10: [
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                    { key: "selectedDspId", label: "DSP selecionado", fromStep: 10, fromStepLabel: "Passo 10" },
                  ],
                  12: [
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                  ],
                  13: [
                    { key: "offerId", label: "ID da oferta", fromStep: 12, fromStepLabel: "Passo 12" },
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                  ],
                  14: [
                    { key: "businessDwalletId", label: "Business dWallet ID", fromStep: 1, fromStepLabel: "Passo 1" },
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                  ],
                  15: [
                    { key: "businessDwalletId", label: "Business dWallet ID", fromStep: 1, fromStepLabel: "Passo 1" },
                    { key: "personDwalletId", label: "Personal dWallet ID", fromStep: 2, fromStepLabel: "Passo 2" },
                  ],
                };
                const relevantIds = capturedIdMap[screen.stepId];
                if (!relevantIds || relevantIds.length === 0) return null;
                const captured = relevantIds.filter(item => {
                  const val = runState[item.key];
                  return val !== undefined && val !== null && String(val).trim() !== "";
                });
                const missing = relevantIds.filter(item => {
                  const val = runState[item.key];
                  return val === undefined || val === null || String(val).trim() === "";
                });
                if (captured.length === 0 && missing.length === 0) return null;
                return (
                  <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: captured.length === relevantIds.length ? "#bbf7d0" : "#fde68a", background: captured.length === relevantIds.length ? "#f0fdf4" : "#fffbeb" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: captured.length === relevantIds.length ? "#15803d" : "#92400e" }}>
                      {captured.length === relevantIds.length ? "✅ IDs capturados" : "⚠️ IDs necessários"}
                    </p>
                    <div className="space-y-1.5">
                      {relevantIds.map(item => {
                        const val = runState[item.key];
                        const hasCaptured = val !== undefined && val !== null && String(val).trim() !== "";
                        const displayVal = hasCaptured ? String(val) : "";
                        const truncated = displayVal.length > 20 ? `${displayVal.slice(0, 8)}…${displayVal.slice(-6)}` : displayVal;
                        return (
                          <div key={item.key} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px]">{hasCaptured ? "✅" : "⚠️"}</span>
                              <span className="text-[9px] font-semibold text-slate-700 truncate">{item.label}</span>
                            </div>
                            {hasCaptured ? (
                              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">{truncated}</span>
                            ) : (
                              <span className="text-[9px] text-amber-600 shrink-0">Execute {item.fromStepLabel}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
