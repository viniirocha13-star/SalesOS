import { MetaConnectPanel } from "@/components/meta-connect-panel";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { CredentialVault } from "@/lib/credential-vault";

export default async function SettingsMetaPage() {
  const ctx = await requireOrg("meta.view");
  const [meta, phones, wabas] = await Promise.all([
    prisma.metaConnection.findUnique({ where: { organizationId: ctx.organization.id } }),
    prisma.phoneNumber.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ isDefault: "desc" }, { displayPhoneNumber: "asc" }],
    }),
    prisma.whatsAppBusinessAccount.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const canManage = ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.isSuperAdmin;
  const tokenOk = CredentialVault.validate(meta?.encryptedAccessToken);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="Conectar WhatsApp"
        title="Integração Meta"
        description="Embedded Signup e sincronização automática. Você não copia WABA ID, Phone Number ID nem token."
      />
      <MetaConnectPanel
        canManage={canManage}
        connection={{
          status: meta?.status ?? "NOT_CONNECTED",
          businessName: meta?.businessName,
          businessId: meta?.businessId,
          tokenSource: meta?.tokenSource,
          lastSyncedAt: meta?.lastSyncedAt?.toISOString() ?? null,
          lastError: meta?.lastError,
          tokenValid: tokenOk,
          tokenExpiresAt: meta?.tokenExpiresAt?.toISOString() ?? null,
        }}
        wabas={wabas.map((w) => ({
          id: w.id,
          wabaId: w.wabaId,
          name: w.name,
          subscribedApp: w.subscribedApp,
        }))}
        phones={phones.map((p) => ({
          id: p.id,
          displayPhoneNumber: p.displayPhoneNumber,
          verifiedName: p.verifiedName,
          status: p.status,
          qualityRating: p.qualityRating,
          messagingLimitTier: p.messagingLimitTier,
          isDefault: p.isDefault,
        }))}
        embeddedSignup={{
          appId: process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || "",
          configId: process.env.NEXT_PUBLIC_META_CONFIG_ID || process.env.META_CONFIG_ID || "",
          configured: Boolean(
            (process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID) &&
              (process.env.NEXT_PUBLIC_META_CONFIG_ID || process.env.META_CONFIG_ID),
          ),
        }}
      />
    </div>
  );
}
