export type OfferTextInput = {
  productName: string;
  currentPrice?: number | null;
  discountPercent?: number | null;
  category?: string | null;
};

export const AI_TEXT_PROHIBITIONS = [
  "inventar preço",
  "inventar cupom",
  "inventar certificação",
  "inventar características do produto",
  "inventar benefícios não informados",
] as const;

export function buildImproveOfferTextPrompt(input: OfferTextInput): string {
  const lines = [
    "Você é um assistente de copy para ofertas de afiliados no Brasil.",
    "Gere UMA descrição curta (máximo 280 caracteres) para divulgação.",
    "Use apenas os dados fornecidos abaixo.",
    "",
    "PROIBIÇÕES (não faça nenhuma destas coisas):",
    ...AI_TEXT_PROHIBITIONS.map((p) => `- ${p}`),
    "",
    "Dados da oferta:",
    `- Nome: ${input.productName}`,
  ];
  if (input.currentPrice != null) lines.push(`- Preço atual: R$ ${input.currentPrice.toFixed(2)}`);
  if (input.discountPercent != null) lines.push(`- Desconto informado: ${input.discountPercent}%`);
  if (input.category) lines.push(`- Categoria: ${input.category}`);
  lines.push("", "Responda apenas com o texto da descrição, sem aspas nem markdown.");
  return lines.join("\n");
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
