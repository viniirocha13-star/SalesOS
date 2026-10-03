"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PlimMarketplace, PlimScheduleRepeat, Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlim } from "@/lib/plim/rbac";
import { canPlimWrite } from "@/lib/plim/profile";
import { parseOfferCsvRow, parsePastedOfferText } from "@/lib/plim/offer-parser";
import { createOffer, deleteOffer, updateOffer } from "@/lib/repositories/plim/offers";
import { createGroup, deleteGroup, updateGroup } from "@/lib/repositories/plim/groups";
import { createRoute, deleteRoute, updateRoute } from "@/lib/repositories/plim/routes";
import { createAutopilot, deleteAutopilot, updateAutopilot } from "@/lib/repositories/plim/autopilot";
import {
  enqueueOffer,
  moveQueueItem,
  removeQueueItem,
  setQueueStatus,
} from "@/lib/repositories/plim/queue";
import { cancelSchedule, createSchedule } from "@/lib/repositories/plim/schedules";
import { createShortLinkForOffer } from "@/lib/repositories/plim/short-links";
import { ensureDefaultTemplate, upsertTemplate } from "@/lib/repositories/plim/templates";
import { ensureBlockedWordSeeds } from "@/lib/repositories/plim/blocked-words";
import { convertAffiliateUrl } from "@/lib/affiliates";
import { AffiliateNotConfiguredError } from "@/lib/affiliates/errors";
import { formatBrPrice, renderMessageTemplate } from "@/lib/plim/template-render";
import { processPlimQueueBatch } from "@/lib/plim/queue-processor";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { getPlimWhatsAppProvider } from "@/lib/providers/plim-whatsapp";
import { getTelegramProvider } from "@/lib/providers/telegram";
import { getAffiliateEnvOverrides, getTelegramBotToken } from "@/lib/plim/workspace-env";
import { notifyPlimAdmins } from "@/lib/plim/notify-admins";
import { getInstagramProvider } from "@/lib/providers/instagram";

async function requireWrite() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão para editar");
  await ensureBlockedWordSeeds(ctx.tenantId);
  return ctx;
}

export async function importOfferFromPasteForm(formData: FormData) {
  await importOfferFromPaste(String(formData.get("text") ?? ""));
}

export async function importOfferFromLinkForm(formData: FormData) {
  await importOfferFromLink(String(formData.get("link") ?? ""));
}

export async function importOffersFromCsvForm(formData: FormData) {
  await importOffersFromCsv(String(formData.get("csv") ?? ""));
}

export async function importOfferFromPaste(text: string) {
  const ctx = await requireWrite();
  const parsed = parsePastedOfferText(text);
  const offer = await createOffer(ctx.tenantId, { ...parsed, source: "paste" });
  revalidatePath("/plim/ofertas");
  return offer.id;
}

export async function importOfferFromLink(link: string) {
  const ctx = await requireWrite();
  const parsed = parsePastedOfferText(link);
  const offer = await createOffer(ctx.tenantId, { ...parsed, source: "link" });
  revalidatePath("/plim/ofertas");
  return offer.id;
}

export async function importOffersFromCsv(csv: string) {
  const ctx = await requireWrite();
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  let count = 0;
  for (const row of parsed.data) {
    const offer = parseOfferCsvRow(row);
    if (!offer) continue;
    await createOffer(ctx.tenantId, { ...offer, source: "csv" });
    count++;
  }
  revalidatePath("/plim/ofertas");
  return count;
}

export async function saveOfferForm(formData: FormData) {
  const ctx = await requireWrite();
  const id = formData.get("id")?.toString();
  const payload = {
    productName: z.string().min(1).parse(formData.get("productName")),
    description: formData.get("description")?.toString(),
    marketplace: z.string().parse(formData.get("marketplace")) as PlimMarketplace,
    originalLink: formData.get("originalLink")?.toString(),
    affiliateLink: formData.get("affiliateLink")?.toString(),
    coupon: formData.get("coupon")?.toString(),
    imageUrl: formData.get("imageUrl")?.toString(),
    status: formData.get("status")?.toString() as import("@prisma/client").PlimOfferStatus | undefined,
    originalPrice: formData.get("originalPrice") ? Number(formData.get("originalPrice")) : undefined,
    currentPrice: formData.get("currentPrice") ? Number(formData.get("currentPrice")) : undefined,
  };
  if (id) {
    await updateOffer(ctx.tenantId, id, payload);
  } else {
    await createOffer(ctx.tenantId, { ...payload, source: "form" });
  }
  revalidatePath("/plim/ofertas");
}

export async function removeOffer(id: string) {
  const ctx = await requireWrite();
  await deleteOffer(ctx.tenantId, id);
  revalidatePath("/plim/ofertas");
}

