import { prisma } from "@/lib/prisma";
import { enqueueWaJob, WA_JOB } from "@/workers/wa/queue";
import { logInfo } from "@/lib/logger";

/** Inicia campanhas SCHEDULED vencidas e marca COMPLETED quando não há mais pendentes. */
export async function tickCampaigns() {
  const due = await prisma.waCampaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    take: 20,
  });
  for (const c of due) {
    await prisma.waCampaign.update({
      where: { id: c.id },
      data: { status: "QUEUING", startedAt: new Date() },
    });
    await enqueueWaJob(WA_JOB.CAMPAIGN_PREPARE, {
      organizationId: c.organizationId,
      campaignId: c.id,
    });
    logInfo("wa.campaign.tick_start", { campaignId: c.id });
  }

  const running = await prisma.waCampaign.findMany({
    where: { status: { in: ["RUNNING", "QUEUING"] } },
    take: 50,
  });
  for (const c of running) {
    const pending = await prisma.waCampaignRecipient.count({
      where: { campaignId: c.id, status: { in: ["PENDING", "QUEUED"] } },
    });
    if (pending === 0 && c.queuedCount + c.sentCount + c.failedCount + c.skippedCount > 0) {
      await prisma.waCampaign.update({
        where: { id: c.id },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
      const { runAutomations } = await import("@/wa/automations");
      await runAutomations(c.organizationId, "CAMPAIGN_FINISHED", { campaignId: c.id });
      logInfo("wa.campaign.completed", { campaignId: c.id });
    }
  }
}
