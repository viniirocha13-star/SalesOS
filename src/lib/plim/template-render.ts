export type TemplateVars = {
  produto: string;
  preco_anterior: string;
  preco: string;
  cupom: string;
  link: string;
};

export function renderMessageTemplate(body: string, vars: TemplateVars): string {
  return body
    .replace(/\{\{produto\}\}/g, vars.produto)
    .replace(/\{\{preco_anterior\}\}/g, vars.preco_anterior)
    .replace(/\{\{preco\}\}/g, vars.preco)
    .replace(/\{\{cupom\}\}/g, vars.cupom)
    .replace(/\{\{link\}\}/g, vars.link);
}

export function formatBrPrice(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export const DEFAULT_TEMPLATE_BODY =
  "{{produto}}\n\nDe {{preco_anterior}} por {{preco}}\n{{cupom}}\n{{link}}";
