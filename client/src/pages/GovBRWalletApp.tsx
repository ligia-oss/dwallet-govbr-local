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
  actionId: string;
  actionTitle: string;
  status: "executed" | "not_executable" | "failed";
  ok: boolean;
  httpStatus?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  stateUpdates?: RunState;
  message?: string;
  missingReason?: string;
  executedAt: string;
};

type ScreenField = { key: string; label: string; placeholder: string; type?: string; required?: boolean };

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
  { key: "personAddressLine", label: "Endereço", section: "Endereço da pessoa", placeholder: "Rua Cidadã 456", description: "Campo mantido para emulação visual; a sandbox aceita apenas UF no objeto address do cadastro Personal." },
  { key: "personCity", label: "Cidade", section: "Endereço da pessoa", placeholder: "São Paulo", description: "Campo mantido para emulação visual; não é enviado ao cadastro Personal da sandbox atual." },
  { key: "personState", label: "UF", section: "Endereço da pessoa", placeholder: "SP", description: "Único campo de endereço aceito e enviado no cadastro Personal da sandbox atual." },
  { key: "personZip", label: "CEP", section: "Endereço da pessoa", placeholder: "01310-200", description: "Campo mantido para emulação visual; não é enviado ao cadastro Personal da sandbox atual." },
  { key: "businessId", label: "Business ID", section: "Identificadores da jornada", placeholder: "Gerado pela Business dWallet", description: "Necessário para solicitação de dados Personal." },
  { key: "commercialDspId", label: "DSP comercial", section: "Identificadores da jornada", placeholder: "Gerado pela consulta de DSPs", description: "Usado para criar conta DSP quando retornado pela API." },
  { key: "offerId", label: "Offer ID", section: "Identificadores da jornada", placeholder: "Gerado pela listagem de ofertas", description: "Usado no aceite de oferta quando disponível." },
  { key: "dspAccountId", label: "Conta DSP", section: "Identificadores da jornada", placeholder: "Conta DSP conhecida", description: "Apoia telas financeiras e extrato parcial." },
];

const businessTestVariables: TestVariable[] = [
  { key: "employeeFirstName", label: "Nome do colaborador", section: "Colaborador", placeholder: "Maria", description: "Usado no payload de criação do colaborador Business." },
  { key: "employeeLastName", label: "Sobrenome do colaborador", section: "Colaborador", placeholder: "Silva", description: "Usado no payload de criação do colaborador Business." },
  { key: "employeeEmail", label: "E-mail corporativo", section: "Colaborador", placeholder: "colaborador@example.com", type: "email", description: "Identificador de cadastro, envio de código e login Business." },
  { key: "employeePhone", label: "Telefone do colaborador", section: "Colaborador", placeholder: "+5511999990001", type: "tel", description: "Telefone enviado no cadastro do colaborador." },
  { key: "employeePassword", label: "Senha de teste", section: "Colaborador", placeholder: "SecurePass123!", type: "password", sensitive: true, description: "Senha enviada ao cadastro/login; é redigida nas evidências." },
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
];

