import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  MailCheck,
  Menu,
  PackageCheck,
  PiggyBank,
  Play,
  ReceiptText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

type WalletKind = "personal" | "business";
type ScreenGroup = "acesso" | "onboarding" | "wallet" | "mercado" | "financeiro" | "configuracoes";
export type VisualStatus = "pending" | "running" | "done" | "failed" | "missing";
type RunState = Record<string, string | number | boolean | null | undefined>;

export function updateRunStateValue(previous: RunState, key: string, value: string): RunState {
  return { ...previous, [key]: value };
}

export type Evidence = {
  provider?: string;
  actionId: string;
  actionTitle: string;
  status: "executed" | "not_executable" | "failed";
  configured?: boolean;
  ok: boolean;
  method?: string;
  url?: string;
  httpStatus?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: RunState;
  message?: string;
  missingReason?: string;
  durationMs?: number;
  executedAt: string;
};

export type M2MAuthResult = {
  status: "executed" | "failed";
  ok: boolean;
  method: "POST";
  url: string;
  httpStatus?: number;
  tokenHandle?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  active: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  message: string;
  executedAt: string;
};

type ScreenField = { key: string; label: string; placeholder: string; type?: string; required?: boolean };

type AppEmulation = {
  kind: "input" | "response" | "input-response" | "technical";
  header: string;
  lead: string;
  responseEmpty: string;
  footerNote?: string;
};

type GovScreen = {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  group: ScreenGroup;
  icon: typeof LayoutDashboard;
  actionId?: string;
  apiLabel: string;
  apiHint: string;
  primaryCta: string;
  fields: ScreenField[];
  observedFrom: string;
  blocks?: string[];
  appEmulation?: AppEmulation;
};

const statusLabel: Record<VisualStatus, string> = {
  pending: "aguardando ação",
  running: "consultando API",
  done: "resposta recebida",
  failed: "falha na API",
  missing: "API ausente",
};

const groupLabel: Record<ScreenGroup, string> = {
  acesso: "Acesso e cadastro",
  onboarding: "Onboarding e verificação",
  wallet: "Carteira de dados",
  mercado: "Mercado e planos",
  financeiro: "Financeiro",
  configuracoes: "Configurações",
};

type TestVariable = {
  key: string;
  label: string;
  section: string;
  placeholder: string;
  type?: string;
  sensitive?: boolean;
  description: string;
};

const personalTestVariables: TestVariable[] = [
  { key: "personFirstName", label: "Nome", section: "Pessoa física", placeholder: "João", description: "Usado no payload de criação da Personal dWallet." },
  { key: "personLastName", label: "Sobrenome", section: "Pessoa física", placeholder: "Santos", description: "Usado no payload de criação da Personal dWallet." },
  { key: "personEmail", label: "E-mail", section: "Pessoa física", placeholder: "cidadao@example.com", type: "email", description: "Identificador principal para cadastro, envio de código e login." },
  { key: "personPhone", label: "Telefone", section: "Pessoa física", placeholder: "+5511999990002", type: "tel", description: "Telefone enviado no cadastro Personal." },
  { key: "personPassword", label: "Senha de teste", section: "Pessoa física", placeholder: "SecurePass123!", type: "password", sensitive: true, description: "Senha enviada ao cadastro/login; é redigida nas evidências." },
  { key: "personVerificationCode", label: "Código de verificação", section: "Pessoa física", placeholder: "000000", description: "Código OTP recebido por e-mail e enviado ao endpoint verify-code da Personal dWallet." },
  { key: "personAddressLine", label: "Endereço", section: "Endereço da pessoa", placeholder: "Rua Cidadã 456", description: "Campo mantido para emulação visual; a sandbox aceita apenas UF no objeto address do cadastro Personal." },
  { key: "personCity", label: "Cidade", section: "Endereço da pessoa", placeholder: "São Paulo", description: "Campo mantido para emulação visual; não é enviado ao cadastro Personal da sandbox atual." },
  { key: "personState", label: "UF", section: "Endereço da pessoa", placeholder: "SP", description: "Único campo de endereço aceito e enviado no cadastro Personal da sandbox atual." },
  { key: "personZip", label: "CEP", section: "Endereço da pessoa", placeholder: "01310-200", description: "Campo mantido para emulação visual; não é enviado ao cadastro Personal da sandbox atual." },
  { key: "businessId", label: "Business ID", section: "Identificadores da jornada", placeholder: "Gerado pela Business dWallet", description: "Necessário para solicitação de dados Personal." },
  { key: "commercialDspId", label: "DSP comercial", section: "Identificadores da jornada", placeholder: "Gerado pela consulta de DSPs", description: "Usado para criar conta DSP quando retornado pela API." },
  { key: "offerId", label: "Offer ID", section: "Identificadores da jornada", placeholder: "Gerado pela listagem de ofertas", description: "Usado no aceite de oferta quando disponível." },
  { key: "dspAccountId", label: "Conta DSP", section: "Identificadores da jornada", placeholder: "Conta DSP conhecida", description: "Apoia telas financeiras e extrato parcial." },
  { key: "btgCompanyId", label: "Company ID BTG", section: "APIs financeiras BTG", placeholder: "company-id BTG", description: "Identificador da empresa usado nas APIs BTG quando não vier de Secret server-side." },
  { key: "btgAccountId", label: "Conta BTG", section: "APIs financeiras BTG", placeholder: "account-id da conta BTG", description: "Identificador da conta para saldo, extrato e débito de pagamentos." },
  { key: "btgStartDate", label: "Início do extrato", section: "APIs financeiras BTG", placeholder: "2026-04-05", type: "date", description: "Data inicial para consulta de extrato BTG." },
  { key: "btgEndDate", label: "Fim do extrato", section: "APIs financeiras BTG", placeholder: "2026-05-05", type: "date", description: "Data final para consulta de extrato BTG." },
  { key: "btgPixKey", label: "Chave Pix", section: "APIs financeiras BTG", placeholder: "chave-pix@empresa.gov.br", description: "Chave Pix usada para cobrança Pix BTG." },
  { key: "btgAmount", label: "Valor", section: "APIs financeiras BTG", placeholder: "1.10", type: "number", description: "Valor de pagamento, cobrança ou Pix." },
  { key: "btgBarcode", label: "Linha digitável", section: "APIs financeiras BTG", placeholder: "800800...", description: "Linha digitável para conferência e pagamento BTG." },
  { key: "btgPaymentId", label: "Pagamento BTG", section: "APIs financeiras BTG", placeholder: "payment-id", description: "Identificador usado para consulta de comprovante BTG." },
];

const businessTestVariables: TestVariable[] = [
  { key: "employeeFirstName", label: "Nome do colaborador", section: "Colaborador", placeholder: "Maria", description: "Usado no payload de criação do colaborador Business." },
  { key: "employeeLastName", label: "Sobrenome do colaborador", section: "Colaborador", placeholder: "Silva", description: "Usado no payload de criação do colaborador Business." },
  { key: "employeeEmail", label: "E-mail corporativo", section: "Colaborador", placeholder: "colaborador@example.com", type: "email", description: "Identificador de cadastro, envio de código e login Business." },
  { key: "employeePhone", label: "Telefone do colaborador", section: "Colaborador", placeholder: "+5511999990001", type: "tel", description: "Telefone enviado no cadastro do colaborador." },
  { key: "employeePassword", label: "Senha de teste", section: "Colaborador", placeholder: "SecurePass123!", type: "password", sensitive: true, description: "Senha enviada ao cadastro/login; é redigida nas evidências." },
  { key: "employeeVerificationCode", label: "Código de verificação", section: "Colaborador", placeholder: "000000", description: "Código OTP recebido por e-mail e enviado ao endpoint verify-code da Business dWallet." },
  { key: "businessName", label: "Razão/nome empresarial", section: "Empresa", placeholder: "Empresa Dataprev Local", description: "Nome enviado na criação da entidade Business dWallet." },
  { key: "businessCnpj", label: "CNPJ", section: "Empresa", placeholder: "00000000000100", description: "CNPJ de teste com 14 dígitos para criação da empresa." },
  { key: "businessPhone", label: "Telefone da empresa", section: "Empresa", placeholder: "+5511999990003", type: "tel", description: "Telefone corporativo opcional no cadastro empresarial." },
  { key: "businessWebsite", label: "Website", section: "Empresa", placeholder: "https://empresa.example.com", type: "url", description: "Website opcional enviado no cadastro empresarial." },
  { key: "businessAddressLine", label: "Endereço", section: "Endereço da empresa", placeholder: "Rua Exemplo 123", description: "Campo mantido para emulação visual; a sandbox aceita apenas UF no objeto address dos cadastros Business." },
  { key: "businessCity", label: "Cidade", section: "Endereço da empresa", placeholder: "São Paulo", description: "Campo mantido para emulação visual; não é enviado aos cadastros Business da sandbox atual." },
  { key: "businessState", label: "UF", section: "Endereço da empresa", placeholder: "SP", description: "Único campo de endereço aceito e enviado nos cadastros Business da sandbox atual." },
  { key: "businessZip", label: "CEP", section: "Endereço da empresa", placeholder: "01310-100", description: "Campo mantido para emulação visual; não é enviado aos cadastros Business da sandbox atual." },
  { key: "businessId", label: "Business ID", section: "Identificadores da jornada", placeholder: "Gerado no cadastro empresarial", description: "Usado para listar solicitações e outros passos empresariais." },
  { key: "dataRequestId", label: "Data Request ID", section: "Identificadores da jornada", placeholder: "Gerado/listado pela API", description: "Usado para aceite de solicitação de dados." },
  { key: "dspAccountId", label: "Conta DSP", section: "Identificadores da jornada", placeholder: "Conta DSP conhecida", description: "Apoia telas financeiras e extrato parcial." },
  { key: "btgCompanyId", label: "Company ID BTG", section: "APIs financeiras BTG", placeholder: "company-id BTG", description: "Identificador da empresa usado nas APIs BTG quando não vier de Secret server-side." },
  { key: "btgAccountId", label: "Conta BTG", section: "APIs financeiras BTG", placeholder: "account-id da conta BTG", description: "Identificador da conta para saldo, extrato e débito de pagamentos." },
  { key: "btgStartDate", label: "Início do extrato", section: "APIs financeiras BTG", placeholder: "2026-04-05", type: "date", description: "Data inicial para consulta de extrato BTG." },
  { key: "btgEndDate", label: "Fim do extrato", section: "APIs financeiras BTG", placeholder: "2026-05-05", type: "date", description: "Data final para consulta de extrato BTG." },
  { key: "btgPixKey", label: "Chave Pix", section: "APIs financeiras BTG", placeholder: "chave-pix@empresa.gov.br", description: "Chave Pix usada para cobrança Pix BTG." },
  { key: "btgAmount", label: "Valor", section: "APIs financeiras BTG", placeholder: "1.10", type: "number", description: "Valor de pagamento, cobrança ou Pix." },
  { key: "btgBarcode", label: "Linha digitável", section: "APIs financeiras BTG", placeholder: "800800...", description: "Linha digitável para conferência e pagamento BTG." },
  { key: "btgPaymentId", label: "Pagamento BTG", section: "APIs financeiras BTG", placeholder: "payment-id", description: "Identificador usado para consulta de comprovante BTG." },
];

