import { prisma } from "@/lib/prisma";
import { getPlimWhatsAppProvider } from "@/lib/providers/plim-whatsapp";
import { getTelegramProvider } from "@/lib/providers/telegram";
import { getInstagramProvider } from "@/lib/providers/instagram";
import type { PlimChannelPlatform } from "@prisma/client";

async function sendViaPlatform(
  platform: PlimChannelPlatform,
  externalId: string,
  message: string,
  imageUrl?: string | null,
) {
  if (platform === "WHATSAPP") {
    const wa = getPlimWhatsAppProvider();
    if (imageUrl) return wa.sendImage(externalId, imageUrl, message);
    return wa.sendMessage(externalId, message);
  }
  if (platform === "TELEGRAM") {
    const tg = getTelegramProvider();
    return tg.sendMessage(externalId, message);
  }
  if (platform === "INSTAGRAM") {
    const ig = getInstagramProvider();
    await ig.publishPost();
    throw new Error("Instagram: publicação completa em breve via API Meta.");
  }
  throw new Error(`Plataforma ${platform} não suportada para envio.`);
}

async function connectionAllowsSend(tenantId: string, platform: PlimChannelPlatform) {
  const conn = await prisma.plimChannelConnection.findFirst({
    where: { tenantId, platform },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) return { ok: false, reason: "Conexão não configurada" };
  if (conn.sendsPaused || conn.status === "DISCONNECTED" || conn.status === "ERROR") {
    return { ok: false, reason: conn.lastError ?? "Conexão pausada ou indisponível" };
  }
  return { ok: true, conn };
}

export async function processPlimQueueBatch(limit = 25): Promise<{ processed: number; failed: number }> {
  const items = await prisma.plimQueueItem.findMany({
    where: { status: { in: ["AGUARDANDO", "PROCESSANDO"] } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: limit,
    include: { group: true, offer: true },
  });

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    if (item.status === "PAUSADO" || item.status === "CANCELADO" || item.status === "ENVIADO") continue;

    const settings = await prisma.plimWorkspaceSettings.findUnique({ where: { tenantId: item.tenantId } });
    const testMode = settings?.testMode ?? true;

    const group = item.group;
    const platform = item.platform ?? group?.platform;
    const externalId = group?.externalId;

    if (!platform || !externalId) {
      await prisma.plimQueueItem.update({
        where: { id: item.id },
        data: { status: "FALHOU", lastError: "Destino sem plataforma ou identificador" },
      });
      failed++;
      continue;
    }

    const minInterval = group?.minIntervalSec ?? 0;
    if (minInterval > 0) {
      const lastSent = await prisma.plimQueueItem.findFirst({
        where: {
          tenantId: item.tenantId,
          groupId: item.groupId,
          status: "ENVIADO",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (lastSent) {
        const elapsed = (Date.now() - lastSent.updatedAt.getTime()) / 1000;
        if (elapsed < minInterval) continue;
      }
    }

    const gate = await connectionAllowsSend(item.tenantId, platform);
    if (!gate.ok) {
      await prisma.plimChannelConnection.updateMany({
        where: { tenantId: item.tenantId, platform },
        data: { sendsPaused: true, lastError: gate.reason },
      });
      await prisma.plimQueueItem.update({
        where: { id: item.id },
        data: { status: "FALHOU", lastError: gate.reason },
      });
      await prisma.notification.create({
        data: {
          title: `PLIM: envios pausados (${platform})`,
          body: gate.reason ?? "Conexão indisponível",
          href: `/plim/${platform === "WHATSAPP" ? "whatsapp" : platform === "TELEGRAM" ? "telegram" : "instagram"}`,
        },
      });
      failed++;
      continue;
    }

    await prisma.plimQueueItem.update({
      where: { id: item.id },
      data: { status: "PROCESSANDO" },
    });

    const message = item.messageBody ?? item.productName;

    try {
      if (testMode) {
        await prisma.plimQueueItem.update({
          where: { id: item.id },
          data: {
            status: "ENVIADO",
            testPayload: {
              platform,
              externalId,
              message,
              imageUrl: item.imageUrl,
              simulatedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await sendViaPlatform(platform, externalId, message, item.imageUrl);
        await prisma.plimQueueItem.update({
          where: { id: item.id },
          data: { status: "ENVIADO", testPayload: undefined },
        });
        await prisma.plimChannelConnection.update({
          where: { id: gate.conn!.id },
          data: { sendCount: { increment: 1 }, lastSeenAt: new Date(), status: "CONNECTED" },
        });
      }
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.plimQueueItem.update({
        where: { id: item.id },
        data: { status: "FALHOU", lastError: msg },
      });
      await prisma.plimChannelConnection.update({
        where: { id: gate.conn!.id },
        data: { errorCount: { increment: 1 }, lastError: msg, status: "ERROR", sendsPaused: true },
      });
      failed++;
    }
  }

  return { processed, failed };
}

export async function materializeDueSchedules(): Promise<number> {
  const now = new Date();
  const due = await prisma.plimSchedule.findMany({
    where: { status: "PENDENTE", scheduledAt: { lte: now } },
    include: { offer: true },
    take: 50,
  });

  let created = 0;
  for (const sch of due) {
    const maxPos = await prisma.plimQueueItem.aggregate({
      where: { tenantId: sch.tenantId },
      _max: { position: true },
    });
    let position = (maxPos._max.position ?? 0) + 1;

    for (const groupId of sch.destinationGroupIds) {
      const group = await prisma.plimGroup.findFirst({
        where: { id: groupId, tenantId: sch.tenantId },
      });
      if (!group) continue;
      await prisma.plimQueueItem.create({
        data: {
          tenantId: sch.tenantId,
          offerId: sch.offerId,
          groupId: group.id,
          platform: group.platform,
          productName: sch.offer.productName,
          destination: group.name,
          messageBody: sch.offer.editorMessage ?? sch.offer.description,
          imageUrl: sch.offer.imageUrl,
          position,
          scheduledAt: sch.scheduledAt,
          status: "AGUARDANDO",
        },
      });
      position++;
      created++;
    }

    const nextAt =
      sch.repeat === "DIARIA"
        ? new Date(sch.scheduledAt.getTime() + 24 * 60 * 60 * 1000)
        : sch.repeat === "SEMANAL"
          ? new Date(sch.scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null;

    if (nextAt && sch.repeat !== "NENHUMA") {
      await prisma.plimSchedule.update({
        where: { id: sch.id },
        data: { scheduledAt: nextAt, lastMaterializedAt: now },
      });
    } else {
      await prisma.plimSchedule.update({
        where: { id: sch.id },
        data: { status: "MATERIALIZADO", lastMaterializedAt: now },
      });
    }
  }
  return created;
}
