import { Hexagon } from "lucide-react";
import { lookupInviteBySecret } from "@/lib/invite";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import Link from "next/link";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invite: { email: string | null; name: string | null; role: string } | null = null;
  try {
    invite = await lookupInviteBySecret(decodeURIComponent(token));
  } catch {
    invite = null;
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal text-white">
            <Hexagon className="size-5" />
          </span>
          <div>
            <div className="text-[15px] font-semibold">Sales OS</div>
            <div className="text-[11px] text-slate-400">Brisa Sales</div>
          </div>
        </div>
        <div>
          <p className="text-4xl font-semibold tracking-tight text-slate-900">
            Um link.
            <br />
            Acesso ao time.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
            O convite mágico vale 72 horas e só entra quem a administração convidou.
          </p>
        </div>
        <p className="text-sm text-slate-400">Sem senha compartilhada.</p>
      </div>
      <div className="flex items-center justify-center bg-white p-6 md:p-12">
        {invite ? (
          <AcceptInviteForm
            token={decodeURIComponent(token)}
            lockedEmail={invite.email}
            suggestedName={invite.name}
            role={invite.role}
          />
        ) : (
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Convite inválido</h1>
            <p className="mt-3 text-slate-500">Este link já foi usado, expirou ou foi revogado.</p>
            <Link className="mt-6 inline-block text-teal underline" href="/login">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
