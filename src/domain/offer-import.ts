import { mkdir, writeFile } from "fs/promises";
import path from "path";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getLlmProvider } from "@/integrations/llm/provider";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "offer-books");

export async function importOfferBook(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  importedById?: string;
}) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const idPart = `${Date.now()}-${input.fileName.replace(/[^\w.\-]+/g, "_")}`;
  const storagePath = path.join(UPLOAD_DIR, idPart);
  await writeFile(storagePath, input.buffer);

  const extractedText = await extractText(input.fileName, input.mimeType, input.buffer);
  const book = await prisma.offerBook.create({
    data: {
      originalName: input.fileName,
      mimeType: input.mimeType,
      storagePath,
      extractedText,
      importedById: input.importedById,
    },
  });

  const detected = await detectOffers(extractedText, input.fileName);
  const offers = [];
  for (const item of detected) {
    const offer = await prisma.offer.create({
      data: {
        ...item,
        bookId: book.id,
        source: input.fileName,
        status: "APROVADA",
      },
    });
    offers.push(offer);
  }

  return { book, offers };
}

async function extractText(fileName: string, mime: string, buffer: Buffer): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || mime.includes("csv")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || mime.includes("spreadsheet")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet);
  }
  if (lower.endsWith(".pdf") || mime.includes("pdf")) {
    return "[PDF armazenado. Extração de texto no ambiente atual é limitada; revise as ofertas detectadas.]";
  }
  if (mime.startsWith("image/")) {
    return "[imagem recebida — extração visual ainda não habilitada; arquivo original armazenado]";
  }
  return buffer.toString("utf8");
}

type DetectedOffer = {
  name: string;
  category?: string;
  product?: string;
  speedMbps?: number;
  priceCents?: number;
  promotionalPriceCents?: number;
  futurePriceCents?: number;
  promotionalPeriod?: string;
  benefits: string[];
  loyalty?: string;
  installation?: string;
  city?: string;
  region?: string;
  eligibility?: string;
  rules?: string;
  restrictions?: string;
  originalText: string;
};

async function detectOffers(text: string, fileName: string): Promise<DetectedOffer[]> {
  const tabular = parseTabular(text);
  if (tabular.length) return tabular;

  const llm = getLlmProvider();
  if (llm.name === "openai") {
    const result = await llm.complete({
      messages: [
        {
          role: "system",
          content:
            "Extraia ofertas de telecom em JSON array. Campos: name, category, product, speedMbps, priceCents, promotionalPriceCents, futurePriceCents, promotionalPeriod, benefits[], loyalty, installation, city, region, eligibility, rules, restrictions, originalText. Não invente valores ausentes: omita. Preços em centavos BRL.",
        },
        { role: "user", content: text.slice(0, 12000) },
      ],
      tools: [],
    });
    try {
      const parsed = JSON.parse(result.content) as DetectedOffer[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fallthrough */
    }
  }

  return [
    {
      name: `Oferta detectada em ${fileName}`,
      originalText: text.slice(0, 4000),
      benefits: [],
      rules: "Revisar manualmente. Extração automática incompleta.",
    },
  ];
}

function parseTabular(text: string): DetectedOffer[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (!parsed.data?.length || !parsed.meta.fields?.length) return [];
  const fields = parsed.meta.fields.map((f) => f.toLowerCase());
  const looksLikeOffers = fields.some((f) => /nome|plano|plano|produto|preco|preço|veloc/.test(f));
  if (!looksLikeOffers) return [];

  const offers: DetectedOffer[] = [];
  for (const row of parsed.data) {
    const get = (...keys: string[]) => {
      const entry = Object.entries(row).find(([k]) => keys.includes(k.toLowerCase().trim()));
      return entry?.[1]?.toString().trim();
    };
    const name = get("nome", "name", "plano", "oferta");
    if (!name) continue;
    offers.push({
      name,
      category: get("categoria", "category"),
      product: get("produto", "product"),
      speedMbps: parseSpeed(get("velocidade", "velocidade_mbps", "speed", "mbps")),
      priceCents: parseMoney(get("preco", "preço", "price", "valor")),
      promotionalPriceCents: parseMoney(get("preco_promocional", "preço_promocional", "promo")),
      futurePriceCents: parseMoney(get("preco_futuro", "preço_futuro")),
      promotionalPeriod: get("periodo_promocional", "periodo"),
      benefits: (get("beneficios", "benefícios") ?? "")
        .split(/[;|,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      loyalty: get("fidelidade", "loyalty"),
      installation: get("instalacao", "instalação"),
      city: get("cidade", "city"),
      region: get("regiao", "região", "region"),
      eligibility: get("elegibilidade"),
      rules: get("regras"),
      restrictions: get("restricoes", "restrições"),
      originalText: JSON.stringify(row),
    });
  }
  return offers;
}

function parseSpeed(value?: string) {
  if (!value) return undefined;
  const n = parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseMoney(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/[R$\s]/g, "");
  const n = cleaned.includes(",")
    ? Number(cleaned.replace(/\./g, "").replace(",", "."))
    : Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}
