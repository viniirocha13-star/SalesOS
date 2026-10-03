import type { PlimProfile } from "@prisma/client";

const plimPermissions: Record<string, PlimProfile[]> = {
  "plim.dashboard": ["ADMIN", "OPERADOR", "VISUALIZADOR"],
  "plim.offers.write": ["ADMIN", "OPERADOR"],
  "plim.queue.write": ["ADMIN", "OPERADOR"],
  "plim.groups.write": ["ADMIN", "OPERADOR"],
  "plim.routes.write": ["ADMIN", "OPERADOR"],
  "plim.integrations.write": ["ADMIN", "OPERADOR"],
  "plim.settings": ["ADMIN"],
  "plim.settings.view": ["ADMIN", "OPERADOR", "VISUALIZADOR"],
  "plim.users": ["ADMIN"],
};

export function canPlim(profile: PlimProfile, permission: string): boolean {
  return plimPermissions[permission]?.includes(profile) ?? false;
}

export const PLIM_NAV: { href: string; label: string; permission: string }[] = [
  { href: "/plim", label: "Visão Geral", permission: "plim.dashboard" },
  { href: "/plim/ofertas", label: "Ofertas", permission: "plim.dashboard" },
  { href: "/plim/rotas", label: "Rotas", permission: "plim.dashboard" },
  { href: "/plim/piloto", label: "Piloto Automático", permission: "plim.dashboard" },
  { href: "/plim/agendamentos", label: "Agendamentos", permission: "plim.dashboard" },
  { href: "/plim/grupos", label: "Grupos e Canais", permission: "plim.dashboard" },
  { href: "/plim/whatsapp", label: "WhatsApp", permission: "plim.dashboard" },
  { href: "/plim/telegram", label: "Telegram", permission: "plim.dashboard" },
  { href: "/plim/instagram", label: "Instagram", permission: "plim.dashboard" },
  { href: "/plim/afiliados", label: "Afiliados", permission: "plim.dashboard" },
  { href: "/plim/conversor", label: "Conversor de Links", permission: "plim.dashboard" },
  { href: "/plim/editor", label: "Editor de Ofertas", permission: "plim.dashboard" },
  { href: "/plim/imagens", label: "Biblioteca de Imagens", permission: "plim.dashboard" },
  { href: "/plim/filas", label: "Filas", permission: "plim.dashboard" },
  { href: "/plim/comissoes", label: "Comissões", permission: "plim.dashboard" },
  { href: "/plim/cliques", label: "Cliques", permission: "plim.dashboard" },
  { href: "/plim/resultados", label: "Resultados", permission: "plim.dashboard" },
  { href: "/plim/contatos", label: "Contatos", permission: "plim.dashboard" },
  { href: "/plim/exclusoes", label: "Exclusões", permission: "plim.dashboard" },
  { href: "/plim/historico", label: "Histórico", permission: "plim.dashboard" },
  { href: "/plim/integracoes", label: "Integrações", permission: "plim.dashboard" },
  { href: "/plim/configuracoes", label: "Configurações", permission: "plim.settings.view" },
];