export const personalScreens: GovScreen[] = [
  {
    id: "entrada",
    route: "/",
    title: "Entrada da Personal dWallet",
    subtitle: "Landing e acesso da pessoa, com chamada para criar conta ou entrar na carteira.",
    group: "acesso",
    icon: Smartphone,
    actionId: "step2_person_signup",
    apiLabel: "Cadastro de pessoa",
    apiHint: "Equivalente à criação de usuário observada no fluxo público.",
    primaryCta: "Seguir",
    fields: [
      { key: "personFirstName", label: "Nome", placeholder: "João", required: true },
      { key: "personLastName", label: "Sobrenome", placeholder: "Santos", required: true },
      { key: "personEmail", label: "E-mail", placeholder: "cidadao@example.com", type: "email", required: true },
      { key: "personPhone", label: "Telefone", placeholder: "+55 11 99999-0002", type: "tel", required: true },
      { key: "personState", label: "UF", placeholder: "SP", required: true },
      { key: "personPassword", label: "Senha", placeholder: "Crie uma senha", type: "password", required: true },
    ],
    observedFrom: "br.personal.drumwave.me/enter-name, /enter-info e /password",
    blocks: ["Nome e sobrenome", "E-mail e UF", "Senha e aceite de termos", "Verificação por código de e-mail"],
    appEmulation: { kind: "input-response", header: "Criar sua Personal dWallet", lead: "Preencha seus dados para abrir a carteira de dados gov.br.", responseEmpty: "Toque em Seguir para enviar o cadastro e avançar para a validação do e-mail.", footerNote: "Esta é a tela de entrada que o cidadão preencheria no app antes do disparo da API de criação da PdW." },
  },
  {
    id: "envio-codigo-email",
    route: "/email-verification/send-code",
    title: "Envio do código de e-mail",
    subtitle: "Executa a API de envio de OTP para o e-mail cadastrado na Personal dWallet.",
    group: "onboarding",
    icon: MailCheck,
    actionId: "step2_person_send_code",
    apiLabel: "Enviar código",
    apiHint: "Mapeado do Postman como POST /v1/auth/token/iam/idp/users/send-code com attribute=email, value=e-mail e Accept-Language pt-br.",
    primaryCta: "Enviar código de verificação",
    fields: [{ key: "personEmail", label: "E-mail", placeholder: "cidadao@example.com", type: "email", required: true }],
    observedFrom: "Coleção Postman Dataprev Sandbox Test e br.personal.drumwave.me/email-verification",
    blocks: ["E-mail cadastrado", "Solicitação de envio", "Mensagem de código enviado", "Reenvio quando necessário"],
  },
  {
    id: "verificacao-email",
    route: "/email-verification",
    title: "Verificação de e-mail",
    subtitle: "Tela com seis campos de OTP, mensagem de confirmação e reenvio de código.",
    group: "onboarding",
    icon: MailCheck,
    actionId: "step2_person_verify_code",
    apiLabel: "Validar código",
    apiHint: "Mapeado do Postman como POST /v1/auth/token/iam/idp/users/verify-code; o secretHash é calculado no servidor e não aparece no formulário.",
    primaryCta: "Validar código recebido",
    fields: [{ key: "personVerificationCode", label: "Código de verificação", placeholder: "000000", required: true }],
    observedFrom: "Coleção Postman Dataprev Sandbox Test e br.personal.drumwave.me/email-verification",
    blocks: ["Código de 6 dígitos", "Botão continuar", "Reenvio de e-mail", "Estado de erro quando o código não confere"],
  },
  {
    id: "foto-perfil",
    route: "/profile-picture",
    title: "Foto de perfil opcional",
    subtitle: "Onboarding opcional de imagem com possibilidade de pular a etapa.",
    group: "onboarding",
    icon: UserRound,
    apiLabel: "Sem API externa",
    apiHint: "Tela visual local; upload real não foi necessário para mapear a navegação.",
    primaryCta: "Pular por enquanto",
    fields: [],
    observedFrom: "br.personal.drumwave.me/profile-picture",
    blocks: ["Área de avatar", "Carregar foto", "Ação de pular"],
  },
  {
    id: "kyc",
    route: "/verify",
    title: "Confirmação de identidade",
    subtitle: "Fluxo Persona/KYC observado com seleção de país e documento, bloqueado sem envio de documento real.",
    group: "onboarding",
    icon: BadgeCheck,
    apiLabel: "Provedor KYC",
    apiHint: "Não foi automatizado por exigir documento pessoal real; reproduzido como estado de verificação pendente.",
    primaryCta: "Iniciar verificação",
    fields: [],
    observedFrom: "br.personal.drumwave.me/pre-verify e /verify",
    blocks: ["Selecionar país Brasil", "Selecionar tipo de documento", "Upload de documento", "Estado pendente/aprovado"],
  },
  {
    id: "painel",
    route: "/dashboard",
    title: "Painel da carteira",
    subtitle: "Resumo de saldo estimado, dados conectados, solicitações e alertas de privacidade.",
    group: "wallet",
    icon: LayoutDashboard,
    actionId: "step5_person_catalog",
    apiLabel: "Catálogo e dados",
    apiHint: "Consulta catálogos e elementos de dados disponíveis para a pessoa.",
    primaryCta: "Atualizar painel",
    fields: [],
    observedFrom: "Bundles públicos e jornada pós-KYC inferida por labels internos",
    blocks: ["Resumo da carteira", "Solicitações recentes", "Dados disponíveis", "Notificações"],
  },
  {
    id: "solicitacoes",
    route: "/requests",
    title: "Solicitações de dados",
    subtitle: "Lista pedidos de compartilhamento, consentimento e histórico de decisões.",
    group: "wallet",
    icon: ClipboardList,
    actionId: "step6_create_data_request",
    apiLabel: "Data request",
    apiHint: "Cria solicitação de dados para uma empresa previamente registrada.",
    primaryCta: "Criar solicitação",
    fields: [{ key: "businessId", label: "Identificador da empresa", placeholder: "Gerado pela Business dWallet", required: true }],
    observedFrom: "Jornada de 17 passos e labels Data Request dos bundles",
    blocks: ["Solicitações pendentes", "Solicitações aceitas", "Detalhe de consentimento", "Evidência de chamada"],
  },
  {
    id: "planos",
    route: "/data-savings-plan",
    title: "Planos de poupança de dados",
    subtitle: "Adesão a planos DSP que remuneram a pessoa pelo uso autorizado dos dados.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_list_dsps",
    apiLabel: "Listar DSPs",
    apiHint: "Consulta planos DSP disponíveis na sandbox.",
    primaryCta: "Consultar planos",
    fields: [],
    observedFrom: "Labels Data Savings Plan, subscription e goals extraídos dos bundles",
    blocks: ["Cards de plano", "Meta de ganho", "Renovação automática", "Detalhes do plano"],
  },
  {
    id: "ofertas",
    route: "/marketplace/offers",
    title: "Ofertas e marketplace",
    subtitle: "Ofertas disponíveis para monetização de dados e aceite informado pela pessoa.",
    group: "mercado",
    icon: PackageCheck,
    actionId: "step12_person_offers",
    apiLabel: "Ofertas parciais",
    apiHint: "A listagem pode retornar oferta; o aceite depende de offerId válido.",
    primaryCta: "Consultar ofertas",
    fields: [{ key: "offerId", label: "Identificador da oferta", placeholder: "Preenchido quando houver oferta", required: false }],
    observedFrom: "Bundles de marketplace, ofertas e carrinho",
    blocks: ["Lista de ofertas", "Detalhe da oferta", "Aceite", "Adicionar ao carrinho"],
  },
  {
    id: "carrinho",
    route: "/cart-checkout",
    title: "Carrinho e checkout",
    subtitle: "Revisão de ofertas selecionadas, confirmação de termos e finalização da operação.",
    group: "mercado",
    icon: ShoppingCart,
    actionId: "step11_business_offers_gap",
    apiLabel: "Lacuna registrada",
    apiHint: "Não há endpoint externo suficiente para criação completa de oferta/carrinho.",
    primaryCta: "Registrar lacuna",
    fields: [],
    observedFrom: "Labels Cart, Checkout e Remove from cart dos bundles",
    blocks: ["Itens do carrinho", "Resumo financeiro", "Termos", "Confirmação"],
  },
  {
    id: "saldo-btg",
    route: "/wallet/balance",
    title: "Saldo da carteira",
    subtitle: "Tela de saldo que o cidadão visualiza antes de consultar movimentações ou iniciar pagamentos.",
    group: "financeiro",
    icon: WalletCards,
    actionId: "btg_get_balance",
    apiLabel: "BTG saldo",
    apiHint: "Usa a coleção BTG para consultar saldo da conta vinculada à experiência financeira dWallet.",
    primaryCta: "Atualizar saldo",
    fields: [{ key: "btgAccountId", label: "Conta vinculada", placeholder: "account-id da conta BTG", required: true }],
    observedFrom: "Telas financeiras dWallet mapeadas e coleção BTG Pactual",
    blocks: ["Saldo disponível", "Saldo bloqueado", "Conta vinculada", "Atualização em tempo real"],
    appEmulation: { kind: "input-response", header: "Saldo da carteira", lead: "Consulte o saldo disponível na conta vinculada à dWallet.", responseEmpty: "Toque em Atualizar saldo para consultar o provedor financeiro.", footerNote: "O usuário vê somente saldos e mensagens; headers e tokens ficam fora do app." },
  },
  {
    id: "extrato",
    route: "/statement",
    title: "Extrato da carteira",
    subtitle: "Histórico financeiro com período editável, saldos e lançamentos sanitizados vindos da API BTG.",
    group: "financeiro",
    icon: ReceiptText,
    actionId: "btg_get_statement",
    apiLabel: "BTG extrato",
    apiHint: "Consulta extrato BTG por conta e período, substituindo a lacuna financeira parcial da jornada original.",
    primaryCta: "Ver extrato",
    fields: [
      { key: "btgAccountId", label: "Conta vinculada", placeholder: "account-id da conta BTG", required: true },
      { key: "btgStartDate", label: "De", placeholder: "2026-04-05", type: "date", required: true },
      { key: "btgEndDate", label: "Até", placeholder: "2026-05-05", type: "date", required: true },
    ],
    observedFrom: "Jornada de 17 passos, telas financeiras e coleção BTG Pactual",
    blocks: ["Filtro de período", "Lista de lançamentos", "Comprovante", "Exportar extrato"],
    appEmulation: { kind: "input-response", header: "Extrato", lead: "Escolha o período e acompanhe as movimentações da sua carteira.", responseEmpty: "A resposta aparecerá como lista de movimentações e comprovantes disponíveis.", footerNote: "A evidência técnica completa permanece no painel lateral, separada da visão do usuário." },
  },
  {
    id: "pix-cadastro",
    route: "/pix/keys",
    title: "Cadastrar chave Pix",
    subtitle: "Tela real de cadastro de chave Pix, exibida como lacuna porque a coleção BTG não contém endpoint de gestão de chaves.",
    group: "financeiro",
    icon: KeyRound,
    actionId: "btg_register_pix_key_gap",
    apiLabel: "BTG lacuna Pix",
    apiHint: "A coleção BTG possui Pix cash-in e cobranças, mas não expõe cadastro/gestão de chave Pix.",
    primaryCta: "Validar disponibilidade",
    fields: [{ key: "btgPixKey", label: "Chave Pix", placeholder: "cpf, e-mail, telefone ou chave aleatória", required: true }],
    observedFrom: "Tela esperada de Pix e lacuna explicitada no mapeamento BTG",
    blocks: ["Tipo de chave", "Confirmação de posse", "Termos Pix", "Status pendente de API"],
    appEmulation: { kind: "input-response", header: "Cadastrar chave Pix", lead: "Informe a chave que deseja vincular à carteira.", responseEmpty: "A tela informará que o contrato de cadastro de chave ainda não está disponível.", footerNote: "Este passo mantém a experiência do usuário, mas sinaliza a dependência técnica real." },
  },
  {
    id: "receber-pix",
    route: "/pix/receive",
    title: "Receber por Pix",
    subtitle: "Geração de cobrança Pix com valor e descrição como o usuário veria no aplicativo.",
    group: "financeiro",
    icon: PiggyBank,
    actionId: "btg_create_pix_instant_collection",
    apiLabel: "BTG Pix cash-in",
    apiHint: "Cria cobrança Pix instantânea via coleção BTG, usando chave, valor e descrição informados na tela.",
    primaryCta: "Gerar cobrança Pix",
    fields: [
      { key: "btgPixKey", label: "Chave Pix recebedora", placeholder: "chave-pix@empresa.gov.br", required: true },
      { key: "btgAmount", label: "Valor", placeholder: "1.10", type: "number", required: true },
      { key: "btgDescription", label: "Descrição", placeholder: "Recebimento dWallet gov.br" },
    ],
    observedFrom: "Coleção BTG Pactual Pix Cash-In",
    blocks: ["Valor", "Descrição", "QR Code", "Copia e cola Pix"],
    appEmulation: { kind: "input-response", header: "Receber Pix", lead: "Gere uma cobrança Pix para receber valores na carteira.", responseEmpty: "Após a chamada, o app exibirá QR Code, status e identificadores de cobrança quando retornados.", footerNote: "Dados sensíveis do provedor não são exibidos no celular emulado." },
  },
  {
    id: "pagar-conta",
    route: "/payments/barcode",
    title: "Pagar conta",
    subtitle: "Tela de pagamento com linha digitável, valor, data e conta de débito, usando endpoints BTG aplicáveis.",
    group: "financeiro",
    icon: ShoppingCart,
    actionId: "btg_create_payment",
    apiLabel: "BTG pagamentos",
    apiHint: "Envia pagamento de boleto/conta usando o payload de payments da coleção BTG.",
    primaryCta: "Confirmar pagamento",
    fields: [
      { key: "btgBarcode", label: "Linha digitável", placeholder: "800800...", required: true },
      { key: "btgAmount", label: "Valor", placeholder: "1.10", type: "number", required: true },
      { key: "btgPaymentDate", label: "Data de pagamento", placeholder: "2026-05-05", type: "date", required: true },
    ],
    observedFrom: "Coleção BTG Pactual Banking Payments",
    blocks: ["Linha digitável", "Valor", "Data", "Comprovante"],
    appEmulation: { kind: "input-response", header: "Pagar conta", lead: "Confira os dados antes de confirmar o pagamento.", responseEmpty: "O app exibirá status do envio, protocolo e recibo quando disponível.", footerNote: "Use ambiente de homologação e valores de teste." },
  },
  {
    id: "configuracoes",
    route: "/settings",
    title: "Configurações e privacidade",
    subtitle: "Preferências de conta, segurança, notificações e consentimentos ativos.",
    group: "configuracoes",
    icon: Settings,
    apiLabel: "Tela local",
    apiHint: "Configurações foram desenhadas a partir da experiência esperada de carteira e identidade gov.br.",
    primaryCta: "Salvar preferências",
    fields: [],
    observedFrom: "Padrões de navegação de wallet e labels de Settings dos bundles",
    blocks: ["Dados da conta", "Segurança", "Notificações", "Privacidade e consentimentos"],
  },
];

