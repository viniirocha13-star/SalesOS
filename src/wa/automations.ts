import type { AutomationTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

export async function runAutomations(
  organizationId: string,
  trigger: AutomationTrigger,
  context: Record<string, string>,
) {
  const automations = await prisma.automation.findMany({
    where: { organizationId, enabled: true, trigger },
  });
  for (const auto of automations) {
    try {
      const config = (auto.actionConfig ?? {}) as Record<string, string>;
      if (auto.action === "ADD_TAG" && context.contactId && config.tag) {
        const tag = await prisma.tag.upsert({
          where: { organizationId_name: { organizationId, name: config.tag } },
          create: { organizationId, name: config.tag },
          update: {},
        });
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId: context.contactId, tagId: tag.id } },
          create: { organizationId, contactId: context.contactId, tagId: tag.id },
          update: {},
        });
      }
      if (auto.action === "ADD_TO_LIST" && context.contactId && config.listId) {
        await prisma.contactListMember.upsert({
          where: { listId_contactId: { listId: config.listId, contactId: context.contactId } },
          create: { organizationId, listId: config.listId, contactId: context.contactId },
          update: {},
        });
      }
      if (auto.action === "NOTIFY") {
        await prisma.systemAlert.create({
          data: {
            organizationId,
            severity: "INFO",
            kind: trigger,
            title: auto.name,
            detail: JSON.stringify(context),
          },
        });
      }
      if (auto.action === "WEBHOOK" && config.url) {
        // n8n / integração opcional — fire and forget
        void fetch(config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger, context, automationId: auto.id }),
        }).catch((e) => logError("wa.automation.webhook_failed", { message: String(e) }));
      }
      await prisma.automationRun.create({
        data: {
          organizationId,
          automationId: auto.id,
          status: "OK",
          context,
        },
      });
      logInfo("wa.automation.ran", { automationId: auto.id, trigger });
    } catch (error) {
      await prisma.automationRun.create({
        data: {
          organizationId,
          automationId: auto.id,
          status: "ERROR",
          context,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
