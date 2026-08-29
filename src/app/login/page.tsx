import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Hexagon } from "lucide-react";

export default function LoginPage() {
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
            Inbox, fila e conversa
            <br />
            no mesmo lugar.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
            A IA conversa. O time vê o que chegou, o que espera resposta e o que precisa de humano.
          </p>
        </div>
        <p className="text-sm text-slate-400">Sem roteiro. Sem desconto inventado.</p>
      </div>
      <div className="flex items-center justify-center bg-white p-6 md:p-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
