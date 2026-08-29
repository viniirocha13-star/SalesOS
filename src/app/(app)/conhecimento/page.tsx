import { prisma } from "@/lib/prisma";
import { KnowledgeForm } from "@/components/knowledge-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export default async function ConhecimentoPage() {
  const session = await auth();
  const canWrite = session?.user ? can(session.user.role as Role, "knowledge.write") : false;
  const docs = await prisma.knowledgeDocument.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div className="space-y-4">
      <PageHeader
        title="Base de conhecimento"
        description="Versionada. A IA só usa o que está aprovado — nunca regra inventada."
      />
      {canWrite ? <KnowledgeForm /> : <p className="text-sm text-ink/50">Somente supervisor/admin publica documentos.</p>}
      <div className="space-y-3">
        {!docs.length && <p className="surface p-5 text-sm text-ink/50">Nenhum documento ainda. Sem conteúdo aprovado a IA não inventa regra.</p>}
        {docs.map((d) => (
          <div key={d.id} className="surface p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl">{d.title}</h2>
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
