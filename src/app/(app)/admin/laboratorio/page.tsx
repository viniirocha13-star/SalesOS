import Link from "next/link";
import { openaiConfigured, aiModelFor } from "@/lib/ai-models";

export default async function LaboratorioPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Laboratório IA</h1>
      <p className="text-sm text-zinc-500">
        O simulador em Conversas usa o mesmo orquestrador de produção, só troca o transporte.{" "}
        {openaiConfigured() ? (
          <>
            LLM: OPENAI · TERRA {aiModelFor("SALES")} · SOL {aiModelFor("COMPLEX")} · LUNA {aiModelFor("UTILITY")}
          </>
        ) : (
          <>LLM: DevMockLlmProvider (sem OPENAI_API_KEY)</>
        )}
      </p>
      <p className="text-sm">
        Abra{" "}
        <Link className="text-orange-700 underline" href="/conversas">
          Conversas
        </Link>{" "}
        e inicie uma conversa simulada.
      </p>
    </div>
  );
}
