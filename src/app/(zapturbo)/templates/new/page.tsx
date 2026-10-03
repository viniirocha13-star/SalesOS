import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/template-editor";
import { ExternalHelp } from "@/components/external-help";
import { requireOrg } from "@/lib/org";
import { helpLinks } from "@/wa/help-links";

export default async function NewTemplatePage() {
  await requireOrg("templates.write");
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        kicker="Modelos"
        title="Novo modelo de mensagem"
        description="Editor com preview. Validador local antes do envio. A Meta decide aprovação e categoria final."
      />
      <ExternalHelp
        compact
        title="Escolha a categoria pelo conteúdo real da mensagem"
        intro="Marketing para promoções e reengajamento; Utilidade para atualizações de pedido ou relação existente; Autenticação para códigos. A Meta pode recategorizar — as regras oficiais estão aqui:"
        links={helpLinks(["templateCategories", "templates", "optIn"])}
      />
      <TemplateEditor />
    </div>
  );
}
