import { Badge } from "@/components/ui/badge";
import { PIPELINE_LABEL } from "@/domain/pipeline";
import type { LeadStatus, OfferStatus, PreSaleStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const leadTone: Record<string, string> = {
  NOVO: "bg-sky-100 text-sky-800",
  EM_ATENDIMENTO_IA: "bg-indigo-100 text-indigo-800",
  QUALIFICANDO: "bg-violet-100 text-violet-800",
  CONSULTANDO_VIABILIDADE: "bg-amber-100 text-amber-900",
  OFERTA_APRESENTADA: "bg-orange-100 text-orange-900",
  NEGOCIANDO: "bg-yellow-100 text-yellow-900",
  ACEITE_COMERCIAL: "bg-emerald-100 text-emerald-800",
  COLETANDO_DADOS: "bg-teal-100 text-teal-800",
  PRONTO_PARA_LANCAMENTO: "bg-orange-200 text-orange-950",
  EM_LANCAMENTO: "bg-blue-100 text-blue-800",
  PENDENCIA: "bg-red-100 text-red-800",
  CADASTRO_APROVADO: "bg-green-100 text-green-800",
  CONTRATO: "bg-cyan-100 text-cyan-800",
  DOCUMENTACAO: "bg-cyan-100 text-cyan-900",
  AGUARDANDO_INSTALACAO: "bg-lime-100 text-lime-900",
  INSTALADO: "bg-green-200 text-green-900",
  PERDIDO: "bg-zinc-200 text-zinc-700",
};

export function LeadBadge({ status }: { status: LeadStatus }) {
  return <Badge className={cn("border-0 font-medium", leadTone[status])}>{PIPELINE_LABEL[status]}</Badge>;
}

export function OfferBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, string> = {
    DETECTADA: "bg-zinc-100 text-zinc-800",
    AGUARDANDO_APROVACAO: "bg-amber-100 text-amber-900",
    APROVADA: "bg-green-100 text-green-800",
    REJEITADA: "bg-red-100 text-red-800",
    EXPIRADA: "bg-zinc-200 text-zinc-600",
  };
  return <Badge className={cn("border-0", map[status])}>{status.replaceAll("_", " ")}</Badge>;
}

export function PreSaleBadge({ status }: { status: PreSaleStatus }) {
  return <Badge variant="secondary">{status.replaceAll("_", " ")}</Badge>;
}
