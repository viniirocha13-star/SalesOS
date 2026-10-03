import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b3d36] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(15,159,138,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.2),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div>
            <p className="text-sm font-medium tracking-wide text-[#8dffc2]/80">ZapTurbo</p>
            <h2 className="mt-6 max-w-md text-4xl font-semibold leading-tight tracking-tight">
              Automação Oficial para WhatsApp
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
              Sem Postman, Baserow, n8n ou SSH. O passo a passo guia você da conta até a primeira
              campanha com status e respostas.
            </p>
          </div>
          <ol className="max-w-sm space-y-3 text-sm text-white/80">
            {[
              "Criar conta e empresa",
              "Conectar Meta e número",
              "Importar lista autorizada",
              "Template → campanha → métricas",
            ].map((item, i) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
