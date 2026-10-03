"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Megaphone,
  Users,
  MessageSquareText,
  MessageCircle,
  CalendarClock,
  BarChart3,
  Plug,
  UsersRound,
  CreditCard,
  Settings,
  HelpCircle,
  Bell,
  Plus,
  Menu,
  LogOut,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/login/logout-action";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/visao-geral", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conectar", label: "Conectar WhatsApp", icon: Smartphone },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/conversations", label: "Conversas", icon: MessageCircle },
  { href: "/templates", label: "Modelos de mensagem", icon: MessageSquareText },
  { href: "/schedules", label: "Agendamentos", icon: CalendarClock },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings/integrations", label: "Integrações", icon: Plug },
  { href: "/settings/team", label: "Equipe", icon: UsersRound },
  { href: "/settings/billing", label: "Faturamento", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export type ZapTurboShellProps = {
  user: { name?: string | null; email?: string | null };
  organization: { id: string; name: string };
  memberships: { organizationId: string; name: string }[];
  plan?: { name: string; used: number; limit: number } | null;
  metaConnected?: boolean;
  children: React.ReactNode;
};

export function ZapTurboShell({
  user,
  organization,
  memberships,
  plan,
  metaConnected,
  children,
}: ZapTurboShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const firstName = (user.name ?? "Cliente").split(" ")[0];
  const usagePct = plan && plan.limit > 0 ? Math.min(100, Math.round((plan.used / plan.limit) * 100)) : 0;

  async function switchOrg(organizationId: string) {
    setOrgOpen(false);
    await fetch("/api/organizations/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    router.refresh();
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f3f5f7] text-slate-900">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-[#0b1f17] text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#1fad6c] shadow-[0_0_0_4px_rgba(31,173,108,0.2)]">
            <Zap className="size-5 fill-white text-white" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold tracking-tight">ZapTurbo</div>
            <div className="truncate text-[11px] text-white/55">Automação Oficial para WhatsApp</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Principal">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/settings" && pathname.startsWith(item.href + "/")) ||
              (item.href === "/settings" && pathname === "/settings");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-white/70 transition-colors hover:bg-white/5 hover:text-white",
                  active && "bg-[#1fad6c] font-medium text-white shadow-sm hover:bg-[#1fad6c]",
                )}
              >
                <Icon className="size-[18px] shrink-0 opacity-90" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-white/90">{plan?.name ?? "Plano Starter"}</p>
            <span
              className={cn(
                "size-2 rounded-full",
                metaConnected ? "bg-[#1fad6c]" : "bg-amber-400",
              )}
              title={metaConnected ? "Meta conectada" : "Meta pendente"}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/50">
            {(plan?.used ?? 0).toLocaleString("pt-BR")} / {(plan?.limit ?? 5000).toLocaleString("pt-BR")} msgs
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#1fad6c]" style={{ width: `${usagePct}%` }} />
          </div>
          <Link
            href="/settings/billing"
            className="mt-3 flex h-9 items-center justify-center rounded-xl bg-[#1fad6c] text-[12px] font-semibold text-white hover:bg-[#18965c]"
          >
            Fazer upgrade
          </Link>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-3 md:px-6">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>

          {menuOpen && (
            <div className="absolute top-14 left-0 z-40 max-h-[80dvh] w-72 overflow-y-auto rounded-r-2xl bg-[#0b1f17] p-3 text-white shadow-xl md:hidden">
              <nav className="space-y-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900 md:text-xl">
              Olá, {firstName}! 👋
            </h1>
            <p className="truncate text-[12px] text-slate-500 md:text-[13px]">
              Aqui está o resumo das suas campanhas no WhatsApp hoje
            </p>
          </div>

          <Link
            href="/campaigns/new"
            className="hidden h-10 items-center gap-1.5 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c] sm:inline-flex"
          >
            <Plus className="size-4" />
            Nova campanha
          </Link>

          <Link
            href="/onboarding"
            title="Ajuda / passo a passo"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <HelpCircle className="size-4" />
          </Link>
          <Link
            href="/visao-geral"
            title="Notificações"
            className="relative inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <Bell className="size-4" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOrgOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pr-2 pl-1.5 hover:bg-slate-50"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-[#1fad6c]/15 text-sm font-semibold text-[#148a52]">
                {(user.name ?? "U").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] text-left leading-tight lg:block">
                <span className="block truncate text-[13px] font-medium">{user.name}</span>
                <span className="block truncate text-[11px] text-slate-400">{organization.name}</span>
              </span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>
            {orgOpen && (
              <div className="absolute top-12 right-0 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Empresas
                </p>
                {memberships.map((m) => (
                  <button
                    key={m.organizationId}
                    type="button"
                    onClick={() => void switchOrg(m.organizationId)}
                    className={cn(
                      "flex w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50",
                      m.organizationId === organization.id && "bg-[#e8f8f0] font-medium text-[#148a52]",
                    )}
                  >
                    {m.name}
                  </button>
                ))}
                <Link
                  href="/onboarding"
                  className="mt-1 block rounded-lg px-2 py-2 text-sm text-[#148a52] hover:bg-slate-50"
                  onClick={() => setOrgOpen(false)}
                >
                  Passo a passo / nova empresa
                </Link>
                <form action={logout} className="border-t border-slate-100 pt-1">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut className="size-3.5" />
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