export async function removeOfferForm(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  await removeOffer(id);
}

export async function testAffiliateConversion(url: string, groupId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  let subId: string | undefined;
  if (groupId) {
    const group = await prisma.plimGroup.findFirst({ where: { id: groupId, tenantId: ctx.tenantId } });
    subId = group?.externalId ?? undefined;
  }
  try {
    const envOverrides = await getAffiliateEnvOverrides(ctx.tenantId);
    const result = await convertAffiliateUrl({ url, subId, envOverrides });
    return { ok: true as const, ...result };
  } catch (e) {
    const msg = e instanceof AffiliateNotConfiguredError ? e.message : e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: msg };
  }
}

export async function saveGroupForm(formData: FormData) {
  const ctx = await requireWrite();
  if (!canPlim(ctx.profile, "plim.groups.write")) throw new Error("Sem permissão");
  const id = formData.get("id")?.toString();
  const data = {
    name: z.string().min(1).parse(formData.get("name")),
    platform: z.string().parse(formData.get("platform")) as import("@prisma/client").PlimChannelPlatform,
    groupRole: z.string().parse(formData.get("groupRole")) as import("@prisma/client").PlimGroupRole,
    externalId: formData.get("externalId")?.toString(),
    niche: formData.get("niche")?.toString(),
    memberCount: formData.get("memberCount") ? Number(formData.get("memberCount")) : undefined,
    accountLabel: formData.get("accountLabel")?.toString(),
    activeFrom: formData.get("activeFrom")?.toString(),
    activeTo: formData.get("activeTo")?.toString(),
    dailyLimit: formData.get("dailyLimit") ? Number(formData.get("dailyLimit")) : undefined,
    minIntervalSec: formData.get("minIntervalSec") ? Number(formData.get("minIntervalSec")) : undefined,
    active: formData.get("active") === "on",
    publicSlug: formData.get("publicSlug")?.toString()?.trim() || null,
    isMasterHub: formData.get("isMasterHub") === "on",
    memberLimit: formData.get("memberLimit") ? Number(formData.get("memberLimit")) : null,
    publicRedirectUrl: formData.get("publicRedirectUrl")?.toString()?.trim() || null,
  };
  if (id) await updateGroup(ctx.tenantId, id, data);
  else await createGroup(ctx.tenantId, data);
  revalidatePath("/plim/grupos");
}

export async function removeGroup(id: string) {
  const ctx = await requireWrite();
  await deleteGroup(ctx.tenantId, id);
  revalidatePath("/plim/grupos");
}

export async function removeGroupForm(formData: FormData) {
  await removeGroup(z.string().parse(formData.get("id")));
}

