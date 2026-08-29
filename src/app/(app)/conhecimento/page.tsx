import { prisma } from "@/lib/prisma";
import { KnowledgeForm } from "@/components/knowledge-form";
import { Badge } from "@/components/ui/badge";

export default async function ConhecimentoPage() {
  const docs = await prisma.knowledgeDocument.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Base de conhecimento</h1>
        <p className="text-sm text-zinc-500">Versionada. A IA só usa documentos aprovados via RAG — nunca conhecimento geral no lugar de regra comercial.</p>
      </div>
      <KnowledgeForm />
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">{d.title}</h2>
              <Badge>{d.type}</Badge>
              <Badge variant={d.approved ? "secondary" : "destructive"}>v{d.version}</Badge>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{d.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
