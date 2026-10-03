"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { logout } from "@/app/login/logout-action";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { can } from "@/lib/rbac";
import { PLIM_NAV, canPlim } from "@/lib/plim/rbac";
import { PLIM_PROFILE_LABEL, resolvePlimProfile } from "@/lib/plim/profile";
import type { PlimProfile, Role } from "@prisma/client";
import { PlimGlobalStatus } from "@/components/plim/global-status";

const SALES_OS: { href: string; label: string; perm: string }[] = [
  { href: "/dashboard", label: "Dashboard Sales", perm: "dashboard.view" },
  { href: "/home", label: "Tarefas", perm: "operation.queue" },
  { href: "/inbox", label: "Inbox", perm: "conversations.view" },
  { href: "/leads", label: "Leads", perm: "leads.view" },
  { href: "/ofertas", label: "Book de Ofertas", perm: "offers.view" },
  { href: "/vendas", label: "Vendas", perm: "sales.view" },
  { href: "/pos-venda", label: "Pós-venda", perm: "sales.view" },
  { href: "/operacao", label: "Operação", perm: "operation.queue" },
  { href: "/conversas", label: "Laboratório", perm: "conversations.simulate" },
  { href: "/conhecimento", label: "Books", perm: "knowledge.view" },
  { href: "/relatorios", label: "Relatórios", perm: "reports.view" },
];

export function PlimAppShell({
  user,
  plimProfile,
  testMode,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  plimProfile: PlimProfile;
  testMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = resolvePlimProfile(user.role, plimProfile);
  const plimItems = PLIM_NAV.filter((item) => canPlim(profile, item.permission));
  const salesItems = SALES_OS.filter((item) => can(user.role, item.perm));
  const inPlim = pathname === "/plim" || pathname.startsWith("/plim/");

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      onClick={() => setMenuOpen(false)}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-slate-600 hover:bg-violet-50",
        active && "bg-violet-100 font-medium text-violet-900",
      )}
    >
      <span className="flex-1">{label}</span>
    </Link>
  );

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f6f4fb]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-violet-100 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200">
            <Sparkles className="size-5" />
          </span>
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-violet-950">PLIM AUTOMAÇÃO</div>
            <div className="text-[10px] font-medium text-violet-500">PLIM PROMOS</div>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4" aria-label="PLIM">
          <div>
            <p className="mb-1 px-2 text-[10px] font-semibold tracking-widest text-violet-400 uppercase">Operação</p>
            <div className="space-y-0.5">
              {plimItems.map((item) =>
                navLink(item.href, item.label, pathname === item.href || pathname.startsWith(item.href + "/")),
              )}
            </div>
          </div>
          {salesItems.length > 0 && (
            <div>
              <p className="mb-1 px-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Sales OS</p>
              <div className="space-y-0.5">
                {salesItems.map((item) =>
                  navLink(item.href, item.label, pathname === item.href || pathname.startsWith(item.href + "/")),
                )}
              </div>
            </div>
          )}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-violet-100 bg-white px-4 py-3 md:px-5">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-violet-100 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-14 left-0 z-40 max-h-[70vh] w-72 overflow-y-auto rounded-r-2xl border border-violet-100 bg-white p-3 shadow-xl md:hidden">
              <p className="mb-2 text-xs font-semibold text-violet-600">PLIM</p>
              {plimItems.map((item) => navLink(item.href, item.label, false))}
              <p className="mt-4 mb-2 text-xs font-semibold text-slate-500">Sales OS</p>
              {salesItems.map((item) => navLink(item.href, item.label, false))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {inPlim ? "PLIM — Central de automação" : "Sales OS"}
            </p>
          </div>
          <PlimGlobalStatus testMode={testMode} />
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">
              {(user.name ?? "U").slice(0, 1)}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-[11px] text-slate-400">{PLIM_PROFILE_LABEL[profile]}</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-sm text-slate-500 hover:bg-slate-50">
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
