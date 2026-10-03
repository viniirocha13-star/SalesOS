import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/template-editor";
import { requireOrg } from "@/lib/org";

export default async function NewTemplatePage() {
  await requireOrg("templates.write");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="Modelos"
        title="Novo modelo de mensagem"
        description="Editor com preview. Validador local antes do envio. A Meta decide aprovação e categoria final."
      />
      <TemplateEditor />
    </div>
  );
}
