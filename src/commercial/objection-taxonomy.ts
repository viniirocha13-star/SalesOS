import type { ObjectionCategory } from "@prisma/client";

/** Categorias do ObjectionEngine (API de raciocínio). Persistência usa o enum Prisma. */
export type ObjectionTaxonomy =
  | "PRICE"
  | "COMPETITOR"
  | "THINK_ABOUT_IT"
  | "SPOUSE"
  | "CURRENT_PROVIDER"
  | "LOYALTY"
  | "INSTALLATION"
  | "NO_NEED"
  | "PORTABILITY"
  | "TRUST"
  | "TIMING"
  | "BAD_PREVIOUS_EXPERIENCE"
  | "ONLY_RESEARCHING"
  | "OTHER";

const TO_PRISMA: Record<ObjectionTaxonomy, ObjectionCategory> = {
  PRICE: "PRECO",
  COMPETITOR: "CONCORRENTE",
  THINK_ABOUT_IT: "VAI_PENSAR",
  SPOUSE: "CONVERSAR_COM_FAMILIA",
  CURRENT_PROVIDER: "JA_POSSUI_INTERNET",
  LOYALTY: "FIDELIDADE",
  INSTALLATION: "INSTALACAO",
  NO_NEED: "SEM_INTERESSE",
  PORTABILITY: "PORTABILIDADE",
  TRUST: "OUTROS",
  TIMING: "VAI_PENSAR",
  BAD_PREVIOUS_EXPERIENCE: "OUTROS",
  ONLY_RESEARCHING: "SEM_INTERESSE",
  OTHER: "OUTROS",
};

export function classifyObjectionTaxonomy(text: string): ObjectionTaxonomy {
  const t = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (/caro|preco|preço|valor alto|puxado|salgado/.test(t)) return "PRICE";
  if (/vivo|claro|tim|oi|concorr/.test(t) && !/sou da/.test(t)) return "COMPETITOR";
  if (/experiencia ruim|pior|nao gostei|reclamei|problema (com|da)/.test(t)) return "BAD_PREVIOUS_EXPERIENCE";
  if (/pesquisando|so olhando|so quero saber|orcamento/.test(t)) return "ONLY_RESEARCHING";
  if (/confian[cç]a|golpe|serio|e verdade|eh verdade/.test(t)) return "TRUST";
  if (/depois|semana que vem|mes que vem|agora nao/.test(t) && !/pensar/.test(t)) return "TIMING";
  if (/pensar|vou ver/.test(t)) return "THINK_ABOUT_IT";
  if (/marido|esposa|esposo|mulher/.test(t)) return "SPOUSE";
  if (/ja tenho (internet|fibra|plano)|ja sou cliente/.test(t)) return "CURRENT_PROVIDER";
  if (/fidel/.test(t)) return "LOYALTY";
  if (/instala/.test(t)) return "INSTALLATION";
  if (/portab/.test(t)) return "PORTABILITY";
  if (/nao preciso|sem interesse|nao quero/.test(t)) return "NO_NEED";
  return "OTHER";
}

export function taxonomyToPrisma(category: string): ObjectionCategory {
  const key = category.toUpperCase().replace(/ /g, "_") as ObjectionTaxonomy;
  if (key in TO_PRISMA) return TO_PRISMA[key];
  const legacy: Record<string, ObjectionCategory> = {
    PRECO: "PRECO",
    VAI_PENSAR: "VAI_PENSAR",
    CONCORRENTE: "CONCORRENTE",
    FIDELIDADE: "FIDELIDADE",
    INSTALACAO: "INSTALACAO",
    CONVERSAR_COM_FAMILIA: "CONVERSAR_COM_FAMILIA",
    SEM_INTERESSE: "SEM_INTERESSE",
    JA_POSSUI_INTERNET: "JA_POSSUI_INTERNET",
    PORTABILIDADE: "PORTABILIDADE",
    OUTROS: "OUTROS",
  };
  return legacy[category.toUpperCase()] ?? "OUTROS";
}

export function severityFor(category: ObjectionTaxonomy, buyingIntent: string): "low" | "medium" | "high" {
  if (category === "PRICE" && buyingIntent === "HIGH") return "high";
  if (category === "COMPETITOR" || category === "BAD_PREVIOUS_EXPERIENCE") return "high";
  if (category === "THINK_ABOUT_IT" || category === "SPOUSE" || category === "TIMING") return "medium";
  if (category === "ONLY_RESEARCHING" || category === "NO_NEED") return "low";
  return "medium";
}
