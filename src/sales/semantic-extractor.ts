import {
  type SalesConversationState,
  type SalesIntent,
  mergeSalesState,
  uniqueStrings,
} from "@/sales/conversation-state";

const KNOWN_CITIES = [
  "Maranguape",
  "Fortaleza",
  "Caucaia",
  "Maracanaú",
  "Mossoró",
  "Natal",
  "Recife",
  "Sobral",
  "Eusébio",
  "Aquiraz",
  "Pacajus",
  "Horizonte",
  "Juazeiro do Norte",
  "João Pessoa",
];

const CITY_ALIASES: Record<string, string> = {
  maranguap: "Maranguape",
  maranguape: "Maranguape",
  fortalez: "Fortaleza",
  fortaleza: "Fortaleza",
  forteleza: "Fortaleza",
  caucaia: "Caucaia",
  caucaiaa: "Caucaia",
  maracanau: "Maracanaú",
  mossoro: "Mossoró",
  eusebio: "Eusébio",
};

const CARRIERS = [
  { re: /\btim\b/i, name: "TIM" },
  { re: /\bclaro\b/i, name: "Claro" },
  { re: /\bvivo\b/i, name: "Vivo" },
  { re: /\boi\b/i, name: "Oi" },
  { re: /\balgar\b/i, name: "Algar" },
];

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function extractCity(text: string): string | null {
  const folded = fold(text);
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (folded.includes(alias)) return city;
  }
  for (const city of KNOWN_CITIES) {
    if (folded.includes(fold(city))) return city;
  }
  const loc = text.match(
    /(?:moro|mora|moramos|sou de|aqui (?:e|é|em)|cidade(?: de)?|em)\s+([A-Za-zÀ-ÿ]{3,}(?:\s+[A-Za-zÀ-ÿ]{3,})?)/i,
  );
  if (loc?.[1] && !/tim|claro|vivo|chip|plano|esposa|marido/i.test(loc[1])) {
    return loc[1].replace(/^\w/, (c) => c.toUpperCase());
  }
  return null;
}

function extractProduct(text: string): { produto: string | null; internet: boolean | null; refused: string[] } {
  const t = fold(text);
  const refused: string[] = [];
  const soChip = /so\s+(o\s+)?chip|so\s+quero\s+chip|so\s+chip|somente\s+chip|nao\s+quero\s+(a\s+)?(internet|fibra|banda|bl\b)|sem\s+(internet|fibra|bl\b)/.test(
    t,
  );
  if (soChip) refused.push("internet");
  if (/nao\s+quero\s+chip|sem\s+chip/.test(t)) refused.push("chip");

  const chipish = /chip|chipe|5g|cinco\s*ge|movel/.test(t);
  if (soChip || (chipish && /so|somente/.test(t))) {
    return { produto: "chip", internet: false, refused };
  }
  if (/combo/.test(t)) return { produto: "combo", internet: true, refused };
  if (chipish && /(fibra|internet|banda)/.test(t)) {
    return { produto: "combo", internet: true, refused };
  }
  if (chipish) return { produto: "chip", internet: soChip ? false : null, refused };
  if (/(fibra|internet|banda larga|\bbl\b|wifi|wi-fi)/.test(t)) return { produto: "internet", internet: true, refused };
  if (/plano/.test(t)) return { produto: "plano", internet: null, refused };
  return { produto: null, internet: soChip ? false : null, refused };
}

function extractLinesAndProfile(text: string): { linhas: number | null; perfil: string | null } {
  const t = fold(text);
  if (/esposa|esposo|marido|namorada|casal|pra mim e|minhasposa/.test(t)) return { linhas: 2, perfil: "casal" };
  if (/familia|filhos|somos\s+[34]|eu e mais dois/.test(t)) {
    const n = t.match(/somos\s+(\d+)/);
    return { linhas: n ? Number(n[1]) : 3, perfil: "familia" };
  }
  const lines = t.match(/(\d+)\s+linhas?/);
  if (lines) return { linhas: Number(lines[1]), perfil: Number(lines[1]) > 1 ? "multiplas_linhas" : "individual" };
  if (/pra mim\b|so eu|somente eu/.test(t)) return { linhas: 1, perfil: "individual" };
  return { linhas: null, perfil: null };
}

