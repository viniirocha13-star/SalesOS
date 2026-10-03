import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/plim/short-links", () => ({
  getShortLinkByCode: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plimClickEvent: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { GET } from "@/app/o/[code]/route";
import { getShortLinkByCode } from "@/lib/repositories/plim/short-links";
import { prisma } from "@/lib/prisma";

describe("short link redirect", () => {
  beforeEach(() => {
    vi.mocked(getShortLinkByCode).mockResolvedValue({
      id: "l1",
      tenantId: "t1",
      code: "abc",
      offerId: "o1",
      groupId: null,
      campaign: null,
      destinationUrl: "https://example.com/dest",
      createdAt: new Date(),
      offer: { marketplace: "SHOPEE" } as never,
      group: null,
    });
  });

  it("registra clique e redireciona 302", async () => {
    const res = await GET(new Request("https://app.test/o/abc?utm_source=x"), {
      params: Promise.resolve({ code: "abc" }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/dest");
    expect(prisma.plimClickEvent.create).toHaveBeenCalled();
  });
});
