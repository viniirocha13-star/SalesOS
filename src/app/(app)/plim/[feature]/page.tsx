import { EmBreve } from "@/components/plim/em-breve";
import { notFound } from "next/navigation";

const FEATURES: Record<string, string> = {
  ofertas: "Ofertas",
  rotas: "Rotas",
  piloto: "Piloto Automático",
  agendamentos: "Agendamentos",
  grupos: "Grupos e Canais",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  afiliados: "Afiliados",
  conversor: "Conversor de Links",
  editor: "Editor de Ofertas",
  filas: "Filas",
  integracoes: "Integrações",
};

export function generateStaticParams() {
  return Object.keys(FEATURES).map((feature) => ({ feature }));
}

export default async function PlimFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const title = FEATURES[feature];
  if (!title) notFound();
  return <EmBreve title={title} />;
}
