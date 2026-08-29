/** Interface futura para lançamento automático no sistema corporativo oficial. */

export type CorporateOrderInput = {
  preSaleId: string;
  customer: Record<string, unknown>;
  offerId: string;
};

export type CorporateOrderResult = {
  quoteNumber?: string;
  orderNumber?: string;
  result: "APROVADO" | "PENDENCIA" | "REPROVADO";
  notes?: string;
};

export interface CorporateOrderProvider {
  readonly name: string;
  submit(input: CorporateOrderInput): Promise<CorporateOrderResult>;
}

/** Sem API oficial autorizada. O operador lança manualmente. */
export class ManualCorporateOrderProvider implements CorporateOrderProvider {
  readonly name = "manual_operator";
  async submit(): Promise<CorporateOrderResult> {
    throw new Error("API corporativa oficial não configurada. Use a fila operacional.");
  }
}

export function getCorporateOrderProvider(): CorporateOrderProvider {
  return new ManualCorporateOrderProvider();
}