function splitList(raw?: string | null) {
  return (raw ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveRouteForm(formData: FormData) {
  const ctx = await requireWrite();
  const id = formData.get("id")?.toString();
  const data = {
    name: z.string().min(1).parse(formData.get("name")),
    status: formData.get("status")?.toString() as import("@prisma/client").PlimRouteStatus,
    originGroupId: formData.get("originGroupId")?.toString() || null,
    destinationGroupIds: splitList(formData.get("destinationGroupIds")?.toString()),
    marketplaces: splitList(formData.get("marketplaces")?.toString()) as PlimMarketplace[],
    categories: splitList(formData.get("categories")?.toString()),
    requiredWords: splitList(formData.get("requiredWords")?.toString()),
    forbiddenWords: splitList(formData.get("forbiddenWords")?.toString()),
    minDiscount: formData.get("minDiscount") ? Number(formData.get("minDiscount")) : null,
    intervalSec: formData.get("intervalSec") ? Number(formData.get("intervalSec")) : null,
    activeFrom: formData.get("activeFrom")?.toString(),
    activeTo: formData.get("activeTo")?.toString(),
    avoidDuplicates: formData.get("avoidDuplicates") === "on",
  };
  if (id) await updateRoute(ctx.tenantId, id, data);
  else await createRoute(ctx.tenantId, data);
  revalidatePath("/plim/rotas");
}

export async function removeRoute(id: string) {
  const ctx = await requireWrite();
  await deleteRoute(ctx.tenantId, id);
  revalidatePath("/plim/rotas");
}

export async function removeRouteForm(formData: FormData) {
  await removeRoute(z.string().parse(formData.get("id")));
}

export async function saveAutopilotForm(formData: FormData) {
  const ctx = await requireWrite();
  const id = formData.get("id")?.toString();
  const data = {
    name: z.string().min(1).parse(formData.get("name")),
    marketplace: (formData.get("marketplace")?.toString() || null) as PlimMarketplace | null,
    searchQuery: formData.get("searchQuery")?.toString(),
    minDiscount: formData.get("minDiscount") ? Number(formData.get("minDiscount")) : null,
    dailyQuantity: formData.get("dailyQuantity") ? Number(formData.get("dailyQuantity")) : null,
    activeFrom: formData.get("activeFrom")?.toString(),
    activeTo: formData.get("activeTo")?.toString(),
    destinationGroupIds: splitList(formData.get("destinationGroupIds")?.toString()),
    templateId: formData.get("templateId")?.toString(),
    sourceKey: formData.get("sourceKey")?.toString(),
    status: formData.get("status")?.toString() as import("@prisma/client").PlimAutopilotStatus,
  };
  if (id) await updateAutopilot(ctx.tenantId, id, data);
  else await createAutopilot(ctx.tenantId, data);
  revalidatePath("/plim/piloto");
}

export async function removeAutopilot(id: string) {
  const ctx = await requireWrite();
  await deleteAutopilot(ctx.tenantId, id);
  revalidatePath("/plim/piloto");
}

export async function removeAutopilotForm(formData: FormData) {
  await removeAutopilot(z.string().parse(formData.get("id")));
}

export async function runAutopilotSearch(id: string) {
  const ctx = await requireWrite();
  const pilot = await prisma.plimAutopilot.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!pilot?.sourceKey?.trim()) {
    return { ok: false, error: "Fonte de busca automática não configurada." };
  }
  return { ok: false, error: "Fonte configurada, mas integração de busca ainda não disponível." };
}

export async function queueActionForm(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const action = z.enum(["pause", "resume", "up", "down", "send", "remove"]).parse(formData.get("action"));
  await queueAction(id, action);
}

export async function queueAction(id: string, action: "pause" | "resume" | "up" | "down" | "send" | "remove") {
  const ctx = await requireWrite();
  if (action === "pause") await setQueueStatus(ctx.tenantId, id, "PAUSADO");
  if (action === "resume") await setQueueStatus(ctx.tenantId, id, "AGUARDANDO");
  if (action === "up") await moveQueueItem(ctx.tenantId, id, "up");
  if (action === "down") await moveQueueItem(ctx.tenantId, id, "down");
  if (action === "remove") await removeQueueItem(ctx.tenantId, id);
  if (action === "send") {
    await setQueueStatus(ctx.tenantId, id, "AGUARDANDO");
    await processPlimQueueBatch(1);
  }
  revalidatePath("/plim/filas");
}

export async function createScheduleAction(formData: FormData) {
  const ctx = await requireWrite();
  const offerId = z.string().parse(formData.get("offerId"));
  const scheduledAt = new Date(z.string().parse(formData.get("scheduledAt")));
  const repeat = z.string().parse(formData.get("repeat")) as PlimScheduleRepeat;
  const destinationGroupIds = formData.getAll("destinationGroupIds").map(String).filter(Boolean);
  await createSchedule(ctx.tenantId, { offerId, scheduledAt, repeat, destinationGroupIds });
  revalidatePath("/plim/agendamentos");
}

export async function cancelScheduleAction(id: string) {
  const ctx = await requireWrite();
  await cancelSchedule(ctx.tenantId, id);
  revalidatePath("/plim/agendamentos");
}

export async function cancelScheduleForm(formData: FormData) {
  await cancelScheduleAction(z.string().parse(formData.get("id")));
}

export async function saveEditorOffer(formData: FormData) {
  const ctx = await requireWrite();
  const id = z.string().parse(formData.get("id"));
  await updateOffer(ctx.tenantId, id, {
    productName: formData.get("productName")?.toString(),
    messageEmoji: formData.get("messageEmoji")?.toString(),
    description: formData.get("description")?.toString(),
    editorMessage: formData.get("editorMessage")?.toString(),
    ctaLabel: formData.get("ctaLabel")?.toString(),
    originalPrice: formData.get("originalPrice") ? Number(formData.get("originalPrice")) : undefined,
    currentPrice: formData.get("currentPrice") ? Number(formData.get("currentPrice")) : undefined,
    coupon: formData.get("coupon")?.toString(),
    imageUrl: formData.get("imageUrl")?.toString(),
    affiliateLink: formData.get("affiliateLink")?.toString(),
    status: formData.get("status")?.toString() as import("@prisma/client").PlimOfferStatus,
  });
  revalidatePath("/plim/editor");
}

export async function editorWorkflow(
  offerId: string,
  action: "approve" | "schedule" | "send",
  opts?: { groupIds?: string[]; scheduledAt?: string },
) {
  const ctx = await requireWrite();
  const offer = await prisma.plimOffer.findFirst({ where: { id: offerId, tenantId: ctx.tenantId } });
  if (!offer) throw new Error("Oferta não encontrada");
  const template = await ensureDefaultTemplate(ctx.tenantId);
  const destUrl = offer.affiliateLink ?? offer.originalLink ?? "";
  const message = renderMessageTemplate(template.body, {
    produto: `${offer.messageEmoji ?? ""} ${offer.productName}`.trim(),
    preco_anterior: formatBrPrice(offer.originalPrice ? Number(offer.originalPrice) : null),
    preco: formatBrPrice(offer.currentPrice ? Number(offer.currentPrice) : null),
    cupom: offer.coupon ? `Cupom: ${offer.coupon}` : "",
    link: destUrl,
  });
  await updateOffer(ctx.tenantId, offerId, { editorMessage: message });

  if (action === "approve") {
    await updateOffer(ctx.tenantId, offerId, { status: "APROVADA" });
  }
  if (action === "schedule" && opts?.scheduledAt && opts.groupIds?.length) {
    await createSchedule(ctx.tenantId, {
      offerId,
      scheduledAt: new Date(opts.scheduledAt),
      repeat: "NENHUMA",
      destinationGroupIds: opts.groupIds,
    });
    await updateOffer(ctx.tenantId, offerId, { status: "PROGRAMADA" });
  }
  if (action === "send" && opts?.groupIds?.length) {
    for (const gid of opts.groupIds) {
      await enqueueOffer(ctx.tenantId, { offerId, groupId: gid, messageBody: message });
    }
    await updateOffer(ctx.tenantId, offerId, { status: "NA_FILA" });
    await processPlimQueueBatch(10);
  }
  revalidatePath("/plim/editor");
  revalidatePath("/plim/filas");
}

export async function ensureShortLink(offerId: string, groupId?: string) {
  const ctx = await requireWrite();
  const offer = await prisma.plimOffer.findFirst({ where: { id: offerId, tenantId: ctx.tenantId } });
  if (!offer) throw new Error("Oferta não encontrada");
  const destinationUrl = offer.affiliateLink ?? offer.originalLink;
  if (!destinationUrl) throw new Error("Defina link de destino antes de encurtar.");
  return createShortLinkForOffer(ctx.tenantId, {
    offerId,
    groupId,
    destinationUrl,
  });
}

export async function saveMessageTemplate(formData: FormData) {
  const ctx = await requireWrite();
  await upsertTemplate(ctx.tenantId, {
    id: formData.get("id")?.toString(),
    name: z.string().parse(formData.get("name")),
    body: z.string().parse(formData.get("body")),
    isDefault: formData.get("isDefault") === "on",
  });
  revalidatePath("/plim/editor");
}

export async function testChannelConnection(platform: "WHATSAPP" | "TELEGRAM" | "INSTAGRAM") {
  const ctx = await requireWrite();
  let ok = false;
  let error: string | undefined;
  if (platform === "WHATSAPP") {
    const s = await getPlimWhatsAppProvider().getStatus();
    ok = s.connected;
    error = s.error;
  } else if (platform === "TELEGRAM") {
    const tgToken = await getTelegramBotToken(ctx.tenantId);
    const s = await getTelegramProvider(tgToken).getStatus();
    ok = s.ok;
    error = s.error;
  } else {
    const s = await getInstagramProvider().getStatus();
    ok = s.ok;
    error = s.mode === "noop" ? "Instagram: integração parcial — recursos não suportados pela API ficam em breve." : undefined;
  }
  const existing = await prisma.plimChannelConnection.findFirst({
    where: { tenantId: ctx.tenantId, platform },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    await prisma.plimChannelConnection.update({
      where: { id: existing.id },
      data: {
        status: ok ? "CONNECTED" : "DISCONNECTED",
        lastSeenAt: ok ? new Date() : undefined,
        lastError: error,
        sendsPaused: !ok,
      },
    });
  } else {
    await prisma.plimChannelConnection.create({
      data: {
        tenantId: ctx.tenantId,
        platform,
        label: platform,
        status: ok ? "CONNECTED" : "DISCONNECTED",
        lastSeenAt: ok ? new Date() : undefined,
        lastError: error,
        sendsPaused: !ok,
      },
    });
  }
  revalidatePath(`/plim/${platform.toLowerCase()}`);
  if (!ok) {
    await notifyPlimAdmins(
      ctx.tenantId,
      `PLIM: falha na integração ${platform}`,
      error ?? "Teste de conexão falhou",
      `/plim/configuracoes?tab=${platform === "WHATSAPP" ? "WhatsApp" : platform === "TELEGRAM" ? "Telegram" : "Instagram"}`,
    );
  }
  return { ok, error };
}
