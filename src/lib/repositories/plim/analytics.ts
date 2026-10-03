import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, startOfMonth, endOfDay } from "date-fns";
import type { PlimMarketplace } from "@prisma/client";

export async function getCommissionTotalsByMarketplace(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  const monthStart = startOfMonth(now);

  const periods = [
    { key: "today" as const, from: todayStart, to: endOfDay(now) },
    { key: "yesterday" as const, from: yesterdayStart, to: todayStart },
    { key: "month" as const, from: monthStart, to: endOfDay(now) },
  ];

  const byPeriod: Record<string, Partial<Record<PlimMarketplace, number>>> = {};
  for (const p of periods) {
    const occurredAt =
      p.key === "yesterday" ? { gte: p.from, lt: p.to } : { gte: p.from, lte: p.to };
    const rows = await prisma.plimCommissionEvent.groupBy({
      by: ["marketplace"],
      where: { tenantId, occurredAt },
      _sum: { commission: true },
    });
    byPeriod[p.key] = {};
    for (const row of rows) {
      byPeriod[p.key][row.marketplace] = Number(row._sum.commission ?? 0);
    }
  }

  const byGroup = await prisma.plimCommissionEvent.groupBy({
    by: ["groupId"],
    where: { tenantId, occurredAt: { gte: monthStart } },
    _sum: { commission: true, amount: true },
    _count: true,
  });
  const groups = await prisma.plimGroup.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const byCampaign = await prisma.plimCommissionEvent.groupBy({
    by: ["campaignId"],
    where: { tenantId, occurredAt: { gte: monthStart } },
    _sum: { commission: true },
    _count: true,
  });

  const byProduct = await prisma.plimCommissionEvent.groupBy({
    by: ["productName"],
    where: { tenantId, occurredAt: { gte: monthStart }, productName: { not: null } },
    _sum: { commission: true },
    _count: true,
    orderBy: { _sum: { commission: "desc" } },
    take: 50,
  });

  return {
    byMarketplacePeriod: byPeriod,
    byGroup: byGroup.map((r) => ({
      groupId: r.groupId,
      groupName: r.groupId ? groupName.get(r.groupId) ?? r.groupId : "Sem grupo",
      orders: r._count,
      commission: Number(r._sum.commission ?? 0),
      amount: Number(r._sum.amount ?? 0),
    })),
    byCampaign: byCampaign.map((r) => ({
      campaignId: r.campaignId ?? "—",
      orders: r._count,
      commission: Number(r._sum.commission ?? 0),
    })),
    byProduct: byProduct.map((r) => ({
      productName: r.productName ?? "—",
      orders: r._count,
      commission: Number(r._sum.commission ?? 0),
    })),
  };
}

export async function listClickEvents(tenantId: string, limit = 200) {
  return prisma.plimClickEvent.findMany({
    where: { tenantId },
    orderBy: { clickedAt: "desc" },
    take: limit,
    include: {
      offer: { select: { productName: true, affiliateLink: true, shortLink: true } },
      group: { select: { name: true } },
    },
  });
}

