/**
 * Progresso do onboarding do cliente que adquiriu o SaaS.
 * Cada passo mapeia o critério de aceite do MVP — sem Postman, Baserow, n8n, SSH ou VPS.
 */
import { prisma } from "@/lib/prisma";

export type OnboardingStepId =
  | "account"
  | "organization"
  | "meta"
  | "phone"
  | "contacts"
  | "list"
  | "templates"
  | "campaign"
  | "send"
  | "metrics";

export type OnboardingStep = {
  id: OnboardingStepId;
  order: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  optional?: boolean;
};

export type OnboardingProgress = {
  organizationId: string;
  completed: number;
  total: number;
  percent: number;
  next: OnboardingStep | null;
  steps: OnboardingStep[];
  readyForCampaigns: boolean;
};

export async function getOnboardingProgress(organizationId: string): Promise<OnboardingProgress> {
  const [
    org,
    meta,
    phonesConnected,
    contacts,
    lists,
    templatesApproved,
    campaigns,
    sentMessages,
    webhookEvents,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.metaConnection.findUnique({ where: { organizationId } }),
    prisma.phoneNumber.count({ where: { organizationId, status: "CONNECTED" } }),
    prisma.contact.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.contactList.count({ where: { organizationId } }),
    prisma.messageTemplate.count({ where: { organizationId, status: "APPROVED" } }),
    prisma.waCampaign.count({ where: { organizationId } }),
    prisma.waMessage.count({
      where: { organizationId, direction: "OUTBOUND", status: { in: ["SENT", "DELIVERED", "READ"] } },
    }),
    prisma.webhookEvent.count({
      where: { organizationId, status: "PROCESSED" },
    }),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "account",
      order: 1,
      title: "Criar sua conta",
      description: "Acesso seguro à plataforma. Você já concluiu este passo ao entrar.",
      href: "/settings",
      cta: "Ver perfil",
      done: true,
    },
    {
      id: "organization",
      order: 2,
      title: "Criar sua empresa",
      description: "Workspace isolado com dados, equipe e faturamento próprios.",
      href: "/onboarding",
      cta: "Configurar empresa",
      done: Boolean(org),
    },
    {
      id: "meta",
      order: 3,
      title: "Conectar a Meta",
      description:
        "Autorize sua empresa Meta pelo fluxo guiado. Tokens e IDs são capturados automaticamente — sem copiar WABA ID ou Phone Number ID.",
      href: "/settings/meta",
      cta: "Conectar Meta",
      done: meta?.status === "CONNECTED",
    },
    {
      id: "phone",
      order: 4,
      title: "Conectar número do WhatsApp",
      description: "Selecione ou cadastre o número Business. O painel mostra qualidade e limite informados pela Meta.",
      href: "/settings/meta",
      cta: "Configurar número",
      done: phonesConnected > 0,
    },
    {
      id: "contacts",
      order: 5,
      title: "Importar contatos autorizados",
      description:
        "CSV ou XLSX com confirmação de consentimento. Apenas listas próprias ou legitimamente obtidas.",
      href: "/contacts/import",
      cta: "Importar contatos",
      done: contacts > 0,
    },
    {
      id: "list",
      order: 6,
      title: "Criar lista ou segmento",
      description: "Agrupe contatos por tags, origem ou última interação para usar nas campanhas.",
      href: "/lists",
      cta: "Criar lista",
      done: lists > 0,
    },
    {
      id: "templates",
      order: 7,
      title: "Sincronizar ou criar template",
      description:
        "Puxe templates aprovados da Meta ou envie um novo para análise. Categorias: Marketing, Utilidade e Autenticação.",
      href: "/templates",
      cta: "Ver templates",
      done: templatesApproved > 0,
    },
    {
      id: "campaign",
      order: 8,
      title: "Criar campanha",
      description: "Wizard: nome → número → público → template → variáveis → horário → revisão.",
      href: "/campaigns/new",
      cta: "Nova campanha",
      done: campaigns > 0,
    },
    {
      id: "send",
      order: 9,
      title: "Enviar e receber status",
      description:
        "A fila processa os envios. Status de enviado, entregue, lido e falha chegam pelo webhook automaticamente.",
      href: "/campaigns",
      cta: "Ver campanhas",
      done: sentMessages > 0 || webhookEvents > 0,
    },
    {
      id: "metrics",
      order: 10,
      title: "Acompanhar resultados",
      description: "Dashboard com enviadas, entregues, lidas, respostas, falhas e opt-outs.",
      href: "/analytics",
      cta: "Abrir visão geral",
      done: sentMessages > 0,
      optional: false,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const next = steps.find((s) => !s.done) ?? null;

  return {
    organizationId,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    next,
    steps,
    readyForCampaigns:
      meta?.status === "CONNECTED" && phonesConnected > 0 && contacts > 0 && templatesApproved > 0,
  };
}