const personalScreens: GovScreen[] = [
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
    primaryCta: "Criar conta gov.br de dados",
    fields: [{ key: "personEmail", label: "E-mail", placeholder: "cidadao@example.com", type: "email", required: true }],
    observedFrom: "br.personal.drumwave.me/enter-name, /enter-info e /password",
    blocks: ["Nome e sobrenome", "E-mail e UF", "Senha e aceite de termos", "Verificação por código de e-mail"],
  },
  {
    id: "verificacao-email",
    route: "/email-verification",
    title: "Verificação de e-mail",
    subtitle: "Tela com seis campos de OTP, mensagem de confirmação e reenvio de código.",
    group: "onboarding",
    icon: MailCheck,
    apiLabel: "Ação manual",
    apiHint: "A confirmação de OTP depende da caixa postal do usuário no app homologado.",
    primaryCta: "Validar código recebido",
    fields: [{ key: "otp", label: "Código de verificação", placeholder: "000000", required: true }],
    observedFrom: "br.personal.drumwave.me/email-verification",
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
    id: "extrato",
    route: "/statement",
    title: "Extrato e resgate",
    subtitle: "Histórico financeiro, saldo, conta DSP, resgates e informações de PIX/conta bancária.",
    group: "financeiro",
    icon: ReceiptText,
    actionId: "step14_wallet_statement",
    apiLabel: "Extrato parcial",
    apiHint: "Consulta extrato quando há conta DSP conhecida; resgate e PIX são lacunas/internos.",
    primaryCta: "Consultar extrato",
    fields: [{ key: "dspAccountId", label: "Conta DSP", placeholder: "Conta DSP conhecida", required: true }],
    observedFrom: "Jornada de 17 passos e telas financeiras inferidas",
    blocks: ["Saldo disponível", "Transações", "Solicitar resgate", "Chave PIX/conta bancária"],
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

const businessScreens: GovScreen[] = [
  {
    id: "entrada",
    route: "/",
    title: "Entrada da Business dWallet",
    subtitle: "Landing e acesso corporativo para colaborador responsável pela carteira empresarial.",
    group: "acesso",
    icon: Building2,
    actionId: "step1_employee_signup",
    apiLabel: "Cadastro de colaborador",
    apiHint: "Cria colaborador Business com e-mail corporativo.",
    primaryCta: "Criar acesso empresarial",
    fields: [{ key: "employeeEmail", label: "E-mail corporativo", placeholder: "colaborador@example.com", type: "email", required: true }],
    observedFrom: "br.business.drumwave.me/enter-name, /enter-email e /password",
    blocks: ["Nome e sobrenome", "E-mail corporativo", "Senha e aceite", "Verificação por e-mail"],
  },
  {
    id: "email",
    route: "/email-verification",
    title: "Verificação de e-mail corporativo",
    subtitle: "Confirmação OTP antes de liberar o onboarding de empresa.",
    group: "onboarding",
    icon: MailCheck,
    apiLabel: "Ação manual",
    apiHint: "O OTP é entregue por e-mail; reproduzido visualmente no front-end GovBR.",
    primaryCta: "Confirmar e-mail",
    fields: [{ key: "businessOtp", label: "Código de verificação", placeholder: "000000", required: true }],
    observedFrom: "br.business.drumwave.me/email-verification",
    blocks: ["Seis campos de código", "Mensagem de envio", "Reenvio", "Continuar"],
  },
  {
    id: "empresa",
    route: "/enter-business-information",
    title: "Informações da empresa",
    subtitle: "Formulário interno com dados empresariais, responsável, telefone, website e cargo.",
    group: "onboarding",
    icon: FileCheck2,
    actionId: "step1_business_create",
    apiLabel: "Criar empresa",
    apiHint: "Registra a entidade Business que receberá solicitações de dados.",
    primaryCta: "Salvar empresa",
    fields: [{ key: "businessCnpj", label: "CNPJ", placeholder: "00000000000100", required: true }],
    observedFrom: "br.business.drumwave.me/enter-business-information",
    blocks: ["Nome empresarial", "CNPJ", "Website", "Telefone", "Cargo do usuário"],
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
    actionId: "step14_wallet_statement",
    apiLabel: "Extrato parcial",
    apiHint: "Usa extrato como evidência financeira enquanto checkout completo depende de endpoints futuros.",
    primaryCta: "Consultar operação",
    fields: [{ key: "dspAccountId", label: "Conta DSP", placeholder: "Conta DSP conhecida", required: true }],
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

export function CredentialsPanel({ baseUrl, configured }: { baseUrl?: string; configured?: boolean }) {
  const secretRows = [
    { key: "DATAPREV_BASE_URL", purpose: "Base da sandbox/API DrumWave-Dataprev usada pelo servidor." },
    { key: "DATAPREV_API_KEY", purpose: "Chave x-api-key enviada em todas as chamadas server-side." },
    { key: "DATAPREV_CLIENT_ID", purpose: "Client ID usado no passo zero OAuth client_credentials." },
    { key: "DATAPREV_CLIENT_SECRET", purpose: "Client secret usado no passo zero OAuth client_credentials." },
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
          <AlertDescription>{configured ? "A aplicação reconhece as variáveis necessárias no runtime server-side. Se ocorrer 401/403, atualize os valores publicados no painel seguro de Secrets e publique novo checkpoint." : "Configure as variáveis DATAPREV_* no painel seguro de Secrets antes de executar chamadas reais."}</AlertDescription>
        </Alert>
        <div className="rounded-3xl border border-slate-200 bg-[#F8F8F8] p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-[#1351B4]">Resumo atual</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm"><span className="block text-slate-500">Base configurada</span><strong className="break-all text-slate-900">{baseUrl || "não informada"}</strong></div>
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
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <strong>Como alterar com segurança:</strong> abra o painel de gerenciamento do projeto, entre em <strong>Settings → Secrets</strong>, atualize as variáveis acima, salve, gere/publice um novo checkpoint e execute novamente o teste de token M2M. A aplicação nunca deve receber client_secret ou API key em campos comuns de formulário.
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
  const executeAction = trpc.dataprev.executeAction.useMutation();
  const [activeId, setActiveId] = useState(screens[0]?.id ?? "entrada");
  const [state, setState] = useState<RunState>({});
  const [evidences, setEvidences] = useState<Record<string, Evidence>>({});
  const [runningId, setRunningId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const active = screens.find(screen => screen.id === activeId) ?? screens[0];
  const activeEvidence = active.actionId ? evidences[active.actionId] : undefined;
  const activeStatus = getVisualStatus(active, activeEvidence, runningId);
  const mergedState = useMemo(() => ({ ...(metadata.data?.initialState || {}), ...state }), [metadata.data?.initialState, state]);
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
      const evidence = await executeAction.mutateAsync(buildExecuteActionInput(active.actionId, mergedState));
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
              <CardDescription className="text-blue-50">{completed} de {callable} telas com chamadas OK nesta sessão local.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-blue-50">
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Base sandbox</span><span className="font-mono text-xs">{metadata.data?.baseUrl || "carregando"}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Credenciais</span><span>somente servidor</span></div>
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
              <CredentialsPanel baseUrl={metadata.data?.baseUrl} configured={metadata.data?.credentialsConfigured} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
