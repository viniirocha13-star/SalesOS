"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  ShoppingBag,
  Inbox,
  Megaphone,
  Tags,
  BookOpen,
  Map,
  Brain,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
} from "lucide-react";
import { logout } from "@/app/login/logout-action";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const NAV = [
  { href: "/home", label: "Agora", icon: Bell, perm: "operation.queue" },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, perm: "conversations.view" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/leads", label: "Leads", icon: Users, perm: "leads.view" },
  { href: "/conversas", label: "Laboratório", icon: Brain, perm: "conversations.simulate" },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag, perm: "sales.view" },
  { href: "/operacao", label: "Operação", icon: Inbox, perm: "operation.queue" },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, perm: "campaigns.view" },
  { href: "/ofertas", label: "Ofertas", icon: Tags, perm: "offers.view" },
  { href: "/conhecimento", label: "Conhecimento", icon: BookOpen, perm: "knowledge.view" },
  { href: "/mapa", label: "Mapa", icon: Map, perm: "map.view" },
  { href: "/supervisor", label: "Supervisor IA", icon: Brain, perm: "supervisor.view" },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, perm: "reports.view" },
  { href: "/admin", label: "Administração", icon: Settings, perm: "admin.audit" },
];

export function AppShell({
  user,
  queueCount,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  queueCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState<{ leads: { id: string; name: string | null; phone: string }[] } | null>(null);
  const items = NAV.filter((item) => can(user.role, item.perm));

  useEffect(() => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#0f3d38] text-white md:flex">
        <div className="px-5 py-5">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Brisanet</div>
          <div className="text-lg font-semibold">Brisa Sales AI</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-50/80 hover:bg-white/10",
                  active && "bg-white/15 font-medium text-white",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/operacao" && queueCount > 0 && (
                  <span className="rounded-full bg-orange-400 px-1.5 text-[11px] text-orange-950">{queueCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-emerald-100/80">
          <div className="font-medium text-white">{user.name}</div>
          <div>{user.role}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex items-center gap-3 border-b bg-white px-4 py-3">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg border md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-14 left-0 z-30 w-64 rounded-r-xl bg-[#0f3d38] p-3 text-white shadow-lg md:hidden">
              <nav aria-label="Menu móvel" className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded px-3 py-2 text-sm hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          <div className="relative max-w-xl flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-zinc-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca global: telefone, nome, oferta..."
              aria-label="Busca global"
              className="pl-8"
            />
            {results && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-white p-2 shadow-lg">
                {results.leads.length === 0 && <div className="p-2 text-sm text-zinc-500">Nenhum lead</div>}
                {results.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded px-2 py-1.5 text-sm hover:bg-zinc-50">
                    {lead.name ?? "Sem nome"} · {lead.phone}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/operacao" title="Pendências" className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-zinc-100">
              <Bell className="size-4" />
            </Link>
          <form action={logout}>
            <button type="submit" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-zinc-100">
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
