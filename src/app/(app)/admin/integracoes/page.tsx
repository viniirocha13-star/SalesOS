import { prisma } from "@/lib/prisma";
import { openaiConfigured } from "@/lib/ai-models";
import { Badge } from "@/components/ui/badge";

export default async function IntegracoesPage() {
  const rows = await prisma.integration.findMany();
  const cards = [
    { slug: "whatsapp", name: "WhatsApp Cloud API", ok: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) },
    { slug: "openai", name: "OpenAI", ok: openaiConfigured() },
    { slug: "viability", name: "Viabilidade", ok: process.env.VIABILITY_PROVIDER === "internal" },
    { slug: "meta", name: "Meta Ads", ok: Boolean(process.env.META_APP_ID) },
    { slug: "google", name: "Google Ads", ok: Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID) },
    { slug: "storage", name: "Storage S3", ok: Boolean(process.env.S3_BUCKET) },
    { slug: "redis", name: "Redis / fila", ok: Boolean(process.env.REDIS_URL) },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Administração · Integrações</h1>
      <p className="text-sm text-zinc-500">Secrets nunca aparecem aqui. Sem credencial: NOT_CONFIGURED. Mock só em desenvolvimento.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.slug} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{c.name}</h2>
              <Badge variant={c.ok ? "secondary" : "outline"}>{c.ok ? "CONNECTED" : "NOT_CONFIGURED"}</Badge>
            </div>
            <p className="mt-2 text-xs text-zinc-500">slug: {c.slug} · persistido: {rows.find((r) => r.slug === c.slug)?.status ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