function extractPortability(text: string): { portabilidade: boolean | null; operadora: string | null; ddd: string | null } {
  const t = fold(text);
  let portabilidade: boolean | null = null;
  if (/nao\s+quero\s+portab|sem\s+portab|nao\s+vou\s+portar|manter\s+(o\s+)?numero/.test(t) && /nao|sem/.test(t)) {
    portabilidade = /nao\s+quero\s+portab|sem\s+portab|nao\s+vou\s+portar/.test(t) ? false : null;
  }
  if (/quero\s+portar|fazer\s+portab|trazer\s+(o\s+)?numero|portabilidade/.test(t) && portabilidade !== false) {
    portabilidade = true;
  }
  if (/nao\s+quero\s+portab|sem\s+portab/.test(t)) portabilidade = false;

  let operadora: string | null = null;
  for (const c of CARRIERS) {
    if (c.re.test(text)) operadora = c.name;
  }
  const dddMatch = text.match(
    /n[uú]mero\s+(?:[eé]|eh)?\s*(?:de\s+)?([A-Z]{2})\b|ddd\s*(\d{2})|n[uú]mero\s+de\s+(sp|rj|mg|ba|ce|pe|rn)/i,
  );
  const ddd = dddMatch ? (dddMatch[1] || dddMatch[2] || dddMatch[3] || "").toUpperCase() : null;
  return { portabilidade, operadora, ddd: ddd || null };
}

function extractObjections(text: string): string[] {
  const t = fold(text);
  const found: string[] = [];
  if (/caro|puxado|ta salgado|t[aá] caro/.test(t)) found.push("PRECO");
  if (/vou pensar|preciso pensar/.test(t)) found.push("VAI_PENSAR");
  if (/depois (eu )?(vejo|olho|falo|retorno)/.test(t)) found.push("DEPOIS_EU_VEJO");
  if (/ja tenho internet|ja tenho fibra|ja tenho plano/.test(t)) found.push("JA_POSSUI_INTERNET");
  if (/nao quero portab|sem portab/.test(t)) found.push("PORTABILIDADE");
  if (/qual vantagem|quais vantagens|o que tem de bom|compensa/.test(t)) found.push("QUAL_VANTAGEM");
  if (/fidel/.test(t)) found.push("FIDELIDADE");
  if (/so quero chip|so chip|somente chip/.test(t)) found.push("SO_QUERO_CHIP");
  if (/falar com (meu |minha )?(marido|esposa|esposo|mulher)/.test(t)) found.push("CONVERSAR_COM_FAMILIA");
  return found;
}

function extractIntent(text: string, objections: string[]): SalesIntent {
  const t = fold(text);
  if (/atendente|falar com (um )?humano|pessoa de verdade|operador/.test(t)) return "handoff";
  if (objections.length) return "objection";
  if (/portab|portar/.test(t)) return "portability";
  if (/quanto|preco|preço|valor/.test(t)) return "price";
  if (/contratar|quero|fech[oa]|pode (ser|fazer)|aceito|assinar/.test(t)) return "buy";
  if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t.trim())) return "greeting";
  if (/\?/.test(text)) return "question";
  return "qualify";
}

function extractBill(text: string): string | null {
  const m = text.match(/(?:pago|paga|custa|hoje)\s*(?:r\$\s*)?(\d{2,4})/i);
  return m?.[1] ?? null;
}

function customerAskedHuman(text: string) {
  return /quero (falar com|um) (humano|atendente|pessoa)|passa (pro|para|pro) (humano|atendente)|me passa (um )?atendente/i.test(
    text,
  );
}

export function extractSalesFacts(text: string): Partial<SalesConversationState> {
  const product = extractProduct(text);
  const people = extractLinesAndProfile(text);
  const port = extractPortability(text);
  const objections = extractObjections(text);
  const cidade = extractCity(text);
  const intent = extractIntent(text, objections);
  const bill = extractBill(text);

  return {
    intent,
    cidade: cidade ?? undefined,
    produto_interesse: product.produto ?? undefined,
    internet_interesse: product.internet ?? undefined,
    portabilidade: port.portabilidade ?? undefined,
    operadora_atual: port.operadora ?? undefined,
    quantidade_linhas: people.linhas ?? undefined,
    perfil_cliente: people.perfil ?? undefined,
    objections,
    refused_products: product.refused,
    ddd_origem: port.ddd ?? undefined,
    current_bill: bill ?? undefined,
    last_customer_utterance: text,
    handoff_required: customerAskedHuman(text) || undefined,
    handoff_reason: customerAskedHuman(text) ? "CLIENTE_SOLICITOU" : undefined,
  };
}

export function applyExtractionToState(previous: SalesConversationState | null, text: string): SalesConversationState {
  return mergeSalesState(previous, extractSalesFacts(text));
}

export function knownFactKeys(state: SalesConversationState): string[] {
  return uniqueStrings([
    state.cidade ? "cidade" : null,
    state.produto_interesse ? "produto_interesse" : null,
    state.internet_interesse != null ? "internet_interesse" : null,
    state.portabilidade != null ? "portabilidade" : null,
    state.operadora_atual ? "operadora_atual" : null,
    state.quantidade_linhas != null ? "quantidade_linhas" : null,
    state.perfil_cliente ? "perfil_cliente" : null,
  ]);
}
