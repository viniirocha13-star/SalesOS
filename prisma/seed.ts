import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = "Brisa@2026";

async function main() {
  await prisma.aIExecution.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.saleEvent.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.preSale.deleteMany();
  await prisma.objection.deleteMany();
  await prisma.viabilityCheck.deleteMany();
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

  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email: "ursula.b@example.com" },
    update: {},
    create: { name: "Admin Brisa", email: "ursula.b@example.com", passwordHash: hash, role: "ADMIN" },
  });
  const supervisor = await prisma.user.upsert({
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
      endsAt: new Date("2026-08-31"),
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
      endsAt: new Date("2026-08-31"),
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
      endsAt: new Date("2026-08-31"),
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
    data: { leadId: lead1.id, channel: "SIMULATOR", status: "IA_ATIVA" },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: conv1.id, direction: "INBOUND", body: "Oi, vi o anúncio da internet em Caucaia" },
      { conversationId: conv1.id, direction: "OUTBOUND", body: "Olá! Sou da Brisanet. Posso te ajudar com as ofertas vigentes da sua cidade." },
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

  await prisma.retentionPolicy.createMany({
    data: [
      { entity: "Message", days: 365 },
      { entity: "Lead", days: 1825 },
      { entity: "AuditLog", days: 1825 },
    ],
    skipDuplicates: true,
  });

  console.log("Seed ok. Logins: ursula.b@example.com / Brisa@2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
