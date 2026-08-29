import { describe, expect, it } from "vitest";
import { approvedTemplateBody, followUpDelayMinutes, nextFollowUpPatch, shouldCancelFollowUp } from "@/domain/post-sale";

describe("Templates de pós-venda", () => {
  it("só envia texto aprovado no template", () => {
    expect(approvedTemplateBody({ body: "Pedido confirmado." })).toBe("Pedido confirmado.");
    expect(approvedTemplateBody({})).toBeNull();
    expect(approvedTemplateBody(null)).toBeNull();
    expect(approvedTemplateBody({ body: "   " })).toBeNull();
  });
});

describe("Follow-up", () => {
  it("cancela se o cliente respondeu depois do envio", () => {
    const sent = new Date("2026-08-29T12:00:00.000Z");
    const inbound = new Date("2026-08-29T12:10:00.000Z");
    expect(shouldCancelFollowUp(inbound, sent)).toBe(true);
    expect(shouldCancelFollowUp(new Date("2026-08-29T11:00:00.000Z"), sent)).toBe(false);
    expect(shouldCancelFollowUp(null, sent)).toBe(false);
  });

  it("usa FOLLOWUP_DELAY_MINUTES", () => {
    const prev = process.env.FOLLOWUP_DELAY_MINUTES;
    process.env.FOLLOWUP_DELAY_MINUTES = "15";
    expect(followUpDelayMinutes()).toBe(15);
    process.env.FOLLOWUP_DELAY_MINUTES = prev;
  });

  it("reagenda tentativa 1 e encerra na última", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const mid = nextFollowUpPatch(1, 2, now, 60);
    expect(mid.sentAt).toBeNull();
    expect(mid.cancelled).toBe(false);
    expect(mid.dueAt?.getTime()).toBe(now.getTime() + 60 * 60_000);
    const last = nextFollowUpPatch(2, 2, now, 60);
    expect(last.sentAt).toEqual(now);
    expect(last.cancelled).toBe(true);
    expect(last.dueAt).toBeUndefined();
  });
});
