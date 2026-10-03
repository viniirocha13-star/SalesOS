import { EmBreve } from "@/components/plim/em-breve";
import { notFound } from "next/navigation";

const FEATURES: Record<string, string> = {
  imagens: "Biblioteca de Imagens",
  comissoes: "Comissões",
  cliques: "Cliques",
  resultados: "Resultados",
  contatos: "Contatos",
  exclusoes: "Exclusões",
  historico: "Histórico",
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
