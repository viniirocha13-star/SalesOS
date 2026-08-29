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

const GROUPS: { title: string; items: { href: string; label: string; icon: typeof Bell; perm: string }[] }[] = [
  {
    title: "Agora",
    items: [
      { href: "/home", label: "Agora", icon: Bell, perm: "operation.queue" },
      { href: "/inbox", label: "Inbox", icon: MessageCircle, perm: "conversations.view" },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
    ],
  },
  {
    title: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: Users, perm: "leads.view" },
      { href: "/conversas", label: "Laboratório", icon: Brain, perm: "conversations.simulate" },
      { href: "/vendas", label: "Vendas", icon: ShoppingBag, perm: "sales.view" },
      { href: "/operacao", label: "Operação", icon: Inbox, perm: "operation.queue" },
      { href: "/ofertas", label: "Ofertas", icon: Tags, perm: "offers.view" },
    ],
  },
  {
    title: "Casa",
    items: [
      { href: "/campanhas", label: "Campanhas", icon: Megaphone, perm: "campaigns.view" },
      { href: "/conhecimento", label: "Conhecimento", icon: BookOpen, perm: "knowledge.view" },
      { href: "/mapa", label: "Mapa", icon: Map, perm: "map.view" },
      { href: "/supervisor", label: "Supervisor IA", icon: Brain, perm: "supervisor.view" },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3, perm: "reports.view" },
      { href: "/admin", label: "Administração", icon: Settings, perm: "admin.audit" },
    ],
  },
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
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => can(user.role, item.perm)),
  })).filter((g) => g.items.length);
  const items = groups.flatMap((g) => g.items);

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
    <div className="flex min-h-screen">
      <aside className="hidden w-[17.5rem] shrink-0 flex-col bg-espresso text-[#f6efe6] md:flex">
        <div className="px-6 pt-8 pb-6">
          <p className="text-[11px] tracking-[0.28em] text-terracotta uppercase">Brisanet</p>
          <p className="font-heading mt-1 text-[1.65rem] leading-none text-[#faf4ea]">Brisa</p>
          <p className="mt-1 text-sm text-[#f6efe6]/55">Vendas com conversa</p>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-6" aria-label="Principal">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] tracking-[0.2em] text-[#f6efe6]/35 uppercase">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14.5px] text-[#f6efe6]/70 transition-colors hover:bg-white/10 hover:text-[#faf4ea]",
                        active && "bg-[#c45c26] text-white shadow-[0_8px_24px_rgba(196,92,38,0.25)]",
                      )}
                    >
                      <Icon className="size-4 opacity-80" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/operacao" && queueCount > 0 && (
                        <span className="rounded-full bg-[#faf4ea] px-1.5 text-[10px] font-medium text-espresso">{queueCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-6 py-5">
          <div className="font-heading text-lg text-[#faf4ea]">{user.name}</div>
          <div className="text-xs tracking-wide text-[#f6efe6]/45 uppercase">{user.role}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex items-center gap-3 px-4 py-4 md:px-8">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-[#e0d5c6] bg-cream md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-16 left-0 z-30 w-72 rounded-r-3xl bg-espresso p-4 text-[#f6efe6] shadow-2xl md:hidden">
              <nav aria-label="Menu móvel" className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          <div className="relative max-w-lg flex-1">
            <Search className="absolute top-3 left-3.5 size-4 text-ink/35" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, telefone, oferta…"
              aria-label="Busca global"
              className="h-11 rounded-full border-[#e0d5c6] bg-cream/80 pl-10"
            />
            {results && (
              <div className="surface absolute z-20 mt-2 w-full p-2">
                {results.leads.length === 0 && <div className="p-3 text-sm text-ink/50">Nenhum lead</div>}
                {results.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-[#efe6d9]">
                    {lead.name ?? "Sem nome"} · {lead.phone}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/operacao"
            title="Pendências"
            className="inline-flex size-11 items-center justify-center rounded-full border border-[#e0d5c6] bg-cream hover:bg-white"
          >
            <Bell className="size-4" />
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink/70 hover:bg-cream"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 pb-12 md:px-8">{children}</main>
      </div>
    </div>
  );
}
