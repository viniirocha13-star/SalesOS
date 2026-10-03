export interface AIProvider {
  improveText(input: { product: string; price?: string }): Promise<{ text: string }>;
}

export class SimulationAIProvider implements AIProvider {
  async improveText(input: { product: string; price?: string }) {
    const price = input.price ? ` — ${input.price}` : "";
    return { text: `${input.product}${price}` };
  }
}

export function getAIProvider() {
  return new SimulationAIProvider();
}
