import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOptionalOrgContext } from "@/lib/org";
import { getOnboardingProgress } from "@/wa/onboarding-progress";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { PageHeader } from "@/components/page-header";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?from=/onboarding");

  const ctx = await getOptionalOrgContext();

  if (!ctx) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <PageHeader
          kicker="Onboarding · Passo 2"
          title="Crie sua empresa"
          description="Workspace isolado para tokens, contatos, templates, campanhas e equipe. Depois conectamos a Meta sem você copiar IDs."
        />
        <CreateOrganizationForm />
        <p className="mt-6 text-sm text-slate-500">
          Já tem outra conta?{" "}
          <Link href="/login" className="font-medium text-teal hover:underline">
            Trocar usuário
          </Link>
        </p>
      </div>
    );
  }

  const progress = await getOnboardingProgress(ctx.organization.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <PageHeader
        kicker={`Empresa · ${ctx.organization.name}`}
        title="Começar a operar"
        description="Checklist do cliente que adquiriu o SaaS. Conclua na ordem — cada passo desbloqueia o próximo no painel."
        action={
          progress.readyForCampaigns ? (
            <Link
              href="/campaigns/new"
              className="inline-flex h-10 items-center rounded-xl bg-teal px-4 text-sm font-medium text-white hover:bg-[#0d8a77]"
            >
              Criar primeira campanha
            </Link>
          ) : undefined
        }
      />
      <OnboardingChecklist progress={progress} />
      <p className="mt-8 text-center text-xs text-slate-400">
        Guia completo: documentação interna <code className="rounded bg-slate-100 px-1">PASSO-A-PASSO-CLIENTE.md</code>
      </p>
    </div>
  );
}
