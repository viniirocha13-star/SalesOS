import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { buildImproveOfferTextPrompt, isOpenAiConfigured } from "@/lib/plim/ai-text";
import { getLlmProvider } from "@/integrations/llm/provider";

const bodySchema = z.object({
  productName: z.string().min(1),
  currentPrice: z.number().optional().nullable(),
  discountPercent: z.number().optional().nullable(),
  category: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimWrite(ctx.profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada no servidor. O botão MELHORAR COM IA ficará indisponível até configurar a chave." },
      { status: 503 },
    );
  }
  const input = bodySchema.parse(await req.json());
  const prompt = buildImproveOfferTextPrompt(input);
  const llm = getLlmProvider();
  const reply = await llm.complete({
    messages: [{ role: "user", content: prompt }],
    tools: [],
    purpose: "UTILITY",
  });
  const text = reply.content?.trim();
  if (!text) return NextResponse.json({ error: "Resposta vazia do modelo" }, { status: 502 });
  return NextResponse.json({ text });
}