export const businessScreens: GovScreen[] = [
  {
    id: "entrada",
    route: "/",
    title: "Criar conta do empregado",
    subtitle: "Tela inicial da jornada BdWallet em que o empregado responsável cria a própria conta antes de abrir a carteira empresarial.",
    group: "acesso",
    icon: Building2,
    actionId: "step1_employee_signup",
    apiLabel: "Cadastro de empregado",
    apiHint: "Cria a conta do empregado Business com e-mail corporativo; este passo precisa vir antes das telas de abertura da BdWallet para disponibilizar e-mail, senha e token de usuário nas chamadas seguintes.",
    primaryCta: "Criar conta do empregado",
    fields: [
      { key: "employeeFirstName", label: "Nome", placeholder: "Maria", required: true },
      { key: "employeeLastName", label: "Sobrenome", placeholder: "Silva", required: true },
      { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true },
      { key: "employeePassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true },
    ],
    observedFrom: "br.business.drumwave.me/enter-name, /enter-email e /password",
    blocks: ["Nome e sobrenome", "E-mail corporativo", "Senha e aceite", "Próximo: verificação por e-mail"],
    appEmulation: { kind: "input-response", header: "Criar sua conta", lead: "Informe seus dados de empregado para iniciar a Business dWallet.", responseEmpty: "Após criar a conta, o app habilita o envio do código de verificação.", footerNote: "Esta é uma tela visível ao usuário final; o Passo 0 M2M permanece fora desta experiência." },
  },
  {
    id: "envio-email",
    route: "/email-verification/send-code",
    title: "Envio do código corporativo",
    subtitle: "Executa a API de envio de OTP para o e-mail corporativo cadastrado na Business dWallet.",
    group: "onboarding",
    icon: MailCheck,
    actionId: "step1_employee_send_code",
    apiLabel: "Enviar código",
    apiHint: "Mapeado do Postman como POST /v1/auth/token/iam/idp/users/send-code com attribute=email, value=e-mail corporativo e Accept-Language pt-br.",
    primaryCta: "Enviar código corporativo",
    fields: [{ key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true }],
    observedFrom: "Coleção Postman Dataprev Sandbox Test e br.business.drumwave.me/email-verification",
    blocks: ["E-mail corporativo", "Solicitação de envio", "Mensagem de código enviado", "Reenvio"],
    appEmulation: { kind: "input-response", header: "Verifique seu e-mail", lead: "Confirme o endereço corporativo para receber o código de segurança.", responseEmpty: "Depois do envio, o app informa que o código foi enviado e mostra a opção de reenviar.", footerNote: "O envio usa o e-mail criado na etapa anterior." },
  },
  {
    id: "email",
    route: "/email-verification",
    title: "Verificação de e-mail corporativo",
    subtitle: "Confirmação OTP antes de liberar o onboarding de empresa.",
    group: "onboarding",
    icon: MailCheck,
    actionId: "step1_employee_verify_code",
    apiLabel: "Validar código",
    apiHint: "Mapeado do Postman como POST /v1/auth/token/iam/idp/users/verify-code; o secretHash é calculado no servidor e não aparece no formulário.",
    primaryCta: "Confirmar e-mail",
    fields: [{ key: "employeeVerificationCode", label: "Código de verificação", placeholder: "000000", required: true }],
    observedFrom: "Coleção Postman Dataprev Sandbox Test e br.business.drumwave.me/email-verification",
    blocks: ["Seis campos de código", "Mensagem de envio", "Reenvio", "Continuar"],
    appEmulation: { kind: "input-response", header: "Digite o código", lead: "Insira o código recebido no e-mail corporativo para ativar a conta do empregado.", responseEmpty: "Após a validação, o app libera a entrada na conta do empregado e a abertura da BdWallet.", footerNote: "O secretHash é calculado no servidor e não aparece para o usuário." },
  },
  {
    id: "login-empregado",
    route: "/signin",
    title: "Entrar na conta do empregado",
    subtitle: "Autentica o empregado recém-criado para obter o token de usuário necessário à abertura da BdWallet empresarial.",
    group: "onboarding",
    icon: KeyRound,
    actionId: "step1_employee_signin",
    apiLabel: "Login do empregado",
    apiHint: "Executa o login do empregado Business antes de criar a entidade empresarial; o access token retornado alimenta as telas seguintes.",
    primaryCta: "Entrar como empregado",
    fields: [
      { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true },
      { key: "employeePassword", label: "Senha", placeholder: "Senha criada no cadastro", type: "password", required: true },
    ],
    observedFrom: "br.business.drumwave.me/signin e contrato Postman de login IAM",
    blocks: ["E-mail corporativo", "Senha", "Entrar", "Sessão do empregado"],
    appEmulation: { kind: "input-response", header: "Entrar", lead: "Use as credenciais do empregado para continuar a abertura da BdWallet.", responseEmpty: "Após o login, o app recebe o token de usuário e habilita o formulário de empresa.", footerNote: "Esta etapa torna explícita a dependência técnica usada pelas chamadas seguintes." },
  },
  {
    id: "empresa",
    route: "/enter-business-information",
    title: "Abrir BdWallet empresarial",
    subtitle: "Formulário do aplicativo para cadastrar a empresa e iniciar a carteira empresarial usando a sessão do empregado.",
    group: "onboarding",
    icon: FileCheck2,
    actionId: "step1_business_create",
    apiLabel: "Criar empresa",
    apiHint: "Registra a entidade Business depois que a conta do empregado foi criada, verificada e autenticada; os identificadores retornados alimentam dashboard, produtos e solicitações.",
    primaryCta: "Abrir BdWallet",
    fields: [
      { key: "businessName", label: "Nome empresarial", placeholder: "DrumWave Brasil", required: true },
      { key: "businessCnpj", label: "CNPJ", placeholder: "00000000000100", required: true },
      { key: "businessWebsite", label: "Website", placeholder: "https://empresa.example.com" },
      { key: "businessPhone", label: "Telefone", placeholder: "+55 11 99999-0000" },
      { key: "employeeRole", label: "Cargo do empregado", placeholder: "Administrador", required: true },
    ],
    observedFrom: "br.business.drumwave.me/enter-business-information",
    blocks: ["Nome empresarial", "CNPJ", "Website", "Telefone", "Cargo do usuário"],
    appEmulation: { kind: "input-response", header: "Abrir Business dWallet", lead: "Preencha as informações da empresa para criar a carteira empresarial.", responseEmpty: "Quando a API responder, o app mostra a Business dWallet criada e passa a usar businessId nas telas posteriores.", footerNote: "Esta tela depende da conta do empregado já criada e autenticada." },
  },
  {
    id: "kyc",
    route: "/verify",
    title: "Confirmação de identidade do responsável",
    subtitle: "Fluxo Persona/KYC aplicado ao usuário Business após informações empresariais.",
    group: "onboarding",
    icon: BadgeCheck,
    apiLabel: "Provedor KYC",
    apiHint: "Bloqueado na homologação sem documento real; reproduz estado pendente e trilha de etapas.",
    primaryCta: "Iniciar verificação",
    fields: [],
    observedFrom: "br.business.drumwave.me/pre-verify e /verify",
    blocks: ["País Brasil", "Documento", "Upload", "Aprovação pendente"],
  },
  {
    id: "painel",
    route: "/dashboard",
    title: "Painel empresarial",
    subtitle: "Visão de produtos, solicitações recebidas, campanhas ativas e indicadores financeiros.",
    group: "wallet",
    icon: LayoutDashboard,
    actionId: "step7_list_business_requests",
    apiLabel: "Solicitações recebidas",
    apiHint: "Lista solicitações de dados associadas à empresa quando o businessId está disponível.",
    primaryCta: "Atualizar painel",
    fields: [{ key: "businessId", label: "Identificador da empresa", placeholder: "Gerado no cadastro empresarial", required: true }],
    observedFrom: "Jornada de 17 passos e labels de dashboard/requests dos bundles",
    blocks: ["KPIs", "Solicitações recentes", "Campanhas", "Alertas operacionais"],
  },
  {
    id: "schemas",
    route: "/schemas-datasets",
    title: "Schemas, datasets e databases",
    subtitle: "Conexão e seleção de conjuntos de dados para configurar produtos e campanhas.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "Listar schemas",
    apiHint: "Consulta schemas externos disponíveis.",
    primaryCta: "Consultar schemas",
    fields: [],
    observedFrom: "Labels Connect datasets/databases e schema dos bundles",
    blocks: ["Schemas disponíveis", "Conectar database", "Mapear campos", "Status de integração"],
  },
  {
    id: "produtos",
    route: "/products",
    title: "Produtos de dados",
    subtitle: "Criação e gerenciamento de produtos que podem originar ofertas e campanhas.",
    group: "mercado",
    icon: PackageCheck,
    actionId: "step4_create_product",
    apiLabel: "Criar produto",
    apiHint: "Tenta criar produto de marketplace para a empresa registrada.",
    primaryCta: "Criar produto",
    fields: [{ key: "businessId", label: "Identificador da empresa", placeholder: "Gerado no cadastro empresarial", required: true }],
    observedFrom: "Labels Products, Marketplace e Create product dos bundles",
    blocks: ["Lista de produtos", "Novo produto", "Schema usado", "Status de publicação"],
  },
  {
    id: "planos",
    route: "/data-savings-plans",
    title: "Data Savings Plans",
    subtitle: "Planos comerciais, contribuições de dados, assinatura e renovação automática.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_list_dsps",
    apiLabel: "Listar DSPs",
    apiHint: "Consulta planos DSP aplicáveis às operações Business e Personal.",
    primaryCta: "Ver planos",
    fields: [],
    observedFrom: "Labels Data Savings Plan, subscription, contribution e renewal dos bundles",
    blocks: ["Criar plano", "Detalhes do plano", "Contribuições", "Renovação automática"],
  },
  {
    id: "saldo-btg",
    route: "/finance/balance",
    title: "Saldo empresarial",
    subtitle: "Tela de saldo operacional da BdWallet para acompanhar conta vinculada, disponibilidade e bloqueios.",
    group: "financeiro",
    icon: WalletCards,
    actionId: "btg_get_balance",
    apiLabel: "BTG saldo",
    apiHint: "Consulta o saldo BTG da conta empresarial configurada para testes financeiros.",
    primaryCta: "Atualizar saldo",
    fields: [{ key: "btgAccountId", label: "Conta BTG", placeholder: "account-id da conta BTG", required: true }],
    observedFrom: "Bundles Business, telas financeiras e coleção BTG Pactual",
    blocks: ["Saldo disponível", "Limites", "Bloqueios", "Atualização"],
    appEmulation: { kind: "input-response", header: "Saldo empresarial", lead: "Acompanhe os valores disponíveis para operações da empresa.", responseEmpty: "A resposta de saldo aparecerá como cards de valores no app.", footerNote: "Tokens e headers permanecem server-side." },
  },
  {
    id: "extrato-btg",
    route: "/finance/statement",
    title: "Extrato empresarial",
    subtitle: "Movimentações financeiras da empresa por período, consultadas via coleção BTG.",
    group: "financeiro",
    icon: ReceiptText,
    actionId: "btg_get_statement",
    apiLabel: "BTG extrato",
    apiHint: "Consulta extrato de conta BTG por accountId e intervalo de datas.",
    primaryCta: "Consultar extrato",
    fields: [
      { key: "btgAccountId", label: "Conta BTG", placeholder: "account-id da conta BTG", required: true },
      { key: "btgStartDate", label: "De", placeholder: "2026-04-05", type: "date", required: true },
      { key: "btgEndDate", label: "Até", placeholder: "2026-05-05", type: "date", required: true },
    ],
    observedFrom: "Jornada Business, labels Transactions/Finance e coleção BTG Pactual",
    blocks: ["Período", "Entradas", "Saídas", "Comprovantes"],
    appEmulation: { kind: "input-response", header: "Extrato", lead: "Filtre o período para visualizar as movimentações da empresa.", responseEmpty: "Após consultar, a tela exibirá lançamentos sanitizados e status da consulta.", footerNote: "A resposta técnica completa fica apenas na evidência lateral." },
  },
  {
    id: "pix-chave-btg",
    route: "/finance/pix/keys",
    title: "Gerenciar chave Pix",
    subtitle: "Tela de cadastro de chave Pix preservada na experiência do app, com lacuna explícita no contrato BTG fornecido.",
    group: "financeiro",
    icon: KeyRound,
    actionId: "btg_register_pix_key_gap",
    apiLabel: "BTG lacuna Pix",
    apiHint: "A coleção recebida não expõe endpoint de cadastro/gestão de chave Pix; cash-in e cobranças estão mapeados.",
    primaryCta: "Verificar contrato Pix",
    fields: [{ key: "btgPixKey", label: "Chave Pix empresarial", placeholder: "financeiro@empresa.gov.br", required: true }],
    observedFrom: "Tela esperada de Pix Business e lacuna mapeada em btg_journey_mapping.md",
    blocks: ["Tipo de chave", "Titularidade", "Validação", "Status"],
    appEmulation: { kind: "input-response", header: "Chaves Pix", lead: "Cadastre ou gerencie chaves Pix da empresa.", responseEmpty: "O app mostrará a indisponibilidade do endpoint e orientará configuração futura.", footerNote: "A ausência da API é intencionalmente visível para homologação." },
  },
  {
    id: "cobranca-pix-btg",
    route: "/finance/pix/charge",
    title: "Receber por Pix",
    subtitle: "Criação de cobrança Pix para recebimento empresarial, usando endpoints BTG de cash-in/cobrança.",
    group: "financeiro",
    icon: PiggyBank,
    actionId: "btg_create_pix_instant_collection",
    apiLabel: "BTG Pix cash-in",
    apiHint: "Cria cobrança Pix instantânea com valor, chave e descrição informados pelo usuário.",
    primaryCta: "Gerar cobrança",
    fields: [
      { key: "btgPixKey", label: "Chave Pix recebedora", placeholder: "financeiro@empresa.gov.br", required: true },
      { key: "btgAmount", label: "Valor", placeholder: "1.10", type: "number", required: true },
      { key: "btgDescription", label: "Descrição", placeholder: "Cobrança BdWallet gov.br" },
    ],
    observedFrom: "Coleção BTG Pactual Pix Cash-In",
    blocks: ["Valor", "Descrição", "QR Code", "Status de liquidação"],
    appEmulation: { kind: "input-response", header: "Receber Pix", lead: "Gere uma cobrança Pix para clientes ou parceiros.", responseEmpty: "Quando a API responder, a tela mostrará QR Code, identificador e status sanitizados.", footerNote: "Valores devem ser de homologação." },
  },
  {
    id: "pagamento-btg",
    route: "/finance/payments",
    title: "Enviar pagamento",
    subtitle: "Pagamento empresarial com linha digitável e valor como o operador veria no app real.",
    group: "financeiro",
    icon: ShoppingCart,
    actionId: "btg_create_payment",
    apiLabel: "BTG pagamento",
    apiHint: "Envia pagamento via endpoint Banking Payments da coleção BTG.",
    primaryCta: "Confirmar pagamento",
    fields: [
      { key: "btgBarcode", label: "Linha digitável", placeholder: "800800...", required: true },
      { key: "btgAmount", label: "Valor", placeholder: "1.10", type: "number", required: true },
      { key: "btgPaymentDate", label: "Data", placeholder: "2026-05-05", type: "date", required: true },
    ],
    observedFrom: "Coleção BTG Pactual Banking Payments",
    blocks: ["Conferência", "Débito", "Autorização", "Comprovante"],
    appEmulation: { kind: "input-response", header: "Enviar pagamento", lead: "Confira os dados do boleto antes de autorizar.", responseEmpty: "O app exibirá protocolo, status e eventual comprovante de pagamento.", footerNote: "A chamada usa credenciais BTG server-side e resposta sanitizada." },
  },
  {
    id: "ofertas",
    route: "/offers-campaigns",
    title: "Ofertas e campanhas",
    subtitle: "Publicação de ofertas, campanhas de dados e acompanhamento de conversão.",
    group: "mercado",
    icon: ClipboardList,
    actionId: "step11_business_offers_gap",
    apiLabel: "API faltante",
    apiHint: "Criação/publicação completa de ofertas não está externalizada na sandbox atual.",
    primaryCta: "Registrar lacuna",
    fields: [],
    observedFrom: "Labels Offers, Campaigns e Transactions dos bundles",
    blocks: ["Campanhas", "Oferta ativa", "Público-alvo", "Conversões"],
  },
  {
    id: "carrinho-checkout",
    route: "/cart-checkout",
    title: "Carrinho, checkout e operações",
    subtitle: "Acompanhamento de compra/contratação de produtos de dados e transações.",
    group: "financeiro",
    icon: ShoppingCart,
    actionId: "btg_get_statement",
    apiLabel: "BTG extrato",
    apiHint: "Usa extrato BTG como evidência financeira da operação enquanto o checkout completo de marketplace permanece dependente de endpoints futuros.",
    primaryCta: "Consultar operação",
    fields: [
      { key: "btgAccountId", label: "Conta BTG", placeholder: "account-id da conta BTG", required: true },
      { key: "btgStartDate", label: "De", placeholder: "2026-04-05", type: "date", required: true },
      { key: "btgEndDate", label: "Até", placeholder: "2026-05-05", type: "date", required: true },
    ],
    observedFrom: "Labels Cart, Checkout, Transactions e Finance dos bundles",
    blocks: ["Itens", "Resumo", "Pagamento", "Histórico de operações"],
  },
  {
    id: "configuracoes",
    route: "/settings",
    title: "Configurações empresariais",
    subtitle: "Equipe, permissões, segurança, notificações e preferências da empresa.",
    group: "configuracoes",
    icon: Settings,
    apiLabel: "Tela local",
    apiHint: "Componente visual sem endpoint externo identificado no mapeamento.",
    primaryCta: "Salvar configurações",
    fields: [],
    observedFrom: "Padrões de Settings e gestão de conta dos bundles",
    blocks: ["Perfil da empresa", "Usuários", "Permissões", "Notificações"],
  },
];

function validateField(key: string, label: string, value: unknown, required?: boolean, type?: string) {
  const text = String(value ?? "").trim();
  if (required && !text) return `${label} é obrigatório para esta ação.`;
  if (text && type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Informe um e-mail válido.";
  if (text && key.toLowerCase().includes("cnpj") && !/^\d{14}$/.test(text.replace(/\D/g, ""))) return "Informe um CNPJ com 14 dígitos.";
  if (required && key.toLowerCase().endsWith("id") && /gerado|conhecida|conhecido/i.test(text)) return `${label} ainda precisa ser gerado por uma etapa anterior.`;
  return undefined;
}

function readableJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

export function getVisualStatus(screen: GovScreen, evidence: Evidence | undefined, runningId: string | undefined): VisualStatus {
  if (screen.actionId && runningId === screen.actionId) return "running";
  if (!screen.actionId) return "missing";
  if (!evidence) return "pending";
  if (evidence.status === "not_executable") return evidence.ok ? "missing" : "failed";
  return evidence.ok ? "done" : "failed";
}

function summarizeStateUpdates(updates?: RunState) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "Nenhum identificador novo foi gravado no estado local após esta chamada.";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

function getDisplayedFields(screen: GovScreen): ScreenField[] {
  return screen.fields.length ? screen.fields : (screen.blocks || []).slice(0, 4).map((block, index) => ({ key: `${screen.id}-${index}`, label: block, placeholder: "" }));
}

function getShownFieldValue(field: ScreenField, values: RunState) {
  const raw = values[field.key];
  return field.type === "password" && raw ? "••••••••" : String(raw || field.placeholder || "Aguardando preenchimento");
}

export function AppEmulatedScreen({ screen, nextScreen, values, evidence, status }: { screen: GovScreen; nextScreen?: GovScreen; values: RunState; evidence?: Evidence; status: VisualStatus }) {
  const emulation = screen.appEmulation ?? {
    kind: screen.actionId ? "input-response" as const : "input" as const,
    header: screen.title,
    lead: screen.subtitle,
    responseEmpty: screen.actionId ? "Execute a ação da tela para visualizar a resposta que o aplicativo usaria." : "Tela visual sem resposta externa de API.",
  };
  const hasOkResponse = Boolean(evidence?.ok);
  const hasFailedResponse = Boolean(evidence && !evidence.ok);
  const shouldAdvanceToNextScreen = hasOkResponse && Boolean(nextScreen) && ["acesso", "onboarding", "wallet"].includes(screen.group);
  const phoneScreen = shouldAdvanceToNextScreen && nextScreen ? nextScreen : screen;
  const phoneEmulation = shouldAdvanceToNextScreen && nextScreen ? (nextScreen.appEmulation ?? { kind: nextScreen.actionId ? "input-response" as const : "input" as const, header: nextScreen.title, lead: nextScreen.subtitle, responseEmpty: "Próxima tela liberada pela resposta anterior." }) : emulation;
  const displayedFields = getDisplayedFields(phoneScreen);
  const responseText = evidence?.message || evidence?.missingReason || emulation.responseEmpty;
  const responseDetails = evidence ? summarizeStateUpdates(evidence.stateUpdates) : "Sem dados retornados nesta sessão.";
  const actionTone = status === "done" ? "bg-[#168821] text-white" : status === "failed" ? "bg-[#D04F4F] text-white" : "bg-[#1351B4] text-white";

  return (
    <div className="mx-auto max-w-[390px] rounded-[2.25rem] border border-slate-300 bg-slate-950 p-3 shadow-2xl">
      <div className="overflow-hidden rounded-[1.75rem] bg-[#F7F8FA] text-slate-950">
        <div className="flex items-center justify-between bg-[#071D41] px-5 py-2 text-white">
          <span className="text-[11px] font-semibold">9:41</span>
          <div className="h-1.5 w-20 rounded-full bg-white/80" aria-hidden="true" />
          <span className="text-[11px] font-semibold">5G</span>
        </div>
        <div className="bg-[#1351B4] px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Landmark className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-50">gov.br</p><p className="text-sm font-bold">Carteira de dados</p></div></div>
            <Badge className="bg-[#FFCD07] text-[#071D41]">{shouldAdvanceToNextScreen && nextScreen ? "próxima tela" : statusLabel[status]}</Badge>
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-2xl font-bold leading-tight">{phoneEmulation.header}</p>
            <p className="text-sm leading-6 text-blue-50">{shouldAdvanceToNextScreen && nextScreen ? `A API de ${screen.apiLabel} retornou OK. Continue na etapa: ${nextScreen.title}.` : phoneEmulation.lead}</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          {shouldAdvanceToNextScreen && nextScreen ? (
            <div className="rounded-[1.35rem] border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-700" /><p className="text-xs font-bold uppercase tracking-wide text-green-800">Resposta OK · fluxo avançado</p></div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{responseText}</p>
            </div>
          ) : null}

          {hasOkResponse && !shouldAdvanceToNextScreen ? (
            <div className="rounded-[1.35rem] border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-700" /><p className="text-xs font-bold uppercase tracking-wide text-green-800">Resultado no app</p></div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{responseText}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{responseDetails}</p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[1.35rem] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">{shouldAdvanceToNextScreen && nextScreen ? "Próxima tela do aplicativo" : "Dados da operação"}</p>
            {displayedFields.map(field => (
              <div key={field.key} className="rounded-2xl border border-[#DFE1E2] bg-[#F8F8F8] px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-500">{field.label}</p>
                <p className="mt-1 min-h-5 break-words text-sm font-semibold text-[#071D41]">{getShownFieldValue(field, values)}</p>
              </div>
            ))}
            <button type="button" className={`w-full rounded-2xl px-4 py-3 text-sm font-bold shadow-sm ${shouldAdvanceToNextScreen && nextScreen ? "bg-[#1351B4] text-white" : actionTone}`}>{shouldAdvanceToNextScreen && nextScreen ? nextScreen.primaryCta : screen.primaryCta}</button>
          </div>

          {hasFailedResponse ? (
            <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-700" /><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Não foi possível continuar</p></div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{responseText}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">Revise os dados e tente novamente. {responseDetails}</p>
            </div>
          ) : null}

          {!evidence && (emulation.kind === "response" || emulation.kind === "input-response") ? <p className="rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm"><strong>Resultado no app:</strong> {emulation.responseEmpty}</p> : null}
          {phoneEmulation.footerNote ? <p className="rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm">{phoneEmulation.footerNote}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function EvidenceBox({ evidence, status, actionId }: { evidence?: Evidence; status: VisualStatus; actionId?: string }) {
  if (!actionId) {
    return <div role="status" aria-live="polite" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"><strong>Status:</strong> {statusLabel[status]}. Esta tela é visual ou operacional local. Não há endpoint externo associado para exibir resposta de API.</div>;
  }

  if (status === "running") {
    return <div role="status" aria-live="polite" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>Status:</strong> {statusLabel[status]}. A wallet está consultando a API desta tela e exibirá o retorno sanitizado aqui assim que a chamada terminar.</div>;
  }

  if (!evidence) {
    return <div role="status" aria-live="polite" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"><strong>Status:</strong> {statusLabel[status]}. Nenhuma resposta de API foi carregada nesta tela. Acione o botão principal para consultar a API e mostrar aqui a requisição, a resposta sanitizada e os identificadores retornados.</div>;
  }

  return (
    <div role="region" aria-live="polite" aria-label={`Resposta da API ${evidence.actionTitle}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={evidence.ok ? "bg-green-700" : "bg-red-700"}>{evidence.ok ? "Resposta recebida" : evidence.status === "not_executable" ? "API ausente" : "Resposta com atenção"}</Badge>
        <Badge variant="outline">{evidence.httpStatus ? `HTTP ${evidence.httpStatus}` : statusLabel[status]}</Badge>
        <span className="text-xs text-slate-500">{new Date(evidence.executedAt).toLocaleString("pt-BR")}</span>
      </div>
      <Alert className={evidence.ok ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Resultado utilizado pelo aplicativo</AlertTitle>
        <AlertDescription>{evidence.message || evidence.missingReason || "A resposta sanitizada foi recebida e vinculada a esta tela da wallet."}</AlertDescription>
      </Alert>
      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Dados atualizados no app:</strong> {summarizeStateUpdates(evidence.stateUpdates)}</div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Requisição enviada pela tela</p>
          <Textarea readOnly value={readableJson(evidence.requestBody)} className="min-h-52 border-slate-700 bg-slate-950 font-mono text-xs text-slate-100" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resposta da API exibida ao usuário</p>
          <Textarea readOnly value={readableJson(evidence.responseBody || evidence)} className="min-h-52 border-slate-700 bg-slate-950 font-mono text-xs text-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function TestVariablesPanel({ variables, values, onChange, onReset }: { variables: TestVariable[]; values: RunState; onChange: (key: string, value: string) => void; onReset: () => void }) {
  const sections = useMemo(() => variables.reduce<Record<string, TestVariable[]>>((acc, item) => {
    acc[item.section] = [...(acc[item.section] || []), item];
    return acc;
  }, {}), [variables]);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl"><Settings className="h-5 w-5 text-[#1351B4]" />Variáveis de entrada editáveis</CardTitle>
            <CardDescription>Altere nomes, e-mails, telefones, endereços, senhas de teste e identificadores antes de executar as chamadas. Esses valores alimentam o mesmo estado enviado para a API da tela ativa.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={onReset}>Restaurar padrões desta sessão</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Estado único de teste</AlertTitle>
          <AlertDescription>Quando uma API retorna identificadores, eles continuam sendo preenchidos automaticamente. Se você sobrescrever um campo aqui, a próxima execução passa a usar o valor informado manualmente.</AlertDescription>
        </Alert>
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="space-y-3 rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">{section}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map(item => (
                <div key={item.key} className="space-y-2">
                  <Label htmlFor={`test-var-${item.key}`}>{item.label}</Label>
                  <Input id={`test-var-${item.key}`} type={item.type || "text"} value={String(values[item.key] ?? "")} placeholder={item.placeholder} onChange={event => onChange(item.key, event.target.value)} />
                  <p className="text-xs leading-5 text-slate-500">{item.description}{item.sensitive ? " O valor é redigido nos painéis de evidência." : ""}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DirectScreenVariablesPanel({ variables, values, activeFields, screenId, screenTitle, group, onChange, errors }: { variables: TestVariable[]; values: RunState; activeFields: ScreenField[]; screenId: string; screenTitle: string; group: ScreenGroup; onChange: (key: string, value: string) => void; errors?: Record<string, string> }) {
  const directVariables = useMemo(() => {
    const activeKeys = new Set(activeFields.map(field => field.key));
    const inferredSections = new Set<string>();

    if (group === "acesso" || group === "onboarding") {
      variables.forEach(item => {
        if (!item.section.toLowerCase().includes("identificadores")) inferredSections.add(item.section);
      });
    }

    if (screenId === "empresa") {
      inferredSections.add("Empresa");
      inferredSections.add("Endereço da empresa");
    }

    if (group === "wallet" || group === "mercado" || group === "financeiro") {
      inferredSections.add("Identificadores da jornada");
    }

    if (group === "configuracoes") {
      variables.forEach(item => inferredSections.add(item.section));
    }

    const selected = variables.filter(item => activeKeys.has(item.key) || inferredSections.has(item.section));
    return selected.length ? selected : activeFields.map(field => ({ ...field, section: "Campos da tela", description: "Campo operacional usado nesta tela." }));
  }, [activeFields, group, screenId, variables]);

  const sections = useMemo(() => directVariables.reduce<Record<string, TestVariable[]>>((acc, item) => {
    acc[item.section] = [...(acc[item.section] || []), item];
    return acc;
  }, {}), [directVariables]);

  if (!directVariables.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
        Esta tela emulada não exige variáveis editáveis para executar a ação principal. Use a aba <strong>Variáveis de teste</strong> se quiser alterar o estado global da jornada.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Campos editáveis nesta tela emulada</p>
        <p className="text-sm leading-6 text-slate-600">Altere aqui os dados que o usuário digitaria no aplicativo Dataprev emulado em <strong>{screenTitle}</strong>. Os mesmos valores ficam sincronizados com a aba <strong>Variáveis de teste</strong> e alimentam a próxima chamada da API.</p>
      </div>
      {Object.entries(sections).map(([section, items]) => (
        <div key={section} className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{section}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map(item => {
              const activeField = activeFields.find(field => field.key === item.key);
              const error = errors?.[item.key];
              return (
                <div key={item.key} className="space-y-2">
                  <Label htmlFor={`direct-${screenId}-${item.key}`}>{item.label}{activeField?.required ? " *" : ""}</Label>
                  <Input id={`direct-${screenId}-${item.key}`} type={item.type || activeField?.type || "text"} value={String(values[item.key] ?? "")} placeholder={item.placeholder || activeField?.placeholder} aria-invalid={Boolean(error)} onChange={event => onChange(item.key, event.target.value)} className={error ? "border-red-500 focus-visible:ring-red-500" : undefined} />
                  <p className="text-xs leading-5 text-slate-500">{item.description}{item.sensitive ? " O valor é redigido nos painéis de evidência." : ""}</p>
                  {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function M2MTokenPanel({ result, cachedToken, isRunning, onAuthenticate, error }: { result?: M2MAuthResult; cachedToken?: { tokenHandle?: string; expiresAt?: string; active?: boolean; expiresInSeconds?: number } | null; isRunning?: boolean; onAuthenticate: () => void; error?: string }) {
  const tokenStatus = result ?? cachedToken;
  const active = Boolean(tokenStatus?.active);
  const expiresAt = tokenStatus?.expiresAt ? new Date(tokenStatus.expiresAt).toLocaleString("pt-BR") : "não obtido";
  const tokenHandle = tokenStatus?.tokenHandle || "indisponível";
  const details = result?.responseBody ? readableJson(result.responseBody) : readableJson(tokenStatus ? { tokenHandle, expiresAt: tokenStatus.expiresAt, expiresInSeconds: tokenStatus.expiresInSeconds, active } : { status: "token ainda não solicitado nesta sessão" });

  return (
    <Card className="border-blue-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge className="bg-[#FFCD07] text-[#071D41]">Passo 0</Badge>
            <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-[#1351B4]" />Autenticação M2M token</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">Execute explicitamente a API de autenticação M2M para capturar o token no servidor. O token bruto não é exibido; apenas um handle opaco e a validade ficam visíveis para auditoria.</CardDescription>
          </div>
          <Button type="button" onClick={onAuthenticate} disabled={isRunning} className="bg-[#1351B4] hover:bg-[#0C326F]">
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isRunning ? "Autenticando M2M" : "Passo 0 — Autenticar M2M"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert className="border-amber-200 bg-amber-50 text-amber-950"><ShieldAlert className="h-4 w-4" /><AlertTitle>Falha no Passo 0</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status do token</p><p className={active ? "mt-1 font-semibold text-green-700" : "mt-1 font-semibold text-amber-700"}>{active ? "ativo no servidor" : tokenStatus ? "expirado ou inválido" : "não obtido"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Handle opaco</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{tokenHandle}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Expiração</p><p className="mt-1 font-semibold text-slate-800">{expiresAt}</p></div>
        </div>
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Reutilização nas chamadas seguintes</AlertTitle>
          <AlertDescription>{result?.message || "Quando o token estiver ativo, as ações que exigem M2M reutilizam o cache server-side e renovam a autenticação apenas quando a validade estiver próxima do fim."}</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultado sanitizado do Passo 0</p>
          <Textarea readOnly value={details} className="min-h-36 border-slate-700 bg-slate-950 font-mono text-xs text-slate-100" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CredentialsPanel({ baseUrl, configured, btgBaseUrl, btgConfigured }: { baseUrl?: string; configured?: boolean; btgBaseUrl?: string; btgConfigured?: boolean }) {
  const secretRows = [
    { key: "DATAPREV_BASE_URL", purpose: "Base da sandbox/API DrumWave-Dataprev usada pelo servidor." },
    { key: "DATAPREV_API_KEY", purpose: "Chave x-api-key enviada em todas as chamadas server-side." },
    { key: "DATAPREV_CLIENT_ID", purpose: "Client ID usado no passo zero OAuth client_credentials." },
    { key: "DATAPREV_CLIENT_SECRET", purpose: "Client secret usado no passo zero OAuth client_credentials." },
    { key: "BTG_BASE_URL", purpose: "Base da API BTG usada nas telas financeiras de saldo, extrato, Pix, cobranças e pagamentos." },
    { key: "BTG_COMPANY_ID", purpose: "Company ID BTG utilizado para montar rotas e escopos empresariais." },
    { key: "BTG_ACCESS_TOKEN", purpose: "Token bearer BTG server-side; nunca é exposto no app emulado." },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-[#1351B4]" />Credenciais e chaves</CardTitle>
        <CardDescription>Área de operação para saber quais variáveis controlam a autenticação. Por segurança, chaves reais não são lidas nem gravadas pelo navegador.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className={configured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{configured ? "Credenciais detectadas no servidor" : "Credenciais pendentes no servidor"}</AlertTitle>
          <AlertDescription>{configured ? "A aplicação reconhece as variáveis Dataprev necessárias no runtime server-side. Se ocorrer 401/403, atualize os valores publicados no painel seguro de Secrets e publique novo checkpoint." : "Configure as variáveis DATAPREV_* no painel seguro de Secrets antes de executar chamadas reais."}</AlertDescription>
        </Alert>
        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Resumo atual</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Base Dataprev</span><strong className="break-all text-slate-900">{baseUrl || "não informada"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Base BTG</span><strong className="break-all text-slate-900">{btgBaseUrl || "não informada"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Credenciais BTG</span><strong className={btgConfigured ? "text-green-700" : "text-amber-700"}>{btgConfigured ? "detectadas no servidor" : "pendentes no servidor"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Chaves sensíveis</span><strong className="text-slate-900">mascaradas no cliente</strong></div>
          </div>
        </div>
        <div className="space-y-3">
          {secretRows.map(row => (
            <div key={row.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_1fr] md:items-center">
              <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">{row.key}</code>
              <p className="text-sm leading-6 text-slate-600">{row.purpose}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">          <strong>Como alterar com segurança:</strong> abra o painel de gerenciamento do projeto, entre em <strong>Settings → Secrets</strong>, atualize as variáveis acima, salve, gere/publique um novo checkpoint e execute novamente os testes de Dataprev e BTG. A aplicação nunca deve receber client_secret, access token ou API key em campos comuns de formulário.
        </div>
      </CardContent>
    </Card>
  );
}

export function buildExecuteActionInput(actionId: string, mergedState: RunState) {
  return { actionId, state: mergedState as Record<string, string | number | boolean | null> };
}

export function GovBRWalletApp({ kind }: { kind: WalletKind }) {
  const screens = kind === "personal" ? personalScreens : businessScreens;
  const isPersonal = kind === "personal";
  const testVariables = isPersonal ? personalTestVariables : businessTestVariables;
  const metadata = trpc.dataprev.metadata.useQuery();
  const btgMetadata = trpc.btg.metadata.useQuery();
  const executeAction = trpc.dataprev.executeAction.useMutation();
  const executeBtgAction = trpc.btg.executeAction.useMutation();
  const authenticateM2M = trpc.dataprev.authenticateM2M.useMutation();
  const [activeId, setActiveId] = useState(screens[0]?.id ?? "entrada");
  const [state, setState] = useState<RunState>({});
  const [evidences, setEvidences] = useState<Record<string, Evidence>>({});
  const [m2mResult, setM2mResult] = useState<M2MAuthResult>();
  const [runningId, setRunningId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const active = screens.find(screen => screen.id === activeId) ?? screens[0];
  const activeIndex = screens.findIndex(screen => screen.id === active.id);
  const nextScreen = activeIndex >= 0 ? screens[activeIndex + 1] : undefined;
  const activeEvidence = active.actionId ? evidences[active.actionId] : undefined;
  const activeStatus = getVisualStatus(active, activeEvidence, runningId);
  const mergedState = useMemo(() => ({ ...(metadata.data?.initialState || {}), ...(btgMetadata.data?.initialState || {}), ...state }), [btgMetadata.data?.initialState, metadata.data?.initialState, state]);
  const completed = screens.filter(screen => screen.actionId && evidences[screen.actionId]?.ok).length;
  const callable = screens.filter(screen => screen.actionId).length;

  const grouped = useMemo(() => {
    return screens.reduce<Record<ScreenGroup, GovScreen[]>>((acc, screen) => {
      acc[screen.group] = [...(acc[screen.group] || []), screen];
      return acc;
    }, { acesso: [], onboarding: [], wallet: [], mercado: [], financeiro: [], configuracoes: [] });
  }, [screens]);

  const updateField = (key: string, value: string) => {
    setState(previous => updateRunStateValue(previous, key, value));
    setErrors(previous => {
      const next = { ...previous };
      delete next[key];
      delete next[active.id];
      return next;
    });
  };

  const resetTestVariables = () => {
    const keys = new Set(testVariables.map(item => item.key));
    setState(previous => {
      const next = { ...previous };
      keys.forEach(key => delete next[key]);
      return next;
    });
    setErrors({});
  };

  const runM2MAuthentication = async () => {
    setErrors(previous => {
      const next = { ...previous };
      delete next.m2m;
      return next;
    });
    try {
      const result = await authenticateM2M.mutateAsync();
      const typed = result as M2MAuthResult;
      setM2mResult(typed);
      if (!typed.ok) setErrors(previous => ({ ...previous, m2m: typed.message }));
      await metadata.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada ao executar o Passo 0 M2M.";
      setErrors(previous => ({ ...previous, m2m: message }));
    }
  };

  const run = async () => {
    if (!active.actionId) {
      setErrors(previous => ({ ...previous, [active.id]: "Esta tela foi mapeada como experiência visual; não há API externa associada." }));
      return;
    }
    const fieldErrors: Record<string, string> = {};
    active.fields.forEach(field => {
      const error = validateField(field.key, field.label, mergedState[field.key], field.required, field.type);
      if (error) fieldErrors[field.key] = error;
    });
    if (Object.keys(fieldErrors).length) {
      setErrors(previous => ({ ...previous, ...fieldErrors, [active.id]: "Revise os campos destacados antes de executar." }));
      return;
    }
    setRunningId(active.actionId);
    setErrors(previous => {
      const next = { ...previous };
      delete next[active.id];
      return next;
    });
    try {
      const executor = active.actionId.startsWith("btg_") ? executeBtgAction : executeAction;
      const evidence = await executor.mutateAsync(buildExecuteActionInput(active.actionId, mergedState));
      const typed = evidence as Evidence;
      setEvidences(previous => ({ ...previous, [active.actionId as string]: typed }));
      setState(previous => ({ ...previous, ...(typed.stateUpdates || {}) }));
      if (!typed.ok) setErrors(previous => ({ ...previous, [active.id]: typed.message || typed.missingReason || "A chamada retornou falha operacional." }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada na execução da API.";
      setErrors(previous => ({ ...previous, [active.id]: message }));
    } finally {
      setRunningId(undefined);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F8F8] text-slate-950">
      <header className="border-b border-[#DFE1E2] bg-white">
        <div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1351B4] text-white"><Landmark className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1351B4]">gov.br · carteira digital de dados</p>
              <h1 className="text-xl font-bold">{isPersonal ? "Personal dWallet GovBR" : "Business dWallet GovBR"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" />Jornada integrada</Button></Link>
            <Link href={isPersonal ? "/business-govbr" : "/personal-govbr"}><Button className="bg-[#1351B4] hover:bg-[#0C326F]">Abrir {isPersonal ? "Business" : "Personal"}</Button></Link>
          </div>
        </div>
      </header>

      <section className={isPersonal ? "govbr-hero-personal" : "govbr-hero-business"}>
        <div className="container grid gap-8 py-10 text-white lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-4">
            <Badge className="bg-[#FFCD07] text-[#071D41]">Protótipo espelhado da homologação</Badge>
            <h2 className="max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">{isPersonal ? "Carteira cidadã para controlar, autorizar e monetizar dados." : "Carteira empresarial para produtos, campanhas e operações de dados."}</h2>
            <p className="max-w-3xl text-base leading-7 text-blue-50">Este front-end reproduz a navegação pública, onboarding e telas internas mapeadas nos ambientes DrumWave, redesenhadas com hierarquia visual, cores, foco acessível e linguagem institucional brasileira.</p>
          </div>
          <Card className="border-white/20 bg-white/10 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />APIs e evidências</CardTitle>
              <CardDescription className="text-blue-50">{completed} de {callable} telas com chamadas OK nesta sessão local. O Passo 0 M2M é pré-requisito técnico de sandbox e não entra na experiência emulada do usuário.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-blue-50">
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Base Dataprev</span><span className="font-mono text-xs">{metadata.data?.baseUrl || "carregando"}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Base BTG</span><span className="font-mono text-xs">{btgMetadata.data?.baseUrl || "pendente"}</span></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="container grid gap-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Menu className="h-5 w-5 text-[#1351B4]" />Navegação da wallet</CardTitle>
              <CardDescription>Telas reproduzidas a partir da homologação e dos bundles públicos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(grouped) as ScreenGroup[]).map(group => grouped[group].length ? (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{groupLabel[group]}</p>
                  {grouped[group].map(screen => {
                    const Icon = screen.icon;
                    const selected = screen.id === active.id;
                    const evidence = screen.actionId ? evidences[screen.actionId] : undefined;
                    const visualStatus = getVisualStatus(screen, evidence, runningId);
                    return (
                      <button key={screen.id} onClick={() => setActiveId(screen.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${selected ? "bg-[#1351B4] text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                        <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{screen.title}</span></span>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase opacity-80">{statusLabel[visualStatus]}{evidence?.ok ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : screen.actionId ? <Play className="h-3 w-3 opacity-70" /> : <LockKeyhole className="h-3 w-3 opacity-60" />}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null)}
            </CardContent>
          </Card>
          <Alert className="border-[#1351B4]/20 bg-white">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Limite observado</AlertTitle>
            <AlertDescription>O mapeamento visual autenticado chegou até KYC Persona nas duas wallets; telas posteriores foram complementadas por análise de bundles e pela jornada de APIs.</AlertDescription>
          </Alert>
        </aside>

        <section className="space-y-5">
          <M2MTokenPanel result={m2mResult} cachedToken={metadata.data?.m2mToken} isRunning={authenticateM2M.isPending} onAuthenticate={runM2MAuthentication} error={errors.m2m} />
          <Tabs defaultValue="tela" className="space-y-5">
            <TabsList className="grid w-full grid-cols-3 bg-white">
              <TabsTrigger value="tela">Tela atual</TabsTrigger>
              <TabsTrigger value="variaveis">Variáveis de teste</TabsTrigger>
              <TabsTrigger value="credenciais">Credenciais</TabsTrigger>
            </TabsList>
            <TabsContent value="tela" className="space-y-5">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1351B4]">Rota espelhada: {active.route}</p>
            </div>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="border-[#1351B4] text-[#1351B4]">{groupLabel[active.group]}</Badge>
                  <CardTitle className="text-2xl">{active.title}</CardTitle>
                  <CardDescription className="max-w-3xl text-base leading-7">{active.subtitle}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={active.actionId ? "bg-[#168821]" : "bg-slate-600"}>{active.apiLabel}</Badge>
                  <Badge variant="outline" className="border-slate-300 text-slate-700">{statusLabel[activeStatus]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors[active.id] ? <Alert className="border-amber-200 bg-amber-50 text-amber-950"><ShieldAlert className="h-4 w-4" /><AlertTitle>Atenção nesta tela</AlertTitle><AlertDescription>{errors[active.id]}</AlertDescription></Alert> : null}

              <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
                  <AppEmulatedScreen screen={active} nextScreen={nextScreen} values={mergedState} evidence={activeEvidence} status={activeStatus} />
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1351B4] text-white"><active.icon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Composição da tela</p>
                      <p className="text-xs text-slate-500">Base observada em {active.observedFrom}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 md:grid-cols-2">
                    {(active.blocks || []).map(block => <div key={block} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">{block}</div>)}
                  </div>
                  <DirectScreenVariablesPanel variables={testVariables} values={mergedState} activeFields={active.fields} screenId={active.id} screenTitle={active.title} group={active.group} onChange={updateField} errors={errors} />
                  <Button onClick={run} disabled={Boolean(runningId)} className="bg-[#1351B4] hover:bg-[#0C326F]">
                    {runningId === active.actionId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {runningId === active.actionId ? "Consultando API desta tela" : active.primaryCta}
                  </Button>
                  <p className="text-sm leading-6 text-slate-600"><strong>Integração:</strong> {active.apiHint}</p>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                    <strong>Como o usuário vê o retorno:</strong> quando a ação é executada, a resposta sanitizada da API aparece no painel "Resposta da API exibida ao usuário" e os IDs retornados passam a alimentar automaticamente as próximas telas da wallet.
                  </div>
                </div>
                <div className="space-y-4">
                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-5 w-5 text-[#168821]" />Resumo operacional</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Aplicação</span><strong>{isPersonal ? "Personal" : "Business"}</strong></div>
                      <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Grupo</span><strong>{groupLabel[active.group]}</strong></div>
                      <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>API</span><strong>{active.actionId || "visual"}</strong></div>
                      <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Status da tela</span><strong>{statusLabel[activeStatus]}</strong></div>
                      <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Última resposta</span><strong>{activeEvidence?.executedAt ? new Date(activeEvidence.executedAt).toLocaleTimeString("pt-BR") : "não executada"}</strong></div>
                    </CardContent>
                  </Card>
                  <EvidenceBox evidence={activeEvidence} status={activeStatus} actionId={active.actionId} />
                </div>
              </div>
            </CardContent>
          </Card>
            </TabsContent>
            <TabsContent value="variaveis">
              <TestVariablesPanel variables={testVariables} values={mergedState} onChange={updateField} onReset={resetTestVariables} />
            </TabsContent>
            <TabsContent value="credenciais">
              <CredentialsPanel baseUrl={metadata.data?.baseUrl} configured={metadata.data?.credentialsConfigured} btgBaseUrl={btgMetadata.data?.baseUrl || undefined} btgConfigured={btgMetadata.data?.credentialsConfigured} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
