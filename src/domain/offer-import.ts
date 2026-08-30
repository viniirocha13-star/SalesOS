import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { parseWorkbook, type ParsedBookRow } from "@/domain/book-parse";
import { getLlmProvider } from "@/integrations/llm/provider";
import type { OfferStatus } from "@prisma/client";

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

  const book = await prisma.offerBook.create({
    data: {
      originalName: input.fileName,
      mimeType: input.mimeType,
      storagePath,
      importedById: input.importedById,
      status: "PROCESSING",
    },
  });

  const rows = parseWorkbook(input.fileName, input.buffer);
  const enriched = await assistComplexFields(rows);
  const offers = [];
  for (const row of enriched) {
    const offer = await prisma.offer.create({
      data: mapRowToOffer(row, book.id, input.fileName),
    });
    offers.push(offer);
  }

  const stats = computeStats(enriched);
  const updated = await prisma.offerBook.update({
    where: { id: book.id },
    data: {
      status: "REVIEW_REQUIRED",
      extractedText: JSON.stringify({ sheets: [...new Set(enriched.map((r) => r.sourceSheet))], stats }),
      lineCount: enriched.length,
      offerCount: offers.length,
      errorCount: enriched.filter((r) => r.errors.length).length,
      warningCount: enriched.filter((r) => r.warnings.length).length,
      stats,
    },
  });

  return { book: updated, offers, rows: enriched.length, stats };
}

function mapRowToOffer(row: ParsedBookRow, bookId: string, fileName: string) {
  const benefits = [
    ...row.includedProducts,
    ...row.unlimitedApps.map((a) => `${a} ilimitado`),
    ...row.includedStreaming.map((s) => s.plan ? `${s.provider} ${s.plan}` : s.provider),
  ];
  return {
    name: row.planName ?? `Linha ${row.sourceSheet}#${row.sourceRow}`,
    category: row.category,
    product: row.categoryNormalized,
    speedMbps: row.speedMbps,
    priceCents: row.regularReferencePriceCents,
    promotionalPriceCents: row.promotionalPriceCents,
    futurePriceCents: row.futurePriceCents,
    promotionalPeriod: row.pricingPeriodDescription,
    benefits,
    loyalty: row.offerLevel || (row.acquisitionType === "RETENTION" ? "fidelizacao" : null),
    installation: row.installationIncluded ? "Inclusa" : row.featuresOriginalText,
    city: row.city,
    region: null,
    eligibility: row.acquisitionRaw,
    rules: row.pricingOriginalText,
    restrictions: row.salesChannel.raw,
    startsAt: row.validFrom,
    endsAt: row.validUntil,
    source: fileName,
    bookId,
    originalText: row.originalText,
    status: (row.errors.length ? "DETECTADA" : "AGUARDANDO_APROVACAO") as OfferStatus,
    acquisitionType: row.acquisitionType,
    salesChannelRaw: row.salesChannel.raw,
    channelAllows: row.salesChannel.allows,
    channelExcludes: row.salesChannel.excludes,
    categoryNormalized: row.categoryNormalized,
    offerLevel: row.offerLevel,
    pricingPeriodDescription: row.pricingPeriodDescription,
    pricingOriginalText: row.pricingOriginalText,
    promotionDurationMonths: row.promotionDurationMonths,
    includedProducts: row.includedProducts,
    unlimitedApps: row.unlimitedApps,
    launchCodes: row.launchCodes,
    includedStreaming: row.includedStreaming,
    featuresOriginalText: row.featuresOriginalText,
    installationIncluded: row.installationIncluded,
    wifiIncluded: row.wifiIncluded,
    unlimitedCalls: row.unlimitedCalls,
    unlimitedSms: row.unlimitedSms,
    roamingGb: row.roamingGb,
    deviceLoan: row.deviceLoan,
    isCombo: row.isCombo,
    mobileDataGb: row.mobileDataGb,
    fwaAllowanceGb: row.fwaAllowanceGb,
    fingerprint: row.fingerprint,
    sourceRow: row.sourceRow,
    sourceSheet: row.sourceSheet,
    sourceFile: row.sourceFile,
    validationErrors: row.errors,
    validationWarnings: row.warnings,
  };
}

function computeStats(rows: ParsedBookRow[]) {
  const cat = (name: string) => rows.filter((r) => r.categoryNormalized === name).length;
  return {
    lines: rows.length,
    offers: rows.filter((r) => r.planName).length,
    categories: Object.fromEntries(
      [...new Set(rows.map((r) => r.categoryNormalized).filter(Boolean))].map((c) => [c, cat(c as string)]),
    ),
    cities: [...new Set(rows.map((r) => r.city).filter(Boolean))],
    combos: rows.filter((r) => r.isCombo).length,
    fibra: cat("FIBRA"),
    movel: cat("MOVEL"),
    fwa: cat("FWA"),
    withStreaming: rows.filter((r) => r.includedStreaming.length).length,
    withApps: rows.filter((r) => r.unlimitedApps.length).length,
    errors: rows.filter((r) => r.errors.length).length,
    warnings: rows.filter((r) => r.warnings.length).length,
    validity: {
      from: minDate(rows.map((r) => r.validFrom)),
      until: maxDate(rows.map((r) => r.validUntil)),
    },
  };
}

function minDate(dates: (Date | null)[]) {
  const v = dates.filter(Boolean) as Date[];
  if (!v.length) return null;
  return new Date(Math.min(...v.map((d) => d.getTime()))).toISOString();
}
function maxDate(dates: (Date | null)[]) {
  const v = dates.filter(Boolean) as Date[];
  if (!v.length) return null;
  return new Date(Math.max(...v.map((d) => d.getTime()))).toISOString();
}

async function assistComplexFields(rows: ParsedBookRow[]) {
  const hard = rows.filter((r) => r.warnings.includes("mensalidade_dificil_de_interpretar")).slice(0, 8);
  const llm = getLlmProvider();
  if (!hard.length || llm.name !== "openai") return rows;
  for (const row of hard) {
    try {
      const result = await llm.complete({
        messages: [
          {
            role: "system",
            content:
              "Extraia JSON {promotion_duration_months, post_promotion_price_cents}. Não invente. Se incerto, omita. Preço em centavos.",
          },
          { role: "user", content: row.pricingPeriodDescription ?? "" },
        ],
        tools: [],
      });
      const json = JSON.parse(result.content) as { promotion_duration_months?: number; post_promotion_price_cents?: number };
      if (json.promotion_duration_months) row.promotionDurationMonths = json.promotion_duration_months;
      if (json.post_promotion_price_cents) row.futurePriceCents = json.post_promotion_price_cents;
      row.warnings = row.warnings.filter((w) => w !== "mensalidade_dificil_de_interpretar");
    } catch {
      /* parser already kept original text */
    }
  }
  return rows;
}

export { computeStats };
