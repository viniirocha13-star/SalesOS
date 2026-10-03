import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, startOfMonth } from "date-fns";
import type { PlimMarketplace } from "@prisma/client";

export async function getPlimDashboardMetrics(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = subDays(todayStart, 7);
  const monthStart = startOfMonth(now);
  const yesterdayStart = subDays(todayStart, 1);
  const yesterdayEnd = todayStart;

  const [
    capturedToday,
    publishedToday,
    waitingOffers,
    rejectedOffers,
    waConnections,
    tgConnections,
    igConnections,
    activeGroups,
    clicksToday,
    clicksWeek,
    clicksMonth,
    commissionsToday,
    commissionsYesterday,
    commissionsWeek,
    commissionsMonth,
    commissionsByMarketplace,
    activeRoutes,
    activeAutopilots,
    queueWaiting,
    queueFailed,
    commissionsByDay,
    clicksByDay,
    publishedByChannel,
  ] = await Promise.all([
    prisma.plimOffer.count({ where: { tenantId, capturedAt: { gte: todayStart } } }),
    prisma.plimOffer.count({ where: { tenantId, publishedAt: { gte: todayStart } } }),
    prisma.plimOffer.count({
      where: { tenantId, status: { in: ["NOVA", "EM_ANALISE", "NA_FILA", "PROGRAMADA"] } },
    }),
    prisma.plimOffer.count({ where: { tenantId, status: { in: ["IGNORADA", "ERRO"] } } }),
    prisma.plimChannelConnection.count({ where: { tenantId, platform: "WHATSAPP", status: "CONNECTED" } }),
    prisma.plimChannelConnection.count({ where: { tenantId, platform: "TELEGRAM", status: "CONNECTED" } }),
    prisma.plimChannelConnection.count({ where: { tenantId, platform: "INSTAGRAM", status: "CONNECTED" } }),
    prisma.plimGroup.count({ where: { tenantId, active: true } }),
    prisma.plimClickEvent.count({ where: { tenantId, clickedAt: { gte: todayStart } } }),
    prisma.plimClickEvent.count({ where: { tenantId, clickedAt: { gte: weekStart } } }),
    prisma.plimClickEvent.count({ where: { tenantId, clickedAt: { gte: monthStart } } }),
    prisma.plimCommissionEvent.aggregate({
      where: { tenantId, occurredAt: { gte: todayStart } },
      _sum: { commission: true },
    }),
    prisma.plimCommissionEvent.aggregate({
      where: { tenantId, occurredAt: { gte: yesterdayStart, lt: yesterdayEnd } },
      _sum: { commission: true },
    }),
    prisma.plimCommissionEvent.aggregate({
      where: { tenantId, occurredAt: { gte: weekStart } },
      _sum: { commission: true },
    }),
    prisma.plimCommissionEvent.aggregate({
      where: { tenantId, occurredAt: { gte: monthStart } },
      _sum: { commission: true },
    }),
    prisma.plimCommissionEvent.groupBy({
      by: ["marketplace"],
      where: { tenantId, occurredAt: { gte: monthStart } },
      _sum: { commission: true },
    }),
    prisma.plimRoute.count({ where: { tenantId, status: "ATIVA" } }),
    prisma.plimAutopilot.count({ where: { tenantId, status: "ATIVO" } }),
    prisma.plimQueueItem.count({ where: { tenantId, status: "AGUARDANDO" } }),
    prisma.plimQueueItem.count({ where: { tenantId, status: "FALHOU" } }),
    prisma.plimCommissionEvent.findMany({
      where: { tenantId, occurredAt: { gte: weekStart } },
      select: { occurredAt: true, commission: true },
    }),
    prisma.plimClickEvent.findMany({
      where: { tenantId, clickedAt: { gte: weekStart } },
      select: { clickedAt: true },
    }),
    prisma.plimOffer.findMany({
      where: { tenantId, publishedAt: { gte: weekStart } },
      select: { publishedAt: true, source: true },
    }),
  ]);

  const channelPublished: Record<string, number> = {};
  for (const row of publishedByChannel) {
    const key = row.source ?? "Outros";
    if (!row.publishedAt) continue;
    channelPublished[key] = (channelPublished[key] ?? 0) + 1;
  }

  const commissionDaily = bucketByDay(
    commissionsByDay.map((c) => ({ at: c.occurredAt, value: Number(c.commission) })),
    weekStart,
  );
  const clickDaily = bucketByDay(
    clicksByDay.map((c) => ({ at: c.clickedAt, value: 1 })),
    weekStart,
  );

  const marketplaceTotals: Partial<Record<PlimMarketplace, number>> = {};
  for (const row of commissionsByMarketplace) {
    marketplaceTotals[row.marketplace] = Number(row._sum.commission ?? 0);
  }

  const publishedChannelSeries = Object.entries(channelPublished).map(([channel, total]) => ({
    channel,
    total,
  }));

  return {
    offers: {
      capturedToday,
      publishedToday,
      waiting: waitingOffers,
      rejected: rejectedOffers,
    },
    channels: {
      whatsapp: waConnections,
      telegram: tgConnections,
      instagram: igConnections,
      activeGroups,
    },
    performance: {
      clicksToday,
      clicksWeek,
      clicksMonth,
    },
    commissions: {
      today: Number(commissionsToday._sum.commission ?? 0),
      yesterday: Number(commissionsYesterday._sum.commission ?? 0),
      week: Number(commissionsWeek._sum.commission ?? 0),
      month: Number(commissionsMonth._sum.commission ?? 0),
      byMarketplace: marketplaceTotals,
    },
    automations: {
      activeRoutes,
      activeAutopilots,
      schedules: 0,
      queueItems: queueWaiting,
      failures: queueFailed,
    },
    charts: {
      commissionsByDay: commissionDaily,
      clicksByDay: clickDaily,
      publishedByChannel: publishedChannelSeries,
    },
  };
}

function bucketByDay(rows: { at: Date; value: number }[], since: Date) {
  const map = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = subDays(startOfDay(new Date()), 6 - i);
    if (d < since) continue;
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = startOfDay(row.at).toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + row.value);
  }
  return [...map.entries()].map(([date, total]) => ({ date, total }));
}
