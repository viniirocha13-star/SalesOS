/** Preview puro — sem dependência de Prisma (usado no client). */
export function applyExampleValues(body: string, examples: string[] = []) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => examples[Number(n) - 1] ?? `{{${n}}}`);
}
