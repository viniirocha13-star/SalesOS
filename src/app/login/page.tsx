import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-[#f3f5f7] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b1f17] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(31,173,108,0.35),transparent_55%)]" />
        <div className="relative flex items-center gap-3 text-white">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#1fad6c]">
            <Zap className="size-5 fill-white text-white" />
          </span>
          <div>
            <div className="text-[17px] font-semibold">ZapTurbo</div>
            <div className="text-[11px] text-white/55">Automação Oficial para WhatsApp</div>
          </div>
        </div>
        <div className="relative text-white">
          <p className="max-w-md text-4xl font-semibold tracking-tight">
            Contatos, templates e campanhas no mesmo painel.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/65">
            Conecte a Meta, importe sua lista autorizada e acompanhe envio, entrega, leitura e
            respostas — sem Postman, Baserow ou n8n.
          </p>
        </div>
        <p className="relative text-sm text-white/40">Passo a passo guiado para quem adquiriu o SaaS.</p>
      </div>
      <div className="flex items-center justify-center bg-white p-6 md:p-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
