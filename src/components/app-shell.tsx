"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  ShoppingBag,
  Inbox,
  Tags,
  BookOpen,
  Brain,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  Plug,
  Hexagon,
  SlidersHorizontal,
} from "lucide-react";
import { logout } from "@/app/login/logout-action";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { can, ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const MAIN: { href: string; label: string; icon: typeof Bell; perm: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, perm: "conversations.view" },
  { href: "/leads", label: "Leads", icon: Users, perm: "leads.view" },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag, perm: "sales.view" },
  { href: "/ofertas", label: "Ofertas", icon: Tags, perm: "offers.view" },
  { href: "/home", label: "Tarefas", icon: Inbox, perm: "operation.queue" },
  { href: "/operacao", label: "Operação", icon: Inbox, perm: "operation.queue" },
  { href: "/conversas", label: "Laboratório", icon: Brain, perm: "conversations.simulate" },
  { href: "/conhecimento", label: "Books", icon: BookOpen, perm: "knowledge.view" },
  { href: "/supervisor", label: "Casos de suporte", icon: SlidersHorizontal, perm: "supervisor.view" },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, perm: "reports.view" },
];

const ADMIN: { href: string; label: string; icon: typeof Bell; perm: string }[] = [
  { href: "/admin/diagnostico", label: "Diagnóstico", icon: SlidersHorizontal, perm: "admin.audit" },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug, perm: "admin.audit" },
  { href: "/admin", label: "Usuários", icon: Users, perm: "admin.users" },
  { href: "/admin", label: "Configurações", icon: Settings, perm: "admin.audit" },
];

export function AppShell({
  user,
  queueCount,
  inboxCount,
  whatsapp,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  queueCount: number;
  inboxCount: number;
  whatsapp: "connected" | "error" | "mock";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState<{ leads: { id: string; name: string | null; phone: string }[] } | null>(null);
  const main = MAIN.filter((item) => can(user.role, item.perm));
  const admin = ADMIN.filter((item) => can(user.role, item.perm));
  const items = [...main, ...admin];

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
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal text-white">
            <Hexagon className="size-5" />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">Sales OS</div>
            <div className="text-[11px] text-slate-400">Brisa Sales</div>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Principal">
          <div className="space-y-0.5">
            {main.map((item) => (
              <NavLink
                key={item.href + item.label}
                item={item}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
                badge={item.href === "/inbox" ? inboxCount : item.href === "/operacao" ? queueCount : 0}
              />
            ))}
          </div>
          {admin.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Administração</p>
              <div className="space-y-0.5">
                {admin.map((item) => (
                  <NavLink
                    key={item.label}
                    item={item}
                    active={item.href !== "/admin" && (pathname === item.href || pathname.startsWith(item.href + "/"))}
                    badge={0}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>
        <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[12px] font-medium text-slate-700">Integração WhatsApp</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                whatsapp === "connected" ? "bg-emerald-500" : whatsapp === "error" ? "bg-red-500" : "bg-amber-400",
              )}
            />
            {whatsapp === "connected" ? "Conectado" : whatsapp === "error" ? "Erro" : "Mock local"}
          </p>
          <Link href="/admin/integracoes" className="mt-2 block text-center text-[12px] font-medium text-teal hover:underline">
            Ir para Admin
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-14 left-0 z-30 w-72 rounded-r-2xl border bg-white p-3 shadow-xl md:hidden">
              <nav aria-label="Menu móvel" className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar conversa ou cliente..."
              aria-label="Busca global"
              className="h-10 rounded-xl bg-slate-50 pl-9"
            />
            {results && (
              <div className="surface absolute z-20 mt-2 w-full p-2">
                {results.leads.length === 0 && <div className="p-3 text-sm text-slate-500">Nenhum lead</div>}
                {results.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    {lead.name ?? "Sem nome"} · {lead.phone}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/operacao" title="Pendências" className="relative inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50">
            <Bell className="size-4" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">{queueCount}</span>
            )}
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-teal/15 text-sm font-semibold text-teal">
              {(user.name ?? "U").slice(0, 1)}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-[11px] text-slate-400">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-sm text-slate-500 hover:bg-slate-50">
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  badge,
}: {
  item: { href: string; label: string; icon: typeof Bell };
  active: boolean;
  badge: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] text-slate-600 hover:bg-slate-50",
        active && "bg-[#e6f7f3] font-medium text-teal",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-teal text-white" : "bg-slate-200 text-slate-700")}>
          {badge}
        </span>
      )}
    </Link>
  );
}
