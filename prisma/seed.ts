import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { assertDevSeedAllowed } from "../src/lib/seed-guard";

const prisma = new PrismaClient();
const password = "Brisa@2026";

async function main() {
  assertDevSeedAllowed();
  await prisma.commercialDecision.deleteMany();
  await prisma.complexityEscalation.deleteMany();
  await prisma.offerPresentation.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.requiredFieldDefinition.deleteMany();
  await prisma.aIExecution.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.saleEvent.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.preSale.deleteMany();
  await prisma.objection.deleteMany();
  await prisma.viabilityCheck.deleteMany();
  await prisma.commercialAcceptance.deleteMany();
  await prisma.customerFact.deleteMany();
  await prisma.conversationMemory.deleteMany();
  await prisma.salesStageHistory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.humanHandoff.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.leadStatusHistory.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.offerBook.deleteMany();
  await prisma.knowledgeVersion.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.objectionPlaybook.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.domainEvent.deleteMany();
  await prisma.promptVersion.deleteMany();
  await prisma.prompt.deleteMany();

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: { slug: "default", name: "Operação padrão" },
  });

  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email: "ursula.b@example.com" },
    update: {},
    create: { name: "Admin Brisa", email: "ursula.b@example.com", passwordHash: hash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "rachel.c@example.org" },
    update: {},
    create: { name: "Supervisor Comercial", email: "rachel.c@example.org", passwordHash: hash, role: "SUPERVISOR" },
  });
  const operador = await prisma.user.upsert({
    where: { email: "zoe.m@example.net" },
    update: {},
    create: { name: "Operador Lançamento", email: "zoe.m@example.net", passwordHash: hash, role: "OPERADOR" },
  });
  await prisma.user.upsert({
    where: { email: "tina.r@example.net" },
    update: {},
    create: { name: "Operadora Inbox", email: "tina.r@example.net", passwordHash: hash, role: "OPERADOR" },
  });
  await prisma.user.upsert({
    where: { email: "samuel.w@example.com" },
    update: {},
    create: { name: "Analista de Performance", email: "samuel.w@example.com", passwordHash: hash, role: "ANALISTA" },
  });

  const meta = await prisma.campaign.upsert({
    where: { id: "seed-campaign-meta" },
    update: {},
    create: {
      id: "seed-campaign-meta",
      name: "Meta Ads — Fibra Caucaia Ago/26",
      channel: "META",
      spendCents: 850000,
      startedAt: new Date("2026-08-01"),
    },
  });
  const google = await prisma.campaign.upsert({
    where: { id: "seed-campaign-google" },
    update: {},
    create: {
      id: "seed-campaign-google",
      name: "Google Ads — Fibra Fortaleza",
      channel: "GOOGLE",
      spendCents: 620000,
      startedAt: new Date("2026-08-01"),
    },
  });

  const book = await prisma.offerBook.create({
    data: {
      originalName: "book-ofertas-agosto-2026.csv",
      mimeType: "text/csv",
      storagePath: "seed://book-agosto",
      extractedText: "seed",
      month: "2026-08",
      importedById: admin.id,
    },
  });

  const offer500 = await prisma.offer.create({
    data: {
      name: "Fibra 500 Mega Residencial",
      category: "Internet fixa",
      product: "Fibra",
      speedMbps: 500,
      priceCents: 11990,
      promotionalPriceCents: 9990,
      futurePriceCents: 11990,
      promotionalPeriod: "3 primeiros meses",
      benefits: ["Wi-Fi 6", "Instalação inclusa", "Suporte 24h"],
      loyalty: "12 meses",
      installation: "Agendamento em até 7 dias úteis após cadastro",
      city: "Caucaia",
      region: "Ceará",
      eligibility: "Residencial em área com viabilidade",
      rules: "Preço promocional válido por 3 meses. Sem desconto adicional não cadastrado.",
      restrictions: "Sujeito a viabilidade técnica.",
      startsAt: new Date("2026-08-01"),
      endsAt: new Date("2026-12-31"),
      source: "seed",
      bookId: book.id,
      originalText: "Fibra 500 Mega Caucaia R$99,90 / 3 meses depois R$119,90",
      status: "APROVADA",
    },
  });
  await prisma.offer.create({
    data: {
      name: "Fibra 700 Mega Residencial",
      category: "Internet fixa",
      product: "Fibra",
      speedMbps: 700,
      priceCents: 13990,
      promotionalPriceCents: 11990,
      futurePriceCents: 13990,
      promotionalPeriod: "3 primeiros meses",
      benefits: ["Wi-Fi 6", "Prioridade de instalação"],
      loyalty: "12 meses",
      installation: "Agendamento após cadastro",
      city: "Fortaleza",
      region: "Ceará",
      eligibility: "Residencial",
      rules: "Oferta exclusiva do book vigente.",
      restrictions: "Sujeito a viabilidade técnica.",
      startsAt: new Date("2026-08-01"),
      endsAt: new Date("2026-12-31"),
      source: "seed",
      bookId: book.id,
      originalText: "Fibra 700 Mega Fortaleza",
      status: "APROVADA",
    },
  });
  await prisma.offer.create({
    data: {
      name: "Controle Móvel 20GB",
      category: "Móvel",
      product: "Linha móvel",
      speedMbps: null,
      priceCents: 5990,
      promotionalPriceCents: 4990,
      benefits: ["Portabilidade", "Apps ilimitados cadastrados no book"],
      loyalty: "12 meses",
      city: "Caucaia",
      region: "Ceará",
      eligibility: "Cross-sell com fibra",
      rules: "Somente valores do book.",
      startsAt: new Date("2026-08-01"),
      endsAt: new Date("2026-12-31"),
      source: "seed",
      bookId: book.id,
      originalText: "Móvel 20GB",
      status: "APROVADA",
    },
  });
  await prisma.offer.create({
    data: {
      name: "Fibra 300 Mega — detecção pendente",
      category: "Internet fixa",
      product: "Fibra",
      speedMbps: 300,
      priceCents: 8990,
      benefits: [],
      city: "Mossoró",
      originalText: "Linha extraída do PDF aguardando revisão humana.",
      status: "AGUARDANDO_APROVACAO",
      bookId: book.id,
    },
  });

  const knowledge = [
    {
      title: "A IA não inventa condições comerciais",
      type: "REGRAS_COMERCIAIS" as const,
      content:
        "Toda informação de preço, promoção, benefício, cobertura e prazo deve vir de oferta aprovada ou documento aprovado. Se não houver fonte, informar que precisa verificar e solicitar humano.",
    },
    {
      title: "Prazo de instalação",
      type: "FAQ" as const,
      content:
        "O prazo de instalação só pode ser informado se estiver na oferta aprovada. Padrão cadastrado: agendamento após o lançamento no sistema corporativo, conforme campo instalação da oferta.",
    },
    {
      title: "LGPD e coleta de dados",
      type: "POLITICAS" as const,
      content:
        "Coletar somente o necessário após aceite comercial: nome completo, endereço de instalação e documento quando exigido pelo cadastro. Registrar consentimento. Não pedir dados de terceiros sem necessidade.",
    },
    {
      title: "Handoff humano",
      type: "PROCEDIMENTOS" as const,
      content:
        "Transferir quando o cliente pedir humano, reclamação, caso sensível, falha de viabilidade, exceção comercial ou informação não encontrada.",
    },
  ];
  for (const doc of knowledge) {
    await prisma.knowledgeDocument.create({
      data: { ...doc, approved: true, active: true, createdById: admin.id, versions: { create: { version: 1, content: doc.content } } },
    });
  }

  const playbooks: { category: "PRECO" | "VAI_PENSAR" | "CONCORRENTE" | "FIDELIDADE" | "INSTALACAO"; argument: string }[] = [
    {
      category: "PRECO",
      argument:
        "Posso comparar com o que você paga hoje usando só o preço da oferta aprovada. Não ofereço desconto que não esteja no book vigente.",
    },
    {
      category: "VAI_PENSAR",
      argument:
        "Sem problema. Posso resumir a oferta aprovada e os benefícios cadastrados para você avaliar com calma. Não reservo condição extra.",
    },
    {
      category: "CONCORRENTE",
      argument:
        "Posso explicar os benefícios cadastrados da oferta Brisanet. Não falo mal de concorrentes nem invento vantagem.",
    },
    {
      category: "FIDELIDADE",
      argument: "A fidelidade é a que está na oferta aprovada. Se o campo não estiver preenchido, preciso verificar com um humano.",
    },
    {
      category: "INSTALACAO",
      argument: "A instalação segue o texto da oferta aprovada. Sem esse texto, não confirmo prazo.",
    },
  ];
  for (const p of playbooks) {
    await prisma.objectionPlaybook.create({ data: p });
  }

  const lead1 = await prisma.lead.create({
    data: {
      name: "Maria Alves",
      phone: "85991000001",
      city: "Caucaia",
      neighborhood: "Jurema",
      address: "Rua das Flores, 120",
      zipCode: "61600-000",
      origin: "META",
      source: "facebook",
      campaignId: meta.id,
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "fibra-caucaia-ago",
      productInterest: "Fibra",
      status: "PRONTO_PARA_LANCAMENTO",
      score: 82,
      ownerId: operador.id,
      latitude: -3.736,
      longitude: -38.653,
    },
  });
  await prisma.leadStatusHistory.create({ data: { leadId: lead1.id, toStatus: "PRONTO_PARA_LANCAMENTO", reason: "seed" } });
  await prisma.consent.create({
    data: { leadId: lead1.id, type: "cadastro", granted: true, text: "Aceito o uso dos dados para cadastro da assinatura." },
  });
  await prisma.viabilityCheck.create({
    data: {
      leadId: lead1.id,
      city: "Caucaia",
      neighborhood: "Jurema",
      result: "VIAVEL",
      source: "internal_authorized",
      details: { reliable: true },
    },
  });
  const conv1 = await prisma.conversation.create({
    data: { leadId: lead1.id, channel: "SIMULATOR", status: "IA_ATIVA", lastMessageAt: new Date(), salesStage: "PRE_SALE_READY" },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: conv1.id, direction: "INBOUND", actor: "CUSTOMER", body: "Oi, vi o anúncio da internet em Caucaia" },
      { conversationId: conv1.id, direction: "OUTBOUND", actor: "AI", body: "Olá! Sou da Brisanet. Posso te ajudar com as ofertas vigentes da sua cidade." },
      { conversationId: conv1.id, direction: "OUTBOUND", actor: "SYSTEM", body: "Oferta apresentada: Fibra 500 Mega Residencial (aprovada)." },
      { conversationId: conv1.id, direction: "INBOUND", actor: "CUSTOMER", body: "Pode seguir com essa." },
    ],
  });
  await prisma.conversationMemory.create({
    data: {
      conversationId: conv1.id,
      summary: "Maria em Caucaia aceitou Fibra 500 Mega aprovada.",
      acceptedOfferId: offer500.id,
    },
  });
  await prisma.domainEvent.createMany({
    data: [
      { type: "LEAD_CREATED", aggregateId: lead1.id, payload: { name: "Maria Alves" } },
      { type: "OFFER_PRESENTED", aggregateId: conv1.id, payload: { offerId: offer500.id } },
      { type: "PRE_SALE_READY", aggregateId: lead1.id, payload: { city: "Caucaia" } },
    ],
  });
  await prisma.preSale.create({
    data: {
      leadId: lead1.id,
      offerId: offer500.id,
      address: lead1.address,
      viabilitySummary: "VIAVEL via base interna autorizada",
      aiSummary:
        "Maria Alves, Jurema/Caucaia, aceitou Fibra 500 Mega no valor promocional aprovado de R$ 99,90. Viabilidade positiva na base interna. Consentimento de cadastro registrado.",
      status: "PRONTA",
      consentsSnapshot: { cadastro: true },
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: "João Ferreira",
      phone: "85991000002",
      city: "Caucaia",
      origin: "META",
      campaignId: meta.id,
      utmSource: "facebook",
      utmCampaign: "fibra-caucaia-ago",
      status: "OFERTA_APRESENTADA",
      score: 55,
      productInterest: "Fibra",
      latitude: -3.74,
      longitude: -38.66,
    },
  });
  await prisma.objection.create({
    data: { leadId: lead2.id, category: "PRECO", text: "Está caro", response: "comparar com oferta aprovada", result: "em aberto" },
  });

  await prisma.lead.create({
    data: {
      name: "Ana Costa",
      phone: "85991000003",
      city: "Fortaleza",
      origin: "GOOGLE",
      campaignId: google.id,
      utmSource: "google",
      utmMedium: "cpc",
      status: "QUALIFICANDO",
      score: 40,
    },
  });

  const lost = await prisma.lead.create({
    data: {
      name: "Pedro Lima",
      phone: "85991000004",
      city: "Caucaia",
      origin: "META",
      campaignId: meta.id,
      status: "PERDIDO",
      lostReason: "Abandonou após preço",
      score: 20,
    },
  });
  await prisma.objection.create({
    data: { leadId: lost.id, category: "PRECO", text: "Vou ficar com o plano atual", result: "perdido" },
  });

  await prisma.offer.create({
    data: {
      name: "Fibra 200 Mega expirada",
      category: "Internet fixa",
      product: "Fibra",
      speedMbps: 200,
      priceCents: 7990,
      city: "Caucaia",
      status: "EXPIRADA",
      startsAt: new Date("2025-01-01"),
      endsAt: new Date("2025-12-31"),
      originalText: "expirada",
      bookId: book.id,
    },
  });
  await prisma.offer.create({
    data: {
      name: "Oferta rejeitada teste",
      category: "Internet fixa",
      product: "Fibra",
      city: "Caucaia",
      status: "REJEITADA",
      originalText: "rejeitada",
      bookId: book.id,
    },
  });

  const extra = [
    ["Carla Mendes", "85991000005", "Sobral", "NOVO"],
    ["Rafael Souza", "85991000006", "Juazeiro do Norte", "EM_ATENDIMENTO_IA"],
    ["Lívia Rocha", "85991000007", "Mossoró", "QUALIFICANDO"],
    ["Diego Martins", "85991000008", "Natal", "CONSULTANDO_VIABILIDADE"],
    ["Beatriz Nunes", "85991000009", "João Pessoa", "NEGOCIANDO"],
    ["Hugo Alves", "85991000010", "Recife", "COLETANDO_DADOS"],
    ["Patrícia Dias", "85991000011", "Fortaleza", "CONTRATO"],
    ["Igor Melo", "85991000012", "Caucaia", "DOCUMENTACAO"],
  ] as const;
  for (const [name, phone, city, status] of extra) {
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        city,
        origin: "LINK",
        campaignId: google.id,
        status,
        score: 35,
        tenantId: tenant.id,
      },
    });
    await prisma.leadStatusHistory.create({ data: { leadId: lead.id, toStatus: status, reason: "seed" } });
  }

  const convHuman = await prisma.conversation.create({
    data: {
      leadId: lead2.id,
      channel: "SIMULATOR",
      status: "HANDOFF_HUMANO",
      aiEnabled: false,
      salesStage: "HUMAN_HANDOFF",
      lastMessageAt: new Date(),
    },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: convHuman.id, direction: "INBOUND", actor: "CUSTOMER", body: "Quero falar com alguém" },
      { conversationId: convHuman.id, direction: "OUTBOUND", actor: "HUMAN", body: "Olá, sou da operação. Posso te ajudar." },
      { conversationId: convHuman.id, direction: "OUTBOUND", actor: "SYSTEM", body: "IA pausada nesta conversa." },
    ],
  });

  await prisma.preSale.create({
    data: {
      leadId: lead2.id,
      offerId: offer500.id,
      status: "PENDENCIA",
      launchResult: "PENDENCIA",
      launchNotes: "Documento do titular pendente.",
      address: "Caucaia",
    },
  });
  const approvedLead = await prisma.lead.findFirst({ where: { name: "Patrícia Dias" } });
  if (approvedLead) {
    await prisma.preSale.create({
      data: {
        leadId: approvedLead.id,
        offerId: offer500.id,
        status: "APROVADA",
        launchResult: "APROVADO",
        launchNotes: "Cadastro aprovado no seed.",
      },
    });
  }
  await prisma.preSale.create({
    data: {
      leadId: lost.id,
      offerId: offer500.id,
      status: "REPROVADA",
      launchResult: "REPROVADO",
      launchNotes: "Cliente desistiu no cadastro.",
    },
  });

  await prisma.user.updateMany({ data: { tenantId: tenant.id } });

  const prompt = await prisma.prompt.create({
    data: { slug: "sales_system", name: "Prompt vendedor WhatsApp" },
  });
  await prisma.promptVersion.create({
    data: {
      promptId: prompt.id,
      version: 3,
      active: true,
      content: `Você é a Luna, vendedora digital da operação no WhatsApp.

Personalidade: competente, natural, objetiva. Mensagens curtas. Uma pergunta por vez quando precisar perguntar.

Você decide COMO conversar. Você NÃO decide fatos comerciais.

Preço, promoção, cobertura, prazo, fidelidade, documentação e condição só existem se uma ferramenta ou o estado do lead devolver. Sem isso, não afirme.

Não use roteiro rígido. Interprete a mensagem. Não pergunte o que já está no SalesConversationState. Não repita apresentação. Não empurre produto que o cliente recusou. Sugestão extra só com contexto comercial.

Objeções: use get_objection_context / get_faq e formule com fatos autorizados — nunca uma frase decorada.

Handoff: só request_human_handoff se o cliente pediu humano, regra explícita ou situação realmente insolúvel. Cliente responder não é motivo de pausa.

Após aceite do backend, cadastro um campo por vez (get_required_customer_fields).`,
    },
  });

  await prisma.requiredFieldDefinition.createMany({
    data: [
      { productType: "fibra", fieldKey: "FULL_NAME", label: "Nome completo" },
      { productType: "fibra", fieldKey: "CPF", label: "CPF" },
      { productType: "fibra", fieldKey: "ADDRESS", label: "Endereço" },
      { productType: "fibra", fieldKey: "CITY", label: "Cidade" },
      { productType: "fibra", fieldKey: "CEP", label: "CEP" },
    ],
  });

  await prisma.workflow.create({
    data: {
      name: "Pós-venda padrão",
      steps: {
        create: [
          { name: "Confirmar cadastro", type: "WAIT_OPERATOR", order: 1 },
          { name: "Avisar aprovação", type: "SEND_MESSAGE", order: 2, template: "sale_approved" },
          { name: "Concluir", type: "COMPLETE", order: 3 },
        ],
      },
    },
  });

  await prisma.whatsAppTemplate.createMany({
    data: [
      {
        name: "sale_approved",
        language: "pt_BR",
        category: "UTILITY",
        status: "APPROVED",
        purpose: "Confirmar pedido aprovado",
        variables: {
          body: "Seu pedido foi confirmado. Nossa equipe entra em contato para agendar a instalação no endereço cadastrado.",
        },
      },
      {
        name: "sale_approved_followup",
        language: "pt_BR",
        category: "UTILITY",
        status: "APPROVED",
        purpose: "Follow-up pós-aprovação",
        variables: {
          body: "Passando para confirmar se você recebeu o aviso do pedido. Qualquer dúvida, é só responder esta conversa.",
        },
      },
    ],
  });

  await prisma.retentionPolicy.createMany({
    data: [
      { entity: "Message", days: 365 },
      { entity: "Lead", days: 1825 },
      { entity: "AuditLog", days: 1825 },
    ],
    skipDuplicates: true,
  });

  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    const xlsxPath = join(process.cwd(), "fixtures/books/Ofertas_Brisanet_Fortaleza__CE_.xlsx");
    const buffer = await readFile(xlsxPath);
    const { importOfferBook } = await import("@/domain/offer-import");
    const { activateOfferBook } = await import("@/domain/book-activate");
    const imported = await importOfferBook({
      fileName: "Ofertas_Brisanet_Fortaleza__CE_.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
      importedById: admin.id,
    });
    await activateOfferBook(imported.book.id);
    console.log(`Book Fortaleza: ${imported.rows} linhas, ${imported.offers.length} ofertas, ACTIVE`);
  } catch (error) {
    console.warn("Book Fortaleza não carregado no seed:", error);
  }

  console.log("Seed ok. Logins: ursula.b@example.com / Brisa@2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
