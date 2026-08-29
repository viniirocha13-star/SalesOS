import { prisma } from "@/lib/prisma";

export const WORKFLOW_STEP_TYPES = [
  "SEND_MESSAGE",
  "WAIT_CUSTOMER",
  "WAIT_OPERATOR",
  "REQUEST_DATA",
  "REQUEST_DOCUMENT",
  "SEND_LINK",
  "COMPLETE",
] as const;

export async function startWorkflow(name: string, conversationId?: string, leadId?: string) {
  const workflow = await prisma.workflow.findFirst({
    where: { name },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!workflow) return null;
  return prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      conversationId,
      leadId,
      status: "ACTIVE",
      currentOrder: workflow.steps[0]?.order ?? 0,
    },
  });
}

export async function getWorkflowState(conversationId: string) {
  const execution = await prisma.workflowExecution.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
  });
  if (!execution) return null;
  const workflow = await prisma.workflow.findUnique({
    where: { id: execution.workflowId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const step = workflow?.steps.find((s) => s.order === execution.currentOrder) ?? workflow?.steps[0];
  return {
    executionId: execution.id,
    workflow: workflow?.name,
    status: execution.status,
    current: step
      ? { name: step.name, type: step.type, order: step.order, template: step.template }
      : null,
    // Links só vêm de passo cadastrado — a IA não inventa URL.
    approvedLink: step?.type === "SEND_LINK" ? step.template : null,
  };
}

export async function advanceWorkflow(executionId: string) {
  const execution = await prisma.workflowExecution.findUniqueOrThrow({ where: { id: executionId } });
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: execution.workflowId },
    orderBy: { order: "asc" },
  });
  const next = steps.find((s) => s.order > execution.currentOrder);
  if (!next) {
    return prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "COMPLETE", currentOrder: execution.currentOrder },
    });
  }
  return prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      currentOrder: next.order,
      status: next.type === "COMPLETE" ? "COMPLETE" : "ACTIVE",
    },
  });
}
