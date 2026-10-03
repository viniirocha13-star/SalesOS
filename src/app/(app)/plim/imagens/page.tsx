import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext, ensurePlimSettings } from "@/lib/plim/tenant-context";
import { ImageLibraryEditor } from "@/components/plim/image-library-editor";
import { getStorageProvider } from "@/lib/storage";
import { isOpenAiConfigured } from "@/lib/plim/ai-text";

export default async function PlimImagensPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const settings = await ensurePlimSettings(ctx.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Biblioteca de Imagens</h1>
        <p className="text-sm text-slate-500">
          Editor local com templates e logo do workspace. Use também{" "}
          <code className="text-xs">src/lib/plim/ai-text.ts</code> via API{" "}
          <code className="text-xs">/api/plim/ai/improve-text</code> no editor de ofertas.
        </p>
      </div>
      <ImageLibraryEditor
        aiConfigured={isOpenAiConfigured()}
        imageAiConfigured={isOpenAiConfigured()}
        brand={{
          logoPath: settings.logoPath ? getStorageProvider().getPublicUrl(settings.logoPath) : null,
          logoMargin: settings.logoMargin,
          logoSize: settings.logoSize,
          logoOpacity: settings.logoOpacity,
          brandColor: settings.brandColor,
        }}
      />
    </div>
  );
}