export async function getResultsMetrics(tenantId: string, from: Date, to: Date) {
  const [publishedOffers, clicks, commissions, campaignMaps] = await Promise.all([
    prisma.plimOffer.count({
      where: { tenantId, status: "PUBLICADA", publishedAt: { gte: from, lte: to } },
    }),
    prisma.plimClickEvent.count({ where: { tenantId, clickedAt: { gte: from, lte: to } } }),
    prisma.plimCommissionEvent.aggregate({
      where: { tenantId, occurredAt: { gte: from, lte: to } },
      _sum: { commission: true, amount: true },
      _count: true,
    }),
    prisma.plimCampaignMap.findMany({
      where: { tenantId },
      include: { group: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const investment = campaignMaps.reduce((s, m) => s + Number(m.investment), 0);
  const commissionTotal = Number(commissions._sum.commission ?? 0);
  const orders = commissions._count;
  const ctr = publishedOffers > 0 ? clicks / publishedOffers : 0;
  const profit = commissionTotal - investment;
  const roas = investment > 0 ? commissionTotal / investment : null;

  const byGroupClick = await prisma.plimClickEvent.groupBy({
    by: ["groupId"],
    where: { tenantId, clickedAt: { gte: from, lte: to } },
    _count: true,
  });
  const byGroupCommission = await prisma.plimCommissionEvent.groupBy({
    by: ["groupId"],
    where: { tenantId, occurredAt: { gte: from, lte: to } },
    _sum: { commission: true },
    _count: true,
  });
  const groups = await prisma.plimGroup.findMany({ where: { tenantId }, select: { id: true, name: true } });

  const groupRows = groups.map((g) => {
    const clicksG = byGroupClick.find((r) => r.groupId === g.id)?._count ?? 0;
    const comm = byGroupCommission.find((r) => r.groupId === g.id);
    return {
      groupId: g.id,
      groupName: g.name,
      clicks: clicksG,
      orders: comm?._count ?? 0,
      commission: Number(comm?._sum.commission ?? 0),
    };
  });

  const offerRows = await prisma.plimOffer.findMany({
    where: { tenantId, status: "PUBLICADA", publishedAt: { gte: from, lte: to } },
    select: {
      id: true,
      productName: true,
      publishedAt: true,
      clicks: { where: { clickedAt: { gte: from, lte: to } }, select: { id: true } },
    },
    take: 100,
  });

  const offerCommission = await prisma.plimCommissionEvent.groupBy({
    by: ["productName"],
    where: { tenantId, occurredAt: { gte: from, lte: to }, productName: { not: null } },
    _sum: { commission: true },
    _count: true,
  });
  const commByProduct = new Map(offerCommission.map((r) => [r.productName, r]));

  const mapRows = await Promise.all(
    campaignMaps.map(async (m) => {
      const entries = await prisma.plimClickEvent.count({
        where: {
          tenantId,
          clickedAt: { gte: from, lte: to },
          OR: [
            { campaign: m.name },
            { utmCampaign: m.name },
          ],
        },
      });
      const comm = await prisma.plimCommissionEvent.aggregate({
        where: {
          tenantId,
          occurredAt: { gte: from, lte: to },
          OR: [{ campaignId: m.id }, { campaignId: m.name }],
        },
        _sum: { commission: true },
      });
      const inv = Number(m.investment);
      const c = Number(comm._sum.commission ?? 0);
      return {
        id: m.id,
        name: m.name,
        groupName: m.group?.name ?? "—",
        linkUrl: m.linkUrl,
        investment: inv,
        entries,
        commissions: c,
        netRevenue: c - inv,
      };
    }),
  );

  return {
    summary: {
      publishedOffers,
      clicks,
      ctr,
      orders,
      commissions: commissionTotal,
      investment,
      profit,
      roas,
    },
    byGroup: groupRows,
    byOffer: offerRows.map((o) => {
      const comm = commByProduct.get(o.productName);
      const clickCount = o.clicks.length;
      return {
        offerId: o.id,
        productName: o.productName,
        publishedAt: o.publishedAt,
        clicks: clickCount,
        orders: comm?._count ?? 0,
        commission: Number(comm?._sum.commission ?? 0),
        ctr: o.publishedAt ? clickCount : 0,
      };
    }),
    campaignMaps: mapRows,
  };
}

export async function listPlimAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, email: true } } },
  });
}

export async function listPlimErrorLogs(tenantId: string, limit = 100) {
  return prisma.plimErrorLog.findMany({
    where: { tenantId, resolved: false },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listContacts(tenantId: string, limit = 200) {
  return prisma.plimContact.findMany({
    where: { tenantId },
    orderBy: { importedAt: "desc" },
    take: limit,
    include: { group: { select: { name: true } } },
  });
}

export async function listExclusions(tenantId: string) {
  return prisma.plimExclusion.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}
