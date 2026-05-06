import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { clearPersistedDataprevCredentials, clearPersistedM2MTokenStatus, EMPTY_DATAPREV_CREDENTIALS, isM2MAuthResultActive, normalizeDataprevCredentials, persistDataprevCredentials, persistM2MTokenStatus, readPersistedDataprevCredentials, readPersistedM2MTokenStatus, type DataprevCredentialForm } from "@/lib/dataprevCredentials";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  FolderKey,
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
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

type WalletKind = "personal" | "business";
type ScreenGroup = "acesso" | "onboarding" | "wallet" | "mercado" | "financeiro" | "configuracoes";
export type VisualStatus = "pending" | "running" | "done" | "failed" | "missing";
type RunState = Record<string, string | number | boolean | null | undefined>;

export type CredentialFolderItem = {
  key: string;
  value: string;
  source: string;
  savedAt: string;
  purpose: string;
};

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

export const btgFutureInfoFields = [
  { key: "btgBaseUrl", label: "Base URL BTG", placeholder: "https://api.btgpactual.com", type: "url", sensitive: false, requiredFor: "todas as chamadas reais" },
  { key: "btgCompanyId", label: "Company ID", placeholder: "company-id BTG", sensitive: false, requiredFor: "saldo, extrato, Pix, cobranças e pagamentos" },
  { key: "btgAccessToken", label: "Token Bearer", placeholder: "Cole o token quando o BTG liberar", type: "password", sensitive: true, requiredFor: "qualquer chamada real" },
  { key: "btgAccountId", label: "Conta BTG", placeholder: "account-id da conta BTG", sensitive: false, requiredFor: "saldo e extrato" },
  { key: "btgDebitBranchCode", label: "Agência de débito", placeholder: "50", sensitive: false, requiredFor: "pagamentos" },
  { key: "btgDebitAccountNumber", label: "Conta de débito", placeholder: "000000000", sensitive: false, requiredFor: "pagamentos" },
  { key: "btgBarcode", label: "Linha digitável", placeholder: "800800...", sensitive: false, requiredFor: "conferência e pagamento" },
  { key: "btgAmount", label: "Valor de teste", placeholder: "1.10", type: "number", sensitive: false, requiredFor: "pagamentos, cobranças e Pix" },
  { key: "btgStartDate", label: "Início do extrato", placeholder: "2026-04-05", type: "date", sensitive: false, requiredFor: "extrato" },
  { key: "btgEndDate", label: "Fim do extrato", placeholder: "2026-05-05", type: "date", sensitive: false, requiredFor: "extrato" },
] as const;

export type BtgFutureInfoKey = (typeof btgFutureInfoFields)[number]["key"];

export function hasBtgFutureInfo(values: RunState) {
  return btgFutureInfoFields.some(field => Boolean(String(values[field.key] ?? "").trim()));
}

