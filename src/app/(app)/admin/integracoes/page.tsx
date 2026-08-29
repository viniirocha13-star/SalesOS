import { prisma } from "@/lib/prisma";
import { openaiConfigured, aiModelFor } from "@/lib/ai-models";
import { Badge } from "@/components/ui/badge";
import { maskId } from "@/integrations/whatsapp/provider";
import { IntegrationTestButton } from "@/components/integration-test-button";
import { formatDateTime } from "@/lib/format";

export default async function IntegracoesPage() {
  const [rows, lastWebhook, lastOutbound, lastAi] = await Promise.all([
    prisma.integration.findMany(),
    prisma.whatsAppInboundEvent.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.message.findFirst({
      where: { direction: "OUTBOUND", providerMessageId: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aIExecution.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const waToken = Boolean(process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN);
  const waPhone = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const waRow = rows.find((r) => r.slug === "whatsapp");
  const waStatus = waRow?.status ?? (waToken && waPhone ? "CONNECTED" : "NOT_CONFIGURED");
  const aiRow = rows.find((r) => r.slug === "openai");
  const aiStatus = aiRow?.status ?? (openaiConfigured() ? "CONNECTED" : "NOT_CONFIGURED");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Administração · Integrações</h1>
      <p className="text-sm text-zinc-500">Tokens e API keys nunca aparecem nesta tela.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">WhatsApp Cloud API</h2>
            <Badge variant={waStatus === "CONNECTED" ? "secondary" : "outline"}>{waStatus}</Badge>
          </div>
          <p className="text-sm">Phone Number ID: {maskId(process.env.WHATSAPP_PHONE_NUMBER_ID)}</p>
          <p className="text-sm">Business Account ID: {maskId(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID)}</p>
          <p className="text-xs text-zinc-500">Último webhook: {formatDateTime(lastWebhook?.createdAt)}</p>
          <p className="text-xs text-zinc-500">Último envio: {formatDateTime(lastOutbound?.createdAt)} · {lastOutbound?.status ?? "—"}</p>
          {waRow?.lastError && <p className="text-xs text-red-600">Erro: {waRow.lastError}</p>}
          <IntegrationTestButton slug="whatsapp" />
        </div>
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">OpenAI</h2>
            <Badge variant={aiStatus === "CONNECTED" ? "secondary" : "outline"}>{aiStatus}</Badge>
          </div>
          <p className="text-sm">Modelo sales: {aiModelFor("SALES")}</p>
          <p className="text-sm">Modelo utility: {aiModelFor("UTILITY")}</p>
          <p className="text-xs text-zinc-500">
            Última chamada: {formatDateTime(lastAi?.createdAt)} · {lastAi?.model ?? "—"} · tokens in/out {lastAi?.inputTokens ?? "—"}/{lastAi?.outputTokens ?? "—"}
          </p>
          {aiRow?.lastError && <p className="text-xs text-red-600">Erro recente: {aiRow.lastError}</p>}
          <IntegrationTestButton slug="openai" />
        </div>
      </div>
    </div>
  );
}
