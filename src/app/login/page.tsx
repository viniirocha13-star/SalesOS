import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-espresso p-12 text-[#f6efe6] lg:flex">
        <div>
          <p className="text-[11px] tracking-[0.32em] text-terracotta uppercase">Brisanet</p>
          <p className="font-heading mt-4 text-5xl leading-[1.05] text-[#faf4ea]">
            Vender bem
            <br />
            começa na conversa.
          </p>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-[#f6efe6]/55">
          O modelo conversa. O time decide o que é verdade. Sem roteiro, sem desconto inventado.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