export function maskSecretPreview(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "não informado";
  return text.length <= 8 ? "••••••••" : `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

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
  { key: "dataRequestId", label: "Data Request ID", section: "Identificadores da jornada", placeholder: "Gerado/listado pela API", description: "Usado para aceite ou rejeição de solicitação de dados." },
  { key: "dataRequestDecision", label: "Decisão da solicitação", section: "Identificadores da jornada", placeholder: "accepted ou rejected", description: "Define se a Business dWallet aceitará ou rejeitará a solicitação de dados." },
  { key: "valueSchemaSid", label: "Value Schema SID", section: "Identificadores da jornada", placeholder: "Selecionado na listagem de schemas", description: "Schema escolhido a partir da resposta da API de Standard Value Schemas." },
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
    id: "login-pessoal",
    route: "/login",
    title: "Login da Personal dWallet",
    subtitle: "Autentica a pessoa física após o cadastro e gera token de usuário para as ações protegidas da carteira.",
    group: "acesso",
    icon: KeyRound,
    actionId: "step2_person_signin",
    apiLabel: "Login da pessoa",
    apiHint: "Executa a autenticação da pessoa física e mantém o token de usuário no servidor como handle sanitizado.",
    primaryCta: "Entrar na carteira",
    fields: [
      { key: "personEmail", label: "E-mail", placeholder: "cidadao@example.com", type: "email", required: true },
      { key: "personPassword", label: "Senha", placeholder: "Senha cadastrada", type: "password", required: true },
    ],
    observedFrom: "br.personal.drumwave.me/login e jornada de APIs Dataprev",
    blocks: ["E-mail", "Senha", "Sessão da carteira", "Token protegido no servidor"],
    appEmulation: { kind: "input-response", header: "Entrar na sua Personal dWallet", lead: "Informe suas credenciais para liberar solicitações, ofertas e carteira de dados.", responseEmpty: "Toque em Entrar na carteira para autenticar e habilitar as APIs protegidas do app." },
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
    id: "certificados-personal",
    route: "/certificates",
    title: "Certificados de dados pessoais",
    subtitle: "Visualiza certificados de dados já em posse da pessoa, retornados pela API de Data Savings Certificates.",
    group: "wallet",
    icon: FileCheck2,
    actionId: "step8_person_certificates",
    apiLabel: "Certificados Personal",
    apiHint: "Consulta GET /v1/dsavings/certificates no contexto Personal e monta cartões com emissor, identificador, status, validade e dados certificados quando a API retornar essas informações.",
    primaryCta: "Visualizar certificados",
    fields: [],
    observedFrom: "Jornada de APIs Dataprev: passo Pessoa consulta certificados",
    blocks: ["Certificados retornados", "Dados em posse da pessoa", "Emissor", "Status e validade"],
    appEmulation: { kind: "response", header: "Meus certificados", lead: "Veja os certificados de dados vinculados à Personal dWallet.", responseEmpty: "Toque em Visualizar certificados para consultar certificados pessoais disponíveis.", footerNote: "A tela mostra apenas dados funcionais sanitizados; a evidência técnica completa fica no painel lateral." },
  },
  {
    id: "planos",
    route: "/data-savings-plan",
    title: "Planos de poupança de dados",
    subtitle: "Adesão a planos DSP que remuneram a pessoa pelo uso autorizado dos dados.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_commercial_dsps",
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
    title: "Criar conta do funcionário",
    subtitle: "Tela inicial da jornada BdWallet em que o empregado responsável cria a própria conta antes de abrir a carteira empresarial.",
    group: "acesso",
    icon: Building2,
    actionId: "step1_employee_signup",
    apiLabel: "Cadastro de empregado",
    apiHint: "Cria a conta do empregado Business com e-mail corporativo; este passo precisa vir antes das telas de abertura da BdWallet para disponibilizar e-mail, senha e token de usuário nas chamadas seguintes.",
    primaryCta: "Criar conta do funcionário",
    fields: [
      { key: "employeeFirstName", label: "Nome", placeholder: "Maria", required: true },
      { key: "employeeLastName", label: "Sobrenome", placeholder: "Silva", required: true },
      { key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true },
      { key: "employeePassword", label: "Senha", placeholder: "Senha de teste", type: "password", required: true },
    ],
    observedFrom: "br.business.drumwave.me/enter-name, /enter-email e /password",
    blocks: ["Nome e sobrenome", "E-mail corporativo", "Senha e aceite", "Próximo: verificação por e-mail"],
    appEmulation: { kind: "input-response", header: "Criar sua conta", lead: "Informe seus dados de empregado para iniciar a Business dWallet.", responseEmpty: "Após criar a conta, o app habilita o envio do código de verificação.", footerNote: "Esta é uma tela visível ao usuário final; a autenticação técnica permanece fora desta experiência." },
  },
  {
    id: "envio-email",
    route: "/email-verification/send-code",
    title: "Envio do código de confirmação",
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
    title: "Entrar na conta do funcionário",
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
    title: "Abrir BdWallet",
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
    title: "Home da Business dWallet",
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
    id: "decisao-solicitacao",
    route: "/requests/decision",
    title: "Aceitar ou rejeitar solicitação de dados",
    subtitle: "Etapa Business dWallet para revisar uma solicitação pendente e decidir se o compartilhamento será aceito ou rejeitado.",
    group: "wallet",
    icon: ClipboardList,
    actionId: "step7_accept_data_request",
    apiLabel: "Decidir solicitação",
    apiHint: "Usa PATCH /v1/dwallet/data-request/{dataRequestId}. Se a decisão for accepted, executa aceite; se for rejected, executa rejeição com o mesmo ID de solicitação.",
    primaryCta: "Enviar decisão",
    fields: [
      { key: "dataRequestId", label: "Solicitação", placeholder: "Data Request ID", required: true },
      { key: "dataRequestDecision", label: "Decisão", placeholder: "accepted ou rejected", required: false },
    ],
    observedFrom: "Jornada de APIs Dataprev: listagem Business de solicitações pendentes e decisão PATCH de data request",
    blocks: ["Solicitação pendente", "Dados solicitados", "Aceitar compartilhamento", "Rejeitar compartilhamento", "Registro da decisão"],
    appEmulation: { kind: "input-response", header: "Solicitação de dados", lead: "Revise quem solicitou os dados, escolha aceitar ou rejeitar e envie a decisão pela Business dWallet.", responseEmpty: "Aguardando listagem de solicitações e decisão do responsável empresarial.", footerNote: "A rejeição usa a mesma rota PATCH com status rejected; o aceite usa status accepted." },
  },
  {
    id: "schemas",
    route: "/schemas-datasets",
    title: "Listar Value Schemas padrão",
    subtitle: "Conexão e seleção de conjuntos de dados para configurar produtos e campanhas, com escolha visual entre os schemas retornados pela API.",
    group: "wallet",
    icon: Database,
    actionId: "step3_list_schemas",
    apiLabel: "Listar schemas",
    apiHint: "Consulta schemas externos disponíveis e monta uma lista selecionável; quando a resposta trouxer sid/id, o primeiro schema é salvo como Value Schema SID para uso posterior.",
    primaryCta: "Consultar schemas",
    fields: [{ key: "valueSchemaSid", label: "Schema selecionado", placeholder: "Escolha após consultar a API", required: false }],
    observedFrom: "Labels Connect datasets/databases e schema dos bundles",
    blocks: ["Schemas retornados pela API", "Escolha do schema", "Conectar database", "Mapear campos", "Status de integração"],
  },
  {
    id: "certificados-business",
    route: "/certificates",
    title: "Listar certificados já em custódia",
    subtitle: "Visualiza certificados de dados já em posse da empresa, retornados pela API de Data Savings Certificates.",
    group: "wallet",
    icon: FileCheck2,
    actionId: "step9_business_certificates",
    apiLabel: "Certificados Business",
    apiHint: "Consulta GET /v1/dsavings/certificates no contexto Business e transforma a resposta em cartões de certificados com emissor, identificador, status e dados associados quando disponíveis.",
    primaryCta: "Visualizar certificados",
    fields: [],
    observedFrom: "Jornada de APIs Dataprev: passo Empresa consulta certificados",
    blocks: ["Certificados retornados", "Dados em posse da empresa", "Emissor", "Status e validade"],
    appEmulation: { kind: "response", header: "Certificados da empresa", lead: "Acompanhe certificados de dados vinculados à Business dWallet.", responseEmpty: "Toque em Visualizar certificados para consultar os certificados empresariais disponíveis.", footerNote: "Quando a sandbox retorna erro parcial, o painel técnico preserva a evidência sem expor tokens no celular." },
  },
  {
    id: "produtos",
    route: "/products",
    title: "Selecionar Value schema, Listar produtos, selecionar produtos e cadastrar produto",
    subtitle: "Criação e gerenciamento de produtos que podem originar ofertas e campanhas.",
    group: "mercado",
    icon: PackageCheck,
    actionId: "step4_list_products",
    apiLabel: "Listar produtos",
    apiHint: "Consulta o catálogo de dSKUs/produtos disponível para a empresa registrada.",
    primaryCta: "Consultar produtos",
    fields: [{ key: "businessId", label: "Identificador da empresa", placeholder: "Gerado no cadastro empresarial", required: true }],
    observedFrom: "Labels Products, Marketplace e Create product dos bundles",
    blocks: ["Lista de produtos", "Novo produto", "Schema usado", "Status de publicação"],
  },
  {
    id: "planos",
    route: "/data-savings-plans",
    title: "Listar DSP padrão, listar DS comercial, ver detalhe do DSP, selecionar DSP",
    subtitle: "Planos comerciais, contribuições de dados, assinatura e renovação automática.",
    group: "mercado",
    icon: PiggyBank,
    actionId: "step10_commercial_dsps",
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
    title: "Saldo BdW",
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
    appEmulation: { kind: "input-response", header: "Saldo BdW", lead: "Acompanhe os valores disponíveis para operações da empresa.", responseEmpty: "A resposta de saldo aparecerá como cards de valores no app.", footerNote: "Tokens e headers permanecem server-side." },
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

function credentialPurpose(key: string) {
  const normalized = key.toLowerCase();
  if (normalized.includes("business") || normalized.includes("company") || normalized.includes("bdw")) return "Use como entrada em solicitações da Personal dWallet e chamadas que dependem da Business dWallet.";
  if (normalized.includes("personal") || normalized.includes("pdw") || normalized.includes("wallet")) return "Use para login, abertura de carteira, consultas e operações da Personal dWallet.";
  if (normalized.includes("request") || normalized.includes("consent") || normalized.includes("solicit")) return "Use para consultar, aprovar ou acompanhar solicitações de dados entre wallets.";
  if (normalized.includes("token") || normalized.includes("handle")) return "Use como referência técnica de sessão; tokens brutos permanecem protegidos no servidor.";
  if (normalized.includes("btg") || normalized.includes("account")) return "Use como input das APIs financeiras BTG, como saldo, extrato, Pix e pagamentos.";
  return "Valor retornado por API e salvo para eventual reutilização em etapas posteriores.";
}

function createCredentialFolderItems(source: string, updates?: RunState): CredentialFolderItem[] {
  return Object.entries(updates || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => ({ key, value: String(value), source, savedAt: new Date().toISOString(), purpose: credentialPurpose(key) }));
}

function mergeCredentialFolder(previous: CredentialFolderItem[], incoming: CredentialFolderItem[]) {
  if (!incoming.length) return previous;
  const next = [...previous];
  incoming.forEach(item => {
    const existing = next.findIndex(saved => saved.key === item.key);
    if (existing >= 0) next[existing] = item;
    else next.unshift(item);
  });
  return next;
}

export function ScreenApiInstructionPanel({ screen, stepNumber, totalSteps, status, m2mReady, evidence }: { screen: GovScreen; stepNumber: number; totalSteps: number; status: VisualStatus; m2mReady: boolean; evidence?: Evidence }) {
  const hasExternalAction = Boolean(screen.actionId);
  const needsM2M = hasExternalAction && screen.actionId?.startsWith("step");
  const fieldsLabel = screen.fields.length ? "preencha os campos obrigatórios destacados no telefone" : "confira as informações já exibidas na tela";
  const actionLabel = hasExternalAction ? `a ação ${screen.actionId}` : "uma validação visual/local";
  const resultInstruction = status === "done"
    ? "revise a resposta OK e confirme se o telefone avançou ou exibiu o resumo esperado"
    : status === "failed"
      ? "leia a mensagem de erro sanitizada e ajuste campo, credencial ou pré-requisito antes de tentar novamente"
      : hasExternalAction
        ? "aguarde a resposta da API e confira o status no painel de evidências ao lado"
        : "marque esta tela como conferida quando a navegação e o conteúdo visual estiverem coerentes";

  return (
    <div className="rounded-3xl border border-[#1351B4]/25 bg-white p-4 shadow-sm" aria-label="Instruções de teste desta tela">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#1351B4] text-white">Etapa {stepNumber} de {totalSteps}</Badge>
            <Badge variant="outline" className="border-slate-300 text-slate-700">{statusLabel[status]}</Badge>
            {hasExternalAction ? <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800">API: {screen.actionId}</Badge> : <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">sem API externa</Badge>}
          </div>
          <p className="text-base font-bold text-slate-950">Como testar esta tela antes de usar o mockup</p>
          <p className="text-sm leading-6 text-slate-600">Use o telefone logo abaixo como área principal de teste. O formulário auxiliar permanece disponível apenas para ajuste fino dos mesmos valores.</p>
        </div>
        {evidence?.httpStatus ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Último HTTP {evidence.httpStatus}</span> : null}
      </div>


      <ol className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
        <li className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-950"><strong>1. Dados:</strong> {fieldsLabel} diretamente no mockup.</li>
        <li className="rounded-2xl border border-green-100 bg-green-50 p-3 text-green-950"><strong>2. Execução:</strong> pressione o botão principal do telefone para disparar {actionLabel}.</li>
        <li className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700"><strong>3. Resultado:</strong> {resultInstruction}.</li>
      </ol>
        <p className="mt-3 text-xs leading-5 text-slate-500"><strong>Integração esperada:</strong> {screen.apiHint}</p>
        <p className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950"><strong>Guardar retorno:</strong> qualquer identificador, token opaco, ID de wallet, ID de solicitação ou dado financeiro retornado por esta API é salvo na aba <strong>Variáveis</strong> para ser reutilizado como input nas próximas etapas.</p>
        {screen.actionId === "step6_create_data_request" ? <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Ordem obrigatória:</strong> abra a Business dWallet primeiro, crie a BdW e confirme que o ID da BdW foi salvo em Variáveis. Depois volte para a Personal dWallet e use esse ID para solicitar as informações na PdW.</p> : null}
    </div>
  );
}

function normalizeResponseItems(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const candidates = [record.items, record.data, record.results, record.valueSchemas, record.schemas, record.certificates, record.content];
  for (const candidate of candidates) {
    const normalized = normalizeResponseItems(candidate);
    if (normalized.length) return normalized;
  }
  return [record];
}

function pickText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return fallback;
}

function SchemaSelectionPreview({ evidence, selectedSchema, onChange }: { evidence?: Evidence; selectedSchema?: string; onChange: (key: string, value: string) => void }) {
  const schemas = normalizeResponseItems(evidence?.responseBody);
  const visibleSchemas = schemas.length ? schemas.slice(0, 4) : [
    { sid: selectedSchema || "schema-sandbox", name: "Schema aguardando resposta", description: "Execute a API para substituir este exemplo pelos schemas retornados." },
  ];
  const selected = selectedSchema || pickText(visibleSchemas[0], ["sid", "id", "schemaId"], "");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">Escolha de value schema</p>
      <p className="text-xs leading-5 text-slate-500">Selecione um dos schemas retornados pela API. O SID/ID escolhido fica disponível como variável de teste.</p>
      <div className="space-y-2">
        {visibleSchemas.map((schema, index) => {
          const sid = pickText(schema, ["sid", "id", "schemaId", "valueSchemaSid"], "schema-" + (index + 1));
          const name = pickText(schema, ["name", "title", "label", "displayName"], "Schema " + (index + 1));
          const description = pickText(schema, ["description", "summary", "type"], "Schema retornado pela sandbox Dataprev.");
          const checked = selected === sid;
          return (
            <button key={sid + "-" + index} type="button" onClick={() => onChange("valueSchemaSid", sid)} className={"w-full rounded-2xl border p-3 text-left transition " + (checked ? "border-[#1351B4] bg-[#E7F0FF]" : "border-slate-200 bg-slate-50 hover:bg-white")}>
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{name}</strong><span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-[#1351B4]">{sid}</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DataRequestDecisionPreview({ values, evidence, onChange }: { values: RunState; evidence?: Evidence; onChange: (key: string, value: string) => void }) {
  const decision = String(values.dataRequestDecision || "accepted");
  const requestId = String(values.dataRequestId || "aguardando solicitação");
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-amber-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Decisão da solicitação</p>
      <div className="rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">Solicitação: <strong className="font-mono">{requestId}</strong>. Escolha aceitar para liberar o compartilhamento ou rejeitar para registrar negativa.</div>
      <div className="grid grid-cols-2 gap-2">
        {[{ value: "accepted", label: "Aceitar" }, { value: "rejected", label: "Rejeitar" }].map(option => (
          <button key={option.value} type="button" onClick={() => onChange("dataRequestDecision", option.value)} className={"rounded-2xl px-3 py-3 text-sm font-bold " + (decision === option.value ? "bg-[#1351B4] text-white" : "bg-slate-100 text-slate-700")}>{option.label}</button>
        ))}
      </div>
      {evidence?.ok ? <p className="rounded-2xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">Decisão enviada com sucesso pela API.</p> : null}
    </div>
  );
}

function CertificatesPreview({ evidence, walletKind }: { evidence?: Evidence; walletKind: WalletKind }) {
  const certificates = normalizeResponseItems(evidence?.responseBody);
  const visibleCertificates = certificates.length ? certificates.slice(0, 4) : [
    { id: walletKind === "business" ? "cert-business-demo" : "cert-personal-demo", issuer: "Data Savings", status: "aguardando API", subject: walletKind === "business" ? "Empresa" : "Pessoa", dataType: "dados certificados" },
  ];
  return (
    <div className="space-y-3 rounded-[1.35rem] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#168821]">Certificados retornados</p>
      <p className="text-xs leading-5 text-slate-500">A tela monta cartões com as informações de certificados de dados já em posse da {walletKind === "business" ? "empresa" : "pessoa"}.</p>
      <div className="space-y-2">
        {visibleCertificates.map((certificate, index) => {
          const id = pickText(certificate, ["id", "certificateId", "sid", "uuid"], "certificado-" + (index + 1));
          const issuer = pickText(certificate, ["issuer", "provider", "source", "issuedBy"], "Emissor não informado");
          const statusText = pickText(certificate, ["status", "state"], evidence ? "retornado" : "aguardando API");
          const subject = pickText(certificate, ["subject", "holder", "owner", "dataOwner"], walletKind === "business" ? "Empresa" : "Pessoa");
          const dataType = pickText(certificate, ["dataType", "type", "schema", "schemaName", "name"], "Dados certificados");
          return (
            <div key={id + "-" + index} className="rounded-2xl border border-green-100 bg-green-50 p-3">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-950">{dataType}</strong><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-green-700">{statusText}</span></div>
              <p className="mt-1 text-xs text-slate-600">Titular: {subject} · Emissor: {issuer}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{id}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MockupExample({ screen, values }: { screen: GovScreen; values: RunState }) {
  const initials = String(values.personName || values.employeeName || values.legalName || "GovBR").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "GB";
  if (screen.id.includes("foto") || screen.id.includes("kyc") || screen.group === "onboarding") {
    return (
      <div className="rounded-[1.35rem] border border-blue-100 bg-[#EAF2FF] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">Exemplo visual montado</p>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#1351B4] text-xl font-bold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="font-bold text-slate-950">Avatar gov.br validado</p>
            <p className="text-xs leading-5 text-slate-600">Foto, documento e prova de vida aparecem como etapas com selo de validação antes de liberar a carteira.</p>
          </div>
          <Badge className="ml-auto bg-green-700 text-white">verificado</Badge>
        </div>
      </div>
    );
  }
  if (screen.group === "wallet") {
    return (
      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">Tela de carteira montada</p>
        <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#071D41,#1351B4)] p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100">dWallet ativa</p>
          <p className="mt-2 text-xl font-bold">{String(values.personName || values.legalName || "Titular GovBR")}</p>
          <p className="mt-6 font-mono text-xs text-blue-100">ID salvo: {String(values.businessWalletId || values.personalWalletId || values.walletId || "aguardando API")}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
          <span className="rounded-xl bg-slate-50 p-2">Solicitações</span><span className="rounded-xl bg-slate-50 p-2">Dados</span><span className="rounded-xl bg-slate-50 p-2">Credenciais</span>
        </div>
      </div>
    );
  }
  if (screen.group === "financeiro" || screen.group === "mercado") {
    return (
      <div className="rounded-[1.35rem] border border-green-100 bg-green-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-green-800">Exemplo de resultado no app</p>
        <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex justify-between text-sm"><span>Operação</span><strong>{screen.title}</strong></div>
          <div className="flex justify-between text-sm"><span>Status</span><strong className="text-green-700">Aguardando execução</strong></div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Após a API, este espaço mostra comprovante, saldo, extrato ou resumo de marketplace em formato de tela final do aplicativo.</div>
        </div>
      </div>
    );
  }
  return null;
}

export function AppEmulatedScreen({ screen, nextScreen, values, evidence, status, onChange, onRun, onOpenNextScreen, isRunning, errors }: { screen: GovScreen; nextScreen?: GovScreen; values: RunState; evidence?: Evidence; status: VisualStatus; onChange: (key: string, value: string) => void; onRun: () => void; onOpenNextScreen?: () => void; isRunning?: boolean; errors?: Record<string, string> }) {
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
  const isBusinessWallet = screen.route.includes("business") || screen.title.toLowerCase().includes("business") || screen.title.toLowerCase().includes("empresa") || screen.title.toLowerCase().includes("colaborador");
  const walletPersona = isBusinessWallet ? "Pessoa jurídica" : "Pessoa física";
  const walletDocumentLabel = isBusinessWallet ? "CNPJ verificado" : "CPF verificado";
  const walletMainDocument = isBusinessWallet ? String(values.businessCnpj ?? "00.000.000/0001-00") : String(values.personCpf ?? "***.000.111-**");
  const walletDisplayName = isBusinessWallet ? String(values.businessName ?? "Empresa GovBR") : String(values.personName ?? values.personFirstName ?? "Cidadão GovBR");
  const canRunCurrentAction = Boolean(screen.actionId) && !shouldAdvanceToNextScreen;
  const buttonLabel = shouldAdvanceToNextScreen && nextScreen ? nextScreen.primaryCta : isRunning ? "Enviando dados" : screen.primaryCta;
  const handlePrimaryClick = () => {
    if (shouldAdvanceToNextScreen && nextScreen) {
      onOpenNextScreen?.();
      return;
    }
    if (canRunCurrentAction) onRun();
  };

  return (
    <div className="mx-auto max-w-[390px] rounded-[2.25rem] border border-slate-300 bg-slate-950 p-3 shadow-2xl">
      <div className="overflow-hidden rounded-[1.75rem] bg-[#F7F8FA] text-slate-950">
        <div className="flex items-center justify-between bg-[#071D41] px-5 py-2 text-white">
          <span className="text-[11px] font-semibold">9:41</span>
          <div className="h-1.5 w-20 rounded-full bg-white/80" aria-hidden="true" />
          <span className="text-[11px] font-semibold">5G</span>
        </div>
        <div className="bg-[linear-gradient(180deg,#1351B4_0%,#0C326F_100%)] px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><Landmark className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-50">gov.br</p><p className="text-sm font-bold">Carteira de dados</p></div></div>
            <Badge className="bg-[#FFCD07] text-[#071D41]">{shouldAdvanceToNextScreen && nextScreen ? "próxima tela" : statusLabel[status]}</Badge>
          </div>
          <div className="mt-5 rounded-[1.35rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFCD07]">{walletPersona}</p>
            <p className="mt-1 text-2xl font-bold leading-tight">{walletDisplayName}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1">{walletDocumentLabel}: {walletMainDocument}</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Conta prata/ouro</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xl font-bold leading-tight">{phoneEmulation.header}</p>
            <p className="text-sm leading-6 text-blue-50">{shouldAdvanceToNextScreen && nextScreen ? `A API de ${screen.apiLabel} retornou OK. Continue na etapa: ${nextScreen.title}.` : phoneEmulation.lead}</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#1351B4]">Identidade</p>
              <p className="mt-2 text-sm font-bold text-slate-950">{walletDocumentLabel}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{walletMainDocument}</p>
            </div>
            <div className="rounded-[1.35rem] border border-green-100 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#168821]">Permissões</p>
              <p className="mt-2 text-sm font-bold text-slate-950">Compartilhamento seguro</p>
              <p className="mt-1 text-xs text-slate-500">Dados sob consentimento</p>
            </div>
          </div>
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

          {screen.id === "schemas" ? <SchemaSelectionPreview evidence={evidence} selectedSchema={String(values.valueSchemaSid || "")} onChange={onChange} /> : null}
          {screen.id === "decisao-solicitacao" ? <DataRequestDecisionPreview values={values} evidence={evidence} onChange={onChange} /> : null}
          {(screen.id === "certificados-personal" || screen.id === "certificados-business") ? <CertificatesPreview evidence={evidence} walletKind={screen.id === "certificados-business" ? "business" : "personal"} /> : null}
          <MockupExample screen={phoneScreen} values={values} />

          <div className="space-y-3 rounded-[1.35rem] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1351B4]">{shouldAdvanceToNextScreen && nextScreen ? "Próxima tela do aplicativo" : "Dados da operação"}</p>
            {displayedFields.map(field => {
              const fieldError = errors?.[field.key];
              return (
                <div key={field.key} className="space-y-1.5 rounded-2xl border border-[#DFE1E2] bg-[#F8F8F8] px-4 py-3">
                  <Label htmlFor={`phone-${phoneScreen.id}-${field.key}`} className="text-[11px] font-semibold text-slate-500">{field.label}{field.required ? " *" : ""}</Label>
                  <Input
                    id={`phone-${phoneScreen.id}-${field.key}`}
                    type={field.type || "text"}
                    value={String(values[field.key] ?? "")}
                    placeholder={field.placeholder}
                    aria-invalid={Boolean(fieldError)}
                    onChange={event => onChange(field.key, event.target.value)}
                    className={`h-10 rounded-xl border-white bg-white text-sm font-semibold text-[#071D41] shadow-none placeholder:text-slate-400 focus-visible:ring-[#1351B4] ${fieldError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {fieldError ? <p className="text-[11px] font-semibold leading-4 text-red-700">{fieldError}</p> : null}
                </div>
              );
            })}
            <button type="button" onClick={handlePrimaryClick} disabled={Boolean(isRunning) || (!screen.actionId && !shouldAdvanceToNextScreen)} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${shouldAdvanceToNextScreen && nextScreen ? "bg-[#1351B4] text-white" : actionTone}`}>{isRunning ? "Enviando dados" : buttonLabel}</button>
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
          <div className="grid grid-cols-4 gap-2 rounded-[1.35rem] bg-white px-3 py-3 text-center text-[10px] font-semibold text-slate-500 shadow-sm" aria-label="Navegação inferior do aplicativo Gov.BR">
            <span className="rounded-xl bg-[#E7F0FF] px-2 py-2 text-[#1351B4]">Início</span>
            <span className="px-2 py-2">Dados</span>
            <span className="px-2 py-2">Consent.</span>
            <span className="px-2 py-2">Conta</span>
          </div>
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

export function M2MTokenPanel({ result, cachedToken, isRunning, onAuthenticate, error }: { result?: M2MAuthResult; cachedToken?: { tokenHandle?: string; expiresAt?: string; active?: boolean; expiresInSeconds?: number } | null; isRunning?: boolean; onAuthenticate?: () => void; error?: string }) {
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
            <Badge className="bg-[#FFCD07] text-[#071D41]">Técnico</Badge>
            <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-[#1351B4]" />Gerar M2M token</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">Depois de preencher as credenciais, clique em <strong>Gerar M2M token</strong>. O servidor salva o token bruto até a expiração e o usa como header <strong>Authorization: Bearer</strong> nas APIs Dataprev que exigirem autenticação técnica. A interface mostra apenas handle opaco e validade.</CardDescription>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {isRunning ? <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-950"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Autenticando</Badge> : null}
                <Button type="button" onClick={onAuthenticate} disabled={isRunning} className="bg-[#1351B4] text-white hover:bg-[#0C326F]"><KeyRound className="mr-2 h-4 w-4" />Gerar M2M token</Button>
              </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert className="border-amber-200 bg-amber-50 text-amber-950"><ShieldAlert className="h-4 w-4" /><AlertTitle>Falha na autenticação técnica</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Credenciais obrigatórias para chamadas Dataprev</AlertTitle>
          <AlertDescription>Para chamadas reais usando credenciais temporárias, preencha primeiro <strong>API URL</strong>, <strong>API ID / x-api-key</strong>, <strong>Client ID</strong> e <strong>Secret ID / Client secret</strong>. Em seguida, clique em <strong>Gerar M2M token</strong>. Sem token ativo, as demais APIs Dataprev ficam bloqueadas para evitar chamadas sem Authorization Bearer válido.</AlertDescription>
        </Alert>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status do token</p><p className={active ? "mt-1 font-semibold text-green-700" : "mt-1 font-semibold text-amber-700"}>{active ? "ativo no servidor" : tokenStatus ? "expirado ou inválido" : "não obtido"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Handle opaco</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{tokenHandle}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Expiração</p><p className="mt-1 font-semibold text-slate-800">{expiresAt}</p></div>
        </div>
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Reutilização nas chamadas seguintes</AlertTitle>
          <AlertDescription>{result?.message || "As ações que exigem autenticação técnica usam somente o token M2M já gerado e salvo no servidor. Quando ele expirar, gere um novo token antes de continuar a jornada."}</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultado sanitizado da autenticação técnica</p>
          <Textarea readOnly value={details} className="min-h-36 border-slate-700 bg-slate-950 font-mono text-xs text-slate-100" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CredentialFolderPanel({ items, values, onClear }: { items: CredentialFolderItem[]; values: RunState; onClear?: () => void }) {
  const stateItems = createCredentialFolderItems("Estado atual da jornada", values).filter(item => !items.some(saved => saved.key === item.key));
  const combined = [...items, ...stateItems].slice(0, 24);
  return (
    <Card className="border-blue-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl"><FolderKey className="h-5 w-5 text-[#1351B4]" />Pasta de variáveis</CardTitle>
            <CardDescription>Valores gerados ou preenchidos durante as APIs ficam guardados aqui para uso como input em outras etapas. Exemplos: ID da BdW, ID da PdW, IDs de solicitação, tokens opacos, conta BTG e referências de pagamento.</CardDescription>
          </div>
          {onClear ? <Button type="button" variant="outline" onClick={onClear} className="shrink-0"><Trash2 className="mr-2 h-4 w-4" />Limpar variáveis de resposta do teste</Button> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Reutilização entre APIs</AlertTitle>
          <AlertDescription>Antes de executar uma etapa dependente, confira nesta pasta se a informação exigida já foi gerada. Por exemplo, abra a BdW para gerar o ID da BdW; depois use esse ID na PdW para solicitar informações.</AlertDescription>
        </Alert>
        {combined.length ? (
          <div className="space-y-3">
            {combined.map(item => (
              <div key={item.source + "-" + item.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4 md:grid-cols-[220px_1fr] md:items-start">
                <div className="space-y-1"><code className="block break-all rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800">{item.key}</code><p className="text-[11px] text-slate-500">{new Date(item.savedAt).toLocaleString("pt-BR")}</p></div>
                <div className="space-y-2"><p className="break-all font-mono text-xs text-slate-900">{item.value}</p><p className="text-sm leading-6 text-slate-600"><strong>Origem:</strong> {item.source}. <strong>Uso:</strong> {item.purpose}</p></div>
              </div>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Nenhuma informação gerada ainda. Execute as telas de criação, abertura e consulta para começar a preencher esta pasta.</div>}
      </CardContent>
    </Card>
  );
}

export function BeginnerTestGuide({ walletKind, screens = [], evidences = {}, runningId, m2mCompleted = false, reviewedSteps = {}, onToggleReviewed, onOpenStep }: { walletKind: WalletKind; screens?: GovScreen[]; evidences?: Record<string, Evidence>; runningId?: string; m2mCompleted?: boolean; reviewedSteps?: Record<string, boolean>; onToggleReviewed?: (stepId: string, checked: boolean) => void; onOpenStep?: (screenId: string) => void }) {
  const appName = walletKind === "personal" ? "Personal dWallet" : "Business dWallet";
  const orderedSteps = walletKind === "personal" ? [
    ["1", "Preencher credenciais do 1Password", "Abra a aba Variáveis e confirme API URL/Base URL, API ID / x-api-key, Client ID e Client Secret no primeiro bloco Variáveis e chaves."],
    ["2", "Gerar M2M token", "Ainda na aba Variáveis, clique no botão Gerar M2M token. O token fica salvo até expirar e será usado como Authorization Bearer nas demais APIs Dataprev quando necessário."],
    ["3", "Criar e validar Personal dWallet", "Execute criação, envio de código e validação na ordem da navegação lateral. IDs da PdW, usuário ou sessão retornados pela API são salvos automaticamente em Variáveis."],
    ["4", "Abrir a BdW antes de solicitar dados", "Quando uma tela Personal exigir Business ID, abra a Business dWallet, crie/abra a BdW e copie da aba Variáveis o ID da BdW gerado pela API empresarial."],
    ["5", "Solicitar informações na PdW", "Volte para a Personal dWallet, confirme que o Business ID está preenchido e execute a solicitação de dados. Guarde o requestId/consentId retornado para aprovação, consulta ou próximos testes."],
    ["6", "Executar telas finais e financeiras", "Depois da wallet criada e dos IDs salvos, teste saldo, extrato, Pix, pagamento e marketplace. O mockup deve mostrar comprovante, resumo ou tela final montada, não apenas JSON técnico."],
  ] : [
    ["1", "Preencher credenciais do 1Password", "Abra a aba Variáveis e confirme API URL/Base URL, API ID / x-api-key, Client ID e Client Secret no primeiro bloco Variáveis e chaves."],
    ["2", "Gerar M2M token", "Ainda na aba Variáveis, clique no botão Gerar M2M token. O token fica salvo até expirar e será usado como Authorization Bearer nas demais APIs Dataprev quando necessário."],
    ["3", "Criar Business dWallet", "Cadastre empresa, colaborador e validações no mockup. Guarde automaticamente o ID da BdW, companyId ou walletId retornado pela API."],
    ["4", "Abrir e validar a BdW", "Continue na ordem lateral até a carteira empresarial estar aberta. Esses dados serão usados pela Personal dWallet quando ela precisar solicitar informações à BdW."],
    ["5", "Produtos, schemas e solicitações", "Execute uma tela por vez, salvando IDs de produto, schema, solicitação ou consentimento em Variáveis para chamadas relacionadas."],
    ["6", "Operações financeiras", "Teste saldo, extrato, Pix, cobranças e pagamentos no fim da jornada. O mockup deve mostrar resumo ou comprovante montado com os dados retornados."],
  ];
  const checklistItems = [
    ...screens.map(screen => ({
      id: screen.id,
      title: screen.title,
      description: screen.actionId ? screen.apiHint : "Tela visual sem endpoint externo obrigatório; use para conferir a continuidade da experiência.",
      status: getVisualStatus(screen, screen.actionId ? evidences[screen.actionId] : undefined, runningId),
    })),
  ];
  const doneOrReviewed = checklistItems.filter(item => item.status === "done" || reviewedSteps[item.id]).length;
  const progressValue = checklistItems.length ? Math.round((doneOrReviewed / checklistItems.length) * 100) : 0;
  const statusClasses: Record<VisualStatus, string> = {
    pending: "border-slate-200 bg-slate-50 text-slate-700",
    running: "border-blue-200 bg-blue-50 text-blue-950",
    done: "border-green-200 bg-green-50 text-green-950",
    failed: "border-amber-200 bg-amber-50 text-amber-950",
    missing: "border-slate-300 bg-white text-slate-700",
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><ClipboardList className="h-5 w-5 text-[#1351B4]" />Guia de execução das APIs</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">Siga esta ordem para testar a {appName} dentro do mockup. Edite os dados no telefone, execute uma API por vez e confira quais informações foram salvas em Variáveis para alimentar etapas seguintes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Antes de começar</AlertTitle>
          <AlertDescription>Primeiro confirme na aba Variáveis se os quatro valores recebidos via 1Password foram colados como conjunto completo. Depois use a navegação lateral de cima para baixo. As próximas etapas ficam sinalizadas como dependentes quando ainda faltam IDs, confirmações ou respostas OK anteriores. Se aparecer erro, corrija o campo destacado no telefone e tente novamente.</AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="hidden bg-[#1351B4] px-4 py-3 text-sm font-bold text-white md:grid md:grid-cols-[72px_minmax(180px,1fr)_minmax(260px,1.6fr)] md:gap-4">
            <span>Ordem</span><span>O que testar</span><span>Como executar</span>
          </div>
          <div className="divide-y divide-slate-200">
            {orderedSteps.map(([order, title, instruction]) => (
              <div key={order} className="grid gap-3 px-4 py-4 text-sm leading-6 md:grid-cols-[72px_minmax(180px,1fr)_minmax(260px,1.6fr)] md:gap-4 md:items-start">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-mono font-bold text-[#1351B4] md:h-auto md:w-auto md:justify-start md:rounded-none md:bg-transparent">{order}</span>
                <span className="font-semibold text-slate-950">{title}</span>
                <span className="text-slate-600">{instruction}</span>
              </div>
            ))}
          </div>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5" aria-label="Checklist visual de progresso da jornada">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Checklist visual de progresso</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Cada linha representa uma etapa da execução. As etapas ficam concluídas quando a API retorna OK, e os valores gerados ficam disponíveis em Variáveis para serem reutilizados como input em outras APIs.</p>
            </div>
            <Badge className="bg-[#1351B4] text-white">{doneOrReviewed} de {checklistItems.length} revisadas</Badge>
          </div>
          <div className="mt-4 space-y-2">
            <Progress value={progressValue} className="h-3 bg-white" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{progressValue}% do roteiro acompanhado nesta sessão</p>
          </div>
          <div className="mt-5 space-y-3">
            {checklistItems.map((item, index) => {
              const checked = item.status === "done" || Boolean(reviewedSteps[item.id]);
              const running = item.status === "running";
              const previousPending = checklistItems.slice(0, index).some(previous => previous.status !== "done" && !reviewedSteps[previous.id]);
              return (
                <div key={item.id} className={
                  "grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_1fr_auto] md:items-center " + (previousPending ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")
                }>
                  <div className="flex items-center gap-3">
                    <Checkbox id={`guide-check-${walletKind}-${item.id}`} checked={checked} onCheckedChange={value => onToggleReviewed?.(item.id, value === true)} aria-label={`Marcar etapa ${index + 1} como revisada`} />
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E7F0FF] font-mono text-sm font-bold text-[#1351B4]">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <Badge variant="outline" className={statusClasses[item.status]}>{running ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : item.status === "done" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}{statusLabel[item.status]}</Badge>
                      {reviewedSteps[item.id] && item.status !== "done" ? <Badge variant="outline" className="border-[#FFCD07] bg-[#FFF7CC] text-[#071D41]">revisada manualmente</Badge> : null}
                      {previousPending ? <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">aguardando pré-requisito</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <Button type="button" variant="outline" disabled={previousPending} onClick={() => onOpenStep?.(item.id)} className="justify-center bg-white">{previousPending ? "Concluir anteriores" : "Abrir etapa"}</Button>
                </div>
              );
            })}
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-950"><strong>Resultado esperado OK:</strong> a tela do telefone avança para a etapa seguinte ou mostra um comprovante/resumo real da operação.</div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Resultado esperado com pendência:</strong> o telefone mostra uma mensagem de falha ou pendência em linguagem de aplicativo, e o painel técnico abaixo fica apenas como evidência sanitizada.</div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4 text-sm leading-6 text-slate-700"><strong>Quando usar Variáveis de teste:</strong> use a aba apenas para ajustes avançados. O teste comum deve acontecer diretamente dentro do mockup de celular.</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function getMissingM2MCredentialLabels(credentials: DataprevCredentialForm) {
  const requiredFields: Array<{ key: keyof DataprevCredentialForm; label: string }> = [
    { key: "baseUrl", label: "API URL" },
    { key: "apiKey", label: "API ID / x-api-key" },
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Secret ID / Client secret" },
  ];

  return requiredFields
    .filter(field => !String(credentials[field.key] ?? "").trim())
    .map(field => field.label);
}

export function buildRequiredApiCredentialsMessage(missingCredentials: string[]) {
  return `Antes de executar qualquer API, preencha na aba Variáveis as quatro credenciais obrigatórias de acesso: ${missingCredentials.join(", ")}. A chamada não foi realizada para evitar autenticação incompleta ou uso de ambiente incorreto.`;
}

export function buildDataprevCredentialsInput(credentials: DataprevCredentialForm) {
  const trimmed = {
    baseUrl: credentials.baseUrl.trim(),
    apiKey: credentials.apiKey.trim(),
    clientId: credentials.clientId.trim(),
    clientSecret: credentials.clientSecret.trim(),
  };
  return Object.values(trimmed).some(Boolean) ? trimmed : undefined;
}


export function getDataprevCredentialChecklist(credentials: DataprevCredentialForm) {
  return [
    {
      key: "baseUrl" as const,
      label: "API URL",
      onePasswordName: "Base URL ou API URL",
      hint: "Cole o endereço base do ambiente de homologação informado no item do 1Password.",
      filled: Boolean(credentials.baseUrl.trim()),
    },
    {
      key: "apiKey" as const,
      label: "API ID / x-api-key",
      onePasswordName: "x-api-key",
      hint: "Cole a chave de API exatamente como recebida, sem espaços extras.",
      filled: Boolean(credentials.apiKey.trim()),
    },
    {
      key: "clientId" as const,
      label: "Client ID",
      onePasswordName: "Client ID",
      hint: "Identifica o cliente técnico usado para gerar explicitamente o M2M token.",
      filled: Boolean(credentials.clientId.trim()),
    },
    {
      key: "clientSecret" as const,
      label: "Secret ID / Client secret",
      onePasswordName: "Client Secret",
      hint: "Segredo usado apenas no backend para obter o token técnico; nunca aparece nas evidências.",
      filled: Boolean(credentials.clientSecret.trim()),
    },
  ];
}

export function CredentialsPanel({ baseUrl, configured, btgBaseUrl, btgConfigured, credentials, m2mResult, cachedToken, isGeneratingM2M, m2mError, onGenerateM2M, onChange, onClear }: { baseUrl?: string; configured?: boolean; btgBaseUrl?: string; btgConfigured?: boolean; credentials: DataprevCredentialForm; m2mResult?: M2MAuthResult; cachedToken?: { tokenHandle?: string; expiresAt?: string; active?: boolean; expiresInSeconds?: number } | null; isGeneratingM2M?: boolean; m2mError?: string; onGenerateM2M: () => void; onChange: (key: keyof DataprevCredentialForm, value: string) => void; onClear: () => void }) {
  const usingTypedCredentials = Boolean(buildDataprevCredentialsInput(credentials));
  const credentialChecklist = getDataprevCredentialChecklist(credentials);
  const filledCredentials = credentialChecklist.filter(item => item.filled).length;
  const allTypedCredentialsReady = filledCredentials === credentialChecklist.length;
  const tokenStatus = m2mResult ?? cachedToken;
  const tokenActive = Boolean(tokenStatus?.active);
  const tokenExpiresAt = tokenStatus?.expiresAt ? new Date(tokenStatus.expiresAt).toLocaleString("pt-BR") : "não gerado";
  const tokenHandle = tokenStatus?.tokenHandle || "indisponível";
  const secretRows = [
    { key: "DATAPREV_BASE_URL", purpose: "Base da sandbox/API DrumWave-Dataprev usada pelo servidor." },
    { key: "DATAPREV_API_KEY", purpose: "Chave x-api-key enviada em todas as chamadas server-side." },
    { key: "DATAPREV_CLIENT_ID", purpose: "Client ID usado no fluxo OAuth client_credentials técnico." },
    { key: "DATAPREV_CLIENT_SECRET", purpose: "Client secret usado no fluxo OAuth client_credentials técnico." },
    { key: "BTG_BASE_URL", purpose: "Base da API BTG usada nas telas financeiras de saldo, extrato, Pix, cobranças e pagamentos." },
    { key: "BTG_COMPANY_ID", purpose: "Company ID BTG utilizado para montar rotas e escopos empresariais." },
    { key: "BTG_ACCESS_TOKEN", purpose: "Token bearer BTG server-side; nunca é exposto no app emulado." },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-[#1351B4]" />Variáveis e chaves</CardTitle>
        <CardDescription>Informe credenciais Dataprev temporárias para testar chamadas reais sem alterar os Secrets do projeto. Os valores ficam preservados nesta aba do navegador ao mudar entre páginas da jornada. Depois de preencher o conjunto completo, clique em <strong>Gerar M2M token</strong>; o servidor guardará o token bruto apenas até expirar e o usará como header nas demais APIs quando necessário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Credenciais temporárias Dataprev</p>
              <p className="text-sm leading-6 text-slate-600">Para usar credenciais temporárias, preencha obrigatoriamente API URL/Base URL, API ID / x-api-key, Client ID e Secret ID / Client secret como um conjunto completo recebido no 1Password. </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row" style={{ width: "194px", minHeight: "81px" }}>
              <Button type="button" onClick={onGenerateM2M} disabled={isGeneratingM2M || !allTypedCredentialsReady} className="bg-[#1351B4] text-white hover:bg-[#0C326F]">
                {isGeneratingM2M ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                {isGeneratingM2M ? <span className="leading-tight">Gerando<br />token</span> : <span className="leading-tight">Gerar M2M<br />token</span>}
              </Button>
              <Button type="button" variant="outline" onClick={onClear}><Trash2 className="mr-2 h-4 w-4" /><span className="leading-tight">Limpar<br />Dataprev</span></Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataprev-base-url">API URL <span className="font-normal text-slate-500">(Base URL no 1Password)</span></Label>
              <Input id="dataprev-base-url" type="url" value={credentials.baseUrl} onChange={event => onChange("baseUrl", event.target.value)} placeholder={baseUrl || "https://api.sandbox.drumwave.com.br"} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-api-key">API ID / x-api-key</Label>
              <Input id="dataprev-api-key" type="password" value={credentials.apiKey} onChange={event => onChange("apiKey", event.target.value)} placeholder="Cole a API ID / x-api-key" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-client-id">Client ID</Label>
              <Input id="dataprev-client-id" value={credentials.clientId} onChange={event => onChange("clientId", event.target.value)} placeholder="Cole o client_id" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataprev-client-secret">Secret ID / Client secret <span className="font-normal text-slate-500">(Client Secret)</span></Label>
              <Input id="dataprev-client-secret" type="password" value={credentials.clientSecret} onChange={event => onChange("clientSecret", event.target.value)} placeholder="Cole o Secret ID / client_secret" autoComplete="off" />
            </div>
          </div>
          <p className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 text-sm leading-6 text-blue-950"><strong>Como testar:</strong> preencha <strong>API URL</strong>, <strong>API ID / x-api-key</strong>, <strong>Client ID</strong> e <strong>Secret ID / Client secret</strong> como conjunto completo do Postman. Em seguida, clique em <strong>Gerar M2M token</strong>, que agora é a chamada número 2 da ordem recomendada. Sem token ativo, as APIs Dataprev que exigem autenticação ficam bloqueadas. Esses campos permanecem preenchidos ao alternar entre páginas na mesma aba.</p>
          {m2mError ? <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950"><ShieldAlert className="h-4 w-4" /><AlertTitle>Falha ao gerar M2M token</AlertTitle><AlertDescription>{m2mError}</AlertDescription></Alert> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">M2M token</p><p className={tokenActive ? "mt-1 font-semibold text-green-700" : "mt-1 font-semibold text-amber-700"}>{tokenActive ? "ativo" : tokenStatus ? "expirado ou inválido" : "não gerado"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Handle opaco</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{tokenHandle}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Expiração</p><p className="mt-1 font-semibold text-slate-800">{tokenExpiresAt}</p></div>
          </div>
        </div>

        <Alert className={allTypedCredentialsReady ? "border-green-200 bg-green-50 text-green-950" : usingTypedCredentials ? "border-blue-200 bg-blue-50 text-blue-950" : configured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{allTypedCredentialsReady ? "Credenciais do 1Password prontas para homologação" : usingTypedCredentials ? "Complete o conjunto de credenciais do 1Password" : configured ? "Credenciais detectadas no servidor" : "Credenciais pendentes para chamadas reais"}</AlertTitle>
          <AlertDescription>{allTypedCredentialsReady ? "As quatro credenciais temporárias estão preenchidas. Agora gere o M2M token neste bloco antes de executar as APIs Dataprev protegidas. Os segredos continuam fora dos painéis de evidência." : usingTypedCredentials ? "Há campos preenchidos, mas o conjunto só fica seguro e executável quando API URL, API ID / x-api-key, Client ID e Secret ID / Client secret estiverem completos. A aplicação não mistura parcialmente credenciais digitadas com Secrets publicados." : configured ? "A aplicação reconhece variáveis Dataprev no runtime server-side. Para homologar exatamente com o item recebido via 1Password, preencha temporariamente os quatro campos abaixo como conjunto completo e gere o M2M token manualmente." : "Abra o item compartilhado no 1Password e cole API URL/Base URL, x-api-key, Client ID e Client Secret antes de gerar o M2M token e executar chamadas reais."}</AlertDescription>
        </Alert>

        <div className="rounded-3xl border border-[#1351B4]/20 bg-[linear-gradient(135deg,#F7FAFF,#EEF5FF)] p-5" aria-label="Checklist 1Password de credenciais Dataprev">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Checklist do item recebido via 1Password</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Cole os quatro valores do mesmo item compartilhado. O progresso abaixo evita tentar uma API com credencial parcial ou de ambientes diferentes.</p>
            </div>
            <Badge className={allTypedCredentialsReady ? "bg-[#168821] text-white" : "bg-[#FFCD07] text-[#071D41]"}>{filledCredentials} de {credentialChecklist.length} preenchidas</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {credentialChecklist.map(item => (
              <div key={item.key} className={
                "rounded-2xl border p-4 text-sm shadow-sm " + (item.filled ? "border-green-200 bg-white text-green-950" : "border-amber-200 bg-white text-amber-950")
              }>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">No 1Password: {item.onePasswordName}</p>
                  </div>
                  {item.filled ? <Badge className="bg-[#168821] text-white">preenchido</Badge> : <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">pendente</Badge>}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Resumo atual</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Base Dataprev do servidor</span><strong className="break-all text-slate-900">{baseUrl || "não informada"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Base BTG</span><strong className="break-all text-slate-900">{btgBaseUrl || "não informada"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Credenciais BTG</span><strong className={btgConfigured ? "text-green-700" : "text-amber-700"}>{btgConfigured ? "detectadas no servidor" : "pendentes no servidor"}</strong></div>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Entrada Dataprev temporária</span><strong className={usingTypedCredentials ? "text-blue-700" : "text-slate-700"}>{usingTypedCredentials ? "preservada nesta aba" : "não informada"}</strong></div>
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
      </CardContent>
    </Card>
  );
}

export function BtgFutureInfoPanel({ values, serverBaseUrl, serverConfigured, onChange, onClear }: { values: RunState; serverBaseUrl?: string | null; serverConfigured?: boolean; onChange: (key: BtgFutureInfoKey, value: string) => void; onClear: () => void }) {
  const hasTypedInfo = hasBtgFutureInfo(values);
  const tokenPreview = maskSecretPreview(values.btgAccessToken);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><PiggyBank className="h-5 w-5 text-[#168821]" />Informações BTG para testes futuros</CardTitle>
        <CardDescription>Use este formulário para preparar saldo, extrato e pagamentos mesmo antes de receber o token definitivo. Os campos preenchidos entram no estado da sessão e serão usados pelas ações BTG quando você clicar nas telas financeiras.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className={hasTypedInfo ? "border-blue-200 bg-blue-50 text-blue-950" : serverConfigured ? "border-green-200 bg-green-50 text-green-950" : "border-amber-200 bg-amber-50 text-amber-950"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{hasTypedInfo ? "Informações BTG informadas nesta sessão" : serverConfigured ? "BTG detectado no servidor" : "Token BTG ainda não obrigatório"}</AlertTitle>
          <AlertDescription>{hasTypedInfo ? "Ao executar uma ação BTG, a aplicação combina estes campos com os dados seguros do servidor. O token aparece apenas como campo protegido e as evidências retornadas pelo backend são sanitizadas." : serverConfigured ? "Já existem variáveis BTG no runtime. Você ainda pode preencher conta, agência, linha digitável e período para testar casos específicos." : "Você pode preparar Base URL, Company ID, conta e dados de pagamento agora. A execução real ficará pendente até existir um Token Bearer válido do BTG."}</AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          {btgFutureInfoFields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`btg-future-${field.key}`}>{field.label}</Label>
              <Input
                id={`btg-future-${field.key}`}
                type={"type" in field ? field.type : "text"}
                value={String(values[field.key] ?? "")}
                onChange={event => onChange(field.key, event.target.value)}
                placeholder={field.key === "btgBaseUrl" && serverBaseUrl ? serverBaseUrl : field.placeholder}
                autoComplete="off"
              />
              <p className="text-xs leading-5 text-slate-500">Necessário para: {field.requiredFor}{field.sensitive ? `. Prévia atual: ${tokenPreview}.` : "."}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4 text-sm leading-6 text-slate-700"><strong>Saldo:</strong> requer Base URL, Company ID, Token Bearer e Conta BTG.</div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4 text-sm leading-6 text-slate-700"><strong>Extrato:</strong> usa os mesmos dados de saldo, além de data inicial e final.</div>
          <div className="rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4 text-sm leading-6 text-slate-700"><strong>Pagamentos:</strong> exige token, linha digitável, valor, data, agência e conta de débito.</div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950 md:flex-row md:items-center md:justify-between">
          <p><strong>Segurança:</strong> prefira configurar o token definitivo como Secret do projeto quando estiver disponível. Este formulário existe para testes locais e evidências continuam com autorização e tokens mascarados.</p>
          <Button type="button" variant="outline" onClick={onClear} className="shrink-0 bg-white"><Trash2 className="mr-2 h-4 w-4" />Limpar BTG</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function compactRunState(mergedState: RunState): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(mergedState).filter(([, value]) => value !== undefined)) as Record<string, string | number | boolean | null>;
}

const WALLET_RUN_STORAGE_VERSION = 1;

type PersistedWalletRun = {
  version: number;
  state: RunState;
  evidences: Record<string, Evidence>;
  credentialFolder: CredentialFolderItem[];
  m2mResult?: M2MAuthResult;
  reviewedGuideSteps: Record<string, boolean>;
};

function getWalletRunStorageKey(kind: WalletKind) {
  return `govbr-wallet-run-state-v${WALLET_RUN_STORAGE_VERSION}-${kind}`;
}

function emptyPersistedWalletRun(): PersistedWalletRun {
  return {
    version: WALLET_RUN_STORAGE_VERSION,
    state: {},
    evidences: {},
    credentialFolder: [],
    reviewedGuideSteps: {},
  };
}

function readPersistedWalletRun(kind: WalletKind): PersistedWalletRun {
  if (typeof window === "undefined") return emptyPersistedWalletRun();

  try {
    const raw = window.localStorage.getItem(getWalletRunStorageKey(kind));
    if (!raw) return emptyPersistedWalletRun();
    const parsed = JSON.parse(raw) as Partial<PersistedWalletRun>;
    if (parsed.version !== WALLET_RUN_STORAGE_VERSION) return emptyPersistedWalletRun();

    return {
      version: WALLET_RUN_STORAGE_VERSION,
      state: parsed.state && typeof parsed.state === "object" ? parsed.state : {},
      evidences: parsed.evidences && typeof parsed.evidences === "object" ? parsed.evidences : {},
      credentialFolder: Array.isArray(parsed.credentialFolder) ? parsed.credentialFolder : [],
      m2mResult: parsed.m2mResult,
      reviewedGuideSteps: parsed.reviewedGuideSteps && typeof parsed.reviewedGuideSteps === "object" ? parsed.reviewedGuideSteps : {},
    };
  } catch {
    return emptyPersistedWalletRun();
  }
}

function persistWalletRun(kind: WalletKind, snapshot: PersistedWalletRun) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getWalletRunStorageKey(kind), JSON.stringify({ ...snapshot, version: WALLET_RUN_STORAGE_VERSION }));
}

function clearPersistedWalletRun(kind: WalletKind) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getWalletRunStorageKey(kind));
}

export function clearCredentialResultState(previous: RunState, credentialItems: CredentialFolderItem[] = [], evidenceMap: Record<string, Evidence> = {}): RunState {
  const resultKeys = new Set<string>(["m2mTokenHandle", "m2mExpiresAt", "m2mActive"]);
  credentialItems.forEach(item => resultKeys.add(item.key));
  Object.values(evidenceMap).forEach(evidence => {
    Object.keys(evidence.stateUpdates || {}).forEach(key => resultKeys.add(key));
  });

  if (!resultKeys.size) return previous;

  const next = { ...previous };
  resultKeys.forEach(key => delete next[key]);
  return next;
}

export function buildExecuteActionInput(actionId: string, mergedState: RunState, credentials?: DataprevCredentialForm) {
  return { actionId, state: compactRunState(mergedState), credentials: buildDataprevCredentialsInput(credentials || { baseUrl: "", apiKey: "", clientId: "", clientSecret: "" }) };
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
  const requestedTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const initialTab = requestedTab === "variaveis" || requestedTab === "credenciais" ? "variaveis" : "tela";
  const persistedRun = useMemo(() => readPersistedWalletRun(kind), [kind]);
  const [activeId, setActiveId] = useState(screens[0]?.id ?? "entrada");
  const [state, setState] = useState<RunState>(() => persistedRun.state);
  const [evidences, setEvidences] = useState<Record<string, Evidence>>(() => persistedRun.evidences);
  const [m2mResult, setM2mResult] = useState<M2MAuthResult | undefined>(() => {
    if (persistedRun.m2mResult) return persistedRun.m2mResult;
    const persisted = readPersistedM2MTokenStatus();
    if (!persisted) return undefined;
    return {
      status: "executed",
      ok: true,
      method: "POST",
      url: "Token M2M preservado nesta sessão até a expiração",
      tokenHandle: persisted.tokenHandle,
      expiresAt: persisted.expiresAt,
      expiresInSeconds: persisted.expiresInSeconds,
      active: true,
      message: "Token M2M válido preservado nesta sessão; ele será reutilizado pelo servidor como Authorization Bearer nas APIs que exigirem autenticação técnica enquanto não expirar.",
      executedAt: persisted.savedAt,
    };
  });
  const [runningId, setRunningId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewedGuideSteps, setReviewedGuideSteps] = useState<Record<string, boolean>>(() => persistedRun.reviewedGuideSteps);
  const [dataprevCredentials, setDataprevCredentials] = useState<DataprevCredentialForm>(() => readPersistedDataprevCredentials());
  const [credentialFolder, setCredentialFolder] = useState<CredentialFolderItem[]>(() => persistedRun.credentialFolder);
  const active = screens.find(screen => screen.id === activeId) ?? screens[0];
  const activeIndex = screens.findIndex(screen => screen.id === active.id);
  const nextScreen = activeIndex >= 0 ? screens[activeIndex + 1] : undefined;
  const activeEvidence = active.actionId ? evidences[active.actionId] : undefined;
  const activeStatus = getVisualStatus(active, activeEvidence, runningId);
  const mergedState = useMemo(() => ({ ...(metadata.data?.initialState || {}), ...(btgMetadata.data?.initialState || {}), ...state }), [btgMetadata.data?.initialState, metadata.data?.initialState, state]);
  const completed = screens.filter(screen => screen.actionId && evidences[screen.actionId]?.ok).length;
  const callable = screens.filter(screen => screen.actionId).length;

  useEffect(() => {
    persistWalletRun(kind, {
      version: WALLET_RUN_STORAGE_VERSION,
      state,
      evidences,
      credentialFolder,
      m2mResult,
      reviewedGuideSteps,
    });
  }, [kind, state, evidences, credentialFolder, m2mResult, reviewedGuideSteps]);

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

  const toggleGuideStepReview = (stepId: string, checked: boolean) => {
    setReviewedGuideSteps(previous => ({ ...previous, [stepId]: checked }));
  };

  const updateDataprevCredential = (key: keyof DataprevCredentialForm, value: string) => {
    setDataprevCredentials(previous => {
      const next = normalizeDataprevCredentials({ ...previous, [key]: value });
      persistDataprevCredentials(next);
      clearPersistedM2MTokenStatus();
      setM2mResult(undefined);
      return next;
    });
  };

  const clearDataprevCredentials = () => {
    clearPersistedDataprevCredentials();
    clearPersistedM2MTokenStatus();
    setDataprevCredentials({ ...EMPTY_DATAPREV_CREDENTIALS });
    setM2mResult(undefined);
    setState(previous => {
      const next = { ...previous };
      delete next.m2mTokenHandle;
      delete next.m2mExpiresAt;
      delete next.m2mActive;
      return next;
    });
  };

  const updateBtgFutureInfo = (key: BtgFutureInfoKey, value: string) => {
    updateField(key, value);
  };

  const clearApiReturnFields = () => {
    setState(previous => clearCredentialResultState(previous, credentialFolder, evidences));
    setEvidences({});
    setM2mResult(undefined);
    clearPersistedM2MTokenStatus();
    setCredentialFolder([]);
    clearPersistedWalletRun(kind);
    setRunningId(undefined);
    setErrors(previous => {
      const next = { ...previous };
      delete next.m2m;
      screens.forEach(screen => delete next[screen.id]);
      return next;
    });
  };

  const clearBtgFutureInfo = () => {
    setState(previous => {
      const next = { ...previous };
      btgFutureInfoFields.forEach(field => delete next[field.key]);
      return next;
    });
    setErrors(previous => {
      const next = { ...previous };
      btgFutureInfoFields.forEach(field => delete next[field.key]);
      delete next[active.id];
      return next;
    });
    clearApiReturnFields();
  };

  const runM2MAuthentication = async (forceRefresh = false): Promise<M2MAuthResult | undefined> => {
    if (!forceRefresh && isM2MAuthResultActive(m2mResult)) return m2mResult;

    setErrors(previous => {
      const next = { ...previous };
      delete next.m2m;
      return next;
    });

    const missingCredentials = getMissingM2MCredentialLabels(dataprevCredentials);
    if (missingCredentials.length > 0) {
      const message = `Antes de executar APIs Dataprev com credenciais temporárias, preencha na aba Variáveis os campos obrigatórios: ${missingCredentials.join(", ")}. A chamada não foi realizada porque esses dados são essenciais para gerar a autenticação técnica.`;
      setM2mResult(undefined);
      clearPersistedM2MTokenStatus();
      setErrors(previous => ({ ...previous, m2m: message }));
      return undefined;
    }

    try {
      const result = await authenticateM2M.mutateAsync({ credentials: buildDataprevCredentialsInput(dataprevCredentials) });
      const typed = result as M2MAuthResult;
      setM2mResult(typed);
      if (typed.ok) {
        persistM2MTokenStatus(typed);
        setCredentialFolder(previous => mergeCredentialFolder(previous, createCredentialFolderItems("Passo 0 — token M2M gerado manualmente", { m2mTokenHandle: typed.tokenHandle, m2mExpiresAt: typed.expiresAt, m2mActive: typed.active })));
      }
      if (!typed.ok) {
        clearPersistedM2MTokenStatus();
        setErrors(previous => ({ ...previous, m2m: typed.message }));
      }
      await metadata.refetch();
      return typed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha inesperada ao executar a autenticação técnica.";
      clearPersistedM2MTokenStatus();
      setErrors(previous => ({ ...previous, m2m: message }));
      return undefined;
    }
  };

  const run = async () => {
    if (!active.actionId) {
      setErrors(previous => ({ ...previous, [active.id]: "Esta tela foi mapeada como experiência visual; não há API externa associada." }));
      return;
    }
    const missingApiCredentials = getMissingM2MCredentialLabels(dataprevCredentials);
    if (missingApiCredentials.length > 0) {
      const message = buildRequiredApiCredentialsMessage(missingApiCredentials);
      setErrors(previous => ({ ...previous, [active.id]: message }));
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
      if (!active.actionId.startsWith("btg_") && !isM2MAuthResultActive(m2mResult)) {
        clearPersistedM2MTokenStatus();
        setM2mResult(undefined);
        setErrors(previous => ({ ...previous, [active.id]: "Gere um token M2M válido na aba Variáveis antes de executar esta API. O botão Gerar M2M token é a chamada número 2 da ordem recomendada e o token será usado como Authorization Bearer enquanto não expirar." }));
        return;
      }

      const actionIdToRun = active.id === "decisao-solicitacao" && String(mergedState.dataRequestDecision || "accepted") === "rejected" ? "step7_reject_data_request" : active.actionId;
      const evidence = actionIdToRun.startsWith("btg_")
        ? await executeBtgAction.mutateAsync(buildExecuteActionInput(actionIdToRun, mergedState))
        : await executeAction.mutateAsync(buildExecuteActionInput(actionIdToRun, mergedState, dataprevCredentials));
      const typed = evidence as Evidence;
      setEvidences(previous => ({ ...previous, [active.actionId as string]: typed }));
      setState(previous => compactRunState({ ...previous, ...(typed.stateUpdates || {}) }));
      setCredentialFolder(previous => mergeCredentialFolder(previous, createCredentialFolderItems(typed.actionTitle || active.title, typed.stateUpdates)));
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
        <div className="container flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1351B4] text-white"><Landmark className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="max-w-full break-words text-[11px] font-bold uppercase leading-5 tracking-[0.16em] text-[#1351B4] sm:text-xs sm:tracking-[0.22em]">gov.br · carteira digital de dados</p>
              <h1 className="max-w-full whitespace-normal break-words text-xl font-bold leading-tight sm:text-2xl">{isPersonal ? "Personal dWallet GovBR" : "Business dWallet GovBR"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/"><Button variant="outline" className="h-auto min-h-10 whitespace-normal text-left leading-5 gap-2"><ArrowLeft className="h-4 w-4 shrink-0" />Jornada integrada</Button></Link>
            <Link href={isPersonal ? "/business-govbr" : "/personal-govbr"}><Button className="h-auto min-h-10 whitespace-normal text-left leading-5 bg-[#1351B4] hover:bg-[#0C326F]">Abrir {isPersonal ? "Business" : "Personal"}</Button></Link>
          </div>
        </div>
      </header>

      <section className={isPersonal ? "govbr-hero-personal" : "govbr-hero-business"}>
        <div className="container grid gap-8 py-10 text-white lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-4">
            <Badge className="bg-[#FFCD07] text-[#071D41]">Protótipo para teste de APIs</Badge>
            <h2 className="max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">{isPersonal ? "Carteira cidadã para controlar, autorizar e monetizar dados." : "Business dWallet®"}</h2>
            <p className="max-w-3xl text-base leading-7 text-blue-50">Este front-end reproduz a navegação pública, onboarding e telas internas mapeadas das dWallets® DrumWave, redesenhadas com hierarquia visual, cores, foco acessível e linguagem institucional do governo brasileiro.</p>
          </div>
          <Card className="border-white/20 bg-white/10 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />APIs e evidências</CardTitle>
              <CardDescription className="text-blue-50">{completed} de {callable} telas com chamadas OK nesta sessão local. APIs Dataprev protegidas usam o M2M token gerado na aba Variáveis enquanto ele estiver ativo. As respostas ficam preservadas ao alternar entre Home, PdW e BdW até a limpeza explícita.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-blue-50">
              <Button type="button" variant="outline" onClick={clearApiReturnFields} className="justify-center border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Trash2 className="mr-2 h-4 w-4" />Limpar variáveis de resposta do teste
              </Button>
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
                    const screenOrderIndex = screens.findIndex(item => item.id === screen.id);
                    const blockedByPrevious = screenOrderIndex > 0 && screens.slice(0, screenOrderIndex).some(previous => previous.actionId && !evidences[previous.actionId]?.ok && !reviewedGuideSteps[previous.id]);
                    return (
                      <button key={screen.id} disabled={blockedByPrevious} title={blockedByPrevious ? "Conclua ou revise manualmente as etapas anteriores no Guia de teste" : undefined} onClick={() => setActiveId(screen.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-55 ${selected ? "bg-[#1351B4] text-white" : blockedByPrevious ? "bg-amber-50 text-amber-900" : "text-slate-700 hover:bg-slate-100"}`}>
                        <span className="flex min-w-0 items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0" /><span className="whitespace-normal break-words leading-5">{screen.title}</span></span>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase opacity-80">{blockedByPrevious ? "pré-req." : statusLabel[visualStatus]}{evidence?.ok ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : blockedByPrevious ? <LockKeyhole className="h-3 w-3 opacity-70" /> : screen.actionId ? <Play className="h-3 w-3 opacity-70" /> : <LockKeyhole className="h-3 w-3 opacity-60" />}</span>
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
          <Tabs defaultValue={initialTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-4 bg-white">
              <TabsTrigger value="tela" className="h-auto min-h-10 whitespace-normal px-2 py-2 text-center leading-5">Tela atual</TabsTrigger>
              <TabsTrigger value="guia" className="h-auto min-h-10 whitespace-normal px-2 py-2 text-center leading-5">Guia de teste</TabsTrigger>
              <TabsTrigger value="teste" className="h-auto min-h-10 whitespace-normal px-2 py-2 text-center leading-5">Inputs de teste</TabsTrigger>
              <TabsTrigger value="variaveis" className="h-auto min-h-10 whitespace-normal px-2 py-2 text-center leading-5">Variáveis</TabsTrigger>
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
                  <ScreenApiInstructionPanel screen={active} stepNumber={activeIndex + 1} totalSteps={screens.length} status={activeStatus} m2mReady={Boolean(m2mResult?.ok || metadata.data?.m2mToken?.active)} evidence={activeEvidence} />
                  <AppEmulatedScreen screen={active} nextScreen={nextScreen} values={mergedState} evidence={activeEvidence} status={activeStatus} onChange={updateField} onRun={run} onOpenNextScreen={() => nextScreen ? setActiveId(nextScreen.id) : undefined} isRunning={runningId === active.actionId} errors={errors} />
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
                    <strong>Como testar no telefone:</strong> edite os campos diretamente dentro do mockup, pressione o botão principal do próprio aplicativo para disparar a API e, se a resposta for OK, a tela do telefone avançará para a próxima etapa real da jornada.
                  </div>
                  <Button type="button" variant="outline" onClick={clearApiReturnFields} className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                    <Trash2 className="mr-2 h-4 w-4" />Limpar variáveis de resposta do teste
                  </Button>
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
            <TabsContent value="guia">
              <BeginnerTestGuide walletKind={kind} screens={screens} evidences={evidences} runningId={runningId} m2mCompleted={Boolean(m2mResult?.ok || metadata.data?.m2mToken?.active)} reviewedSteps={reviewedGuideSteps} onToggleReviewed={toggleGuideStepReview} onOpenStep={setActiveId} />
            </TabsContent>
            <TabsContent value="teste">
              <TestVariablesPanel variables={testVariables} values={mergedState} onChange={updateField} onReset={resetTestVariables} />
            </TabsContent>
            <TabsContent value="variaveis" className="space-y-6">
              <CredentialsPanel baseUrl={metadata.data?.baseUrl} configured={metadata.data?.credentialsConfigured} btgBaseUrl={btgMetadata.data?.baseUrl || undefined} btgConfigured={btgMetadata.data?.credentialsConfigured} credentials={dataprevCredentials} m2mResult={m2mResult} cachedToken={metadata.data?.m2mToken} isGeneratingM2M={authenticateM2M.isPending} m2mError={errors.m2m} onGenerateM2M={() => void runM2MAuthentication(true)} onChange={updateDataprevCredential} onClear={clearDataprevCredentials} />
              <CredentialFolderPanel items={credentialFolder} values={mergedState} onClear={clearApiReturnFields} />
              <BtgFutureInfoPanel values={mergedState} serverBaseUrl={btgMetadata.data?.baseUrl || undefined} serverConfigured={btgMetadata.data?.credentialsConfigured} onChange={updateBtgFutureInfo} onClear={clearBtgFutureInfo} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
