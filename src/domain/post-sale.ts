import { prisma } from "@/lib/prisma";
import { enqueueSendWhatsApp } from "@/workers/queue";
import { advanceWorkflow, getWorkflowState } from "@/domain/workflow";
import { logError, logInfo } from "@/lib/logger";

export function approvedTemplateBody(variables: unknown): string | null {
  if (!variables || typeof variables !== "object") return null;
  const body = (variables as { body?: unknown }).body;
  if (typeof body !== "string") return null;
  const text = body.trim();
  return text.length ? text : null;
}

export function shouldCancelFollowUp(lastInboundAt: Date | null | undefined, sentAt: Date | null | undefined) {
  if (!sentAt || !lastInboundAt) return false;
  return lastInboundAt.getTime() > sentAt.getTime();
}

export function followUpDelayMinutes() {
  const n = Number(process.env.FOLLOWUP_DELAY_MINUTES ?? 60);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function nextFollowUpPatch(attempts: number, maxAttempts: number, now: Date, delayMinutes: number) {
  const done = attempts >= maxAttempts;
  return {
    attempts,
    sentAt: done ? now : null,
    cancelled: done,
    dueAt: done ? undefined : new Date(now.getTime() + delayMinutes * 60_000),
  };
}

async function notifyOps(title: string, body: string, href = "/pos-venda") {
  await prisma.notification.create({ data: { title, body, href } });
}

async function sendApprovedTemplate(conversationId: string, templateName: string) {
  const tpl = await prisma.whatsAppTemplate.findFirst({
    where: { name: templateName, status: "APPROVED" },
  });
  const body = approvedTemplateBody(tpl?.variables);
  if (!tpl || !body) {
    await notifyOps(
      "Pós-venda sem template",
      `Passo SEND_MESSAGE pediu o template "${templateName}", que não está aprovado. Nada foi inventado nem enviado.`,
    );
    return { sent: false as const, reason: "template_missing" };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, channel: true },
  });
  if (!conversation) return { sent: false as const, reason: "no_conversation" };

  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      actor: "SYSTEM",
      body,
      templateName: tpl.name,
      status: "QUEUED",
      metadata: { source: "post_sale_workflow" },
    },
  });
  await enqueueSendWhatsApp(message.id);
  logInfo("post_sale.template_queued", { conversationId, templateName: tpl.name, messageId: message.id });
  return { sent: true as const, messageId: message.id };
}

async function scheduleFollowUp(conversationId: string, stage: string, templateName: string) {
  const open = await prisma.followUp.findFirst({
    where: { conversationId, cancelled: false, sentAt: null },
  });
  if (open) return open;
  const dueAt = new Date(Date.now() + followUpDelayMinutes() * 60_000);
  return prisma.followUp.create({
    data: {
      conversationId,
      stage,
      delayMinutes: followUpDelayMinutes(),
      templateName,
      dueAt,
      maxAttempts: 2,
    },
  });
}

export async function progressApprovedSaleWorkflow(conversationId: string, opts?: { skipOperatorWait?: boolean }) {
  const skipOperatorWait = opts?.skipOperatorWait ?? true;
  let guard = 0;
  while (guard++ < 8) {
    const state = await getWorkflowState(conversationId);
    if (!state?.current || state.status === "COMPLETE") return state;
    const step = state.current;
    if (step.type === "WAIT_OPERATOR") {
      if (!skipOperatorWait) return state;
      await advanceWorkflow(state.executionId);
      continue;
    }
    if (step.type === "SEND_MESSAGE") {
      if (!step.template) {
        await notifyOps("Pós-venda sem template", "Passo SEND_MESSAGE sem template cadastrado. A IA não inventa texto nem URL.");
        return state;
      }
      const result = await sendApprovedTemplate(conversationId, step.template);
      if (!result.sent) return state;
      await scheduleFollowUp(conversationId, step.name, step.template);
      await advanceWorkflow(state.executionId);
      continue;
    }
    if (step.type === "SEND_LINK") {
      if (!step.template) {
        await notifyOps("Link de pós-venda ausente", "SEND_LINK sem template. Nenhum URL foi inventado.");
        return state;
      }
      await sendApprovedTemplate(conversationId, step.template);
      await advanceWorkflow(state.executionId);
      continue;
    }
    if (step.type === "COMPLETE") {
      await advanceWorkflow(state.executionId);
      return getWorkflowState(conversationId);
    }
    if (step.type === "WAIT_CUSTOMER" || step.type === "REQUEST_DATA" || step.type === "REQUEST_DOCUMENT") {
      return state;
    }
    await notifyOps(
      "Passo de workflow sem handler",
      `Tipo ${step.type} não é executado automaticamente. Operação deve avançar manualmente.`,
    );
    return state;
  }
  return getWorkflowState(conversationId);
}

export async function processDueFollowUps(now = new Date()) {
  const due = await prisma.followUp.findMany({
    where: { cancelled: false, sentAt: null, dueAt: { lte: now } },
    take: 50,
  });

  for (const item of due) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: item.conversationId },
        select: { lastInboundAt: true },
      });
      const scheduledAt = new Date(item.dueAt.getTime() - item.delayMinutes * 60_000);
      if (shouldCancelFollowUp(conversation?.lastInboundAt, scheduledAt)) {
        await prisma.followUp.update({ where: { id: item.id }, data: { cancelled: true } });
        continue;
      }

      const attempts = item.attempts + 1;
      const followupName = item.templateName ? `${item.templateName}_followup` : null;
      if (followupName) {
        const result = await sendApprovedTemplate(item.conversationId, followupName);
        if (!result.sent) {
          await notifyOps(
            "Follow-up sem template",
            `Follow-up da conversa ${item.conversationId} sem template aprovado "${followupName}". Operador deve agir.`,
            "/inbox",
          );
        }
      } else {
        await notifyOps("Follow-up pendente", `Cliente sem resposta no estágio ${item.stage}.`, "/inbox");
      }

      const patch = nextFollowUpPatch(attempts, item.maxAttempts, now, item.delayMinutes);
      await prisma.followUp.update({
        where: { id: item.id },
        data: {
          attempts: patch.attempts,
          sentAt: patch.sentAt,
          cancelled: patch.cancelled,
          ...(patch.dueAt ? { dueAt: patch.dueAt } : {}),
        },
      });
    } catch (error) {
      logError("post_sale.followup_failed", { id: item.id, message: String(error) });
    }
  }
  return due.length;
}

let tickRunning = false;

export async function runPostSaleTick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
  const active = await prisma.workflowExecution.findMany({
    where: { status: "ACTIVE", conversationId: { not: null } },
    take: 40,
  });
  for (const execution of active) {
    if (execution.conversationId) {
      try {
        await progressApprovedSaleWorkflow(execution.conversationId, { skipOperatorWait: false });
      } catch (error) {
        logError("post_sale.workflow_failed", { id: execution.id, message: String(error) });
      }
    }
  }
  await processDueFollowUps();
  } finally {
    tickRunning = false;
  }
}
