import { prisma } from "@/lib/prisma";
import { generateShortCode, publicShortUrl } from "@/lib/plim/short-code";

export async function createShortLinkForOffer(
  tenantId: string,
  input: { offerId: string; groupId?: string; campaign?: string; destinationUrl: string },
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode(9);
    try {
      const link = await prisma.plimShortLink.create({
        data: {
          tenantId,
          code,
          offerId: input.offerId,
          groupId: input.groupId,
          campaign: input.campaign,
          destinationUrl: input.destinationUrl,
        },
      });
      const shortLink = publicShortUrl(link.code);
      await prisma.plimOffer.update({
        where: { id: input.offerId },
        data: { shortLink },
      });
      return { ...link, publicUrl: shortLink };
    } catch {
      /* retry unique code */
    }
  }
  throw new Error("Não foi possível gerar código único.");
}

export function getShortLinkByCode(code: string) {
  return prisma.plimShortLink.findUnique({
    where: { code },
    include: { offer: true, group: true },
  });
}
