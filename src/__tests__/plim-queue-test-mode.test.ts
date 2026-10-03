import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  settings: { testMode: true },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plimQueueItem: {
      findMany: vi.fn(async () => mocks.items),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const item = mocks.items.find((i) => i.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      findFirst: vi.fn(async () => null),
    },
    plimWorkspaceSettings: {
      findUnique: vi.fn(async () => mocks.settings),
    },
    plimChannelConnection: {
      findFirst: vi.fn(async () => ({
        id: "c1",
        status: "CONNECTED",
        sendsPaused: false,
      })),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
}));

import { processPlimQueueBatch } from "@/lib/plim/queue-processor";

describe("processPlimQueueBatch modo teste", () => {
  beforeEach(() => {
    mocks.items = [
      {
        id: "q1",
        tenantId: "t1",
        status: "AGUARDANDO",
        productName: "Prod",
        messageBody: "msg",
        platform: "TELEGRAM",
        groupId: "g1",
        imageUrl: null,
        group: { externalId: "chat1", minIntervalSec: 0, platform: "TELEGRAM" },
        offer: null,
      },
    ];
  });

  it("marca ENVIADO e grava testPayload sem API externa", async () => {
    const result = await processPlimQueueBatch(5);
    expect(result.processed).toBe(1);
    expect(mocks.items[0]?.status).toBe("ENVIADO");
    expect(mocks.items[0]?.testPayload).toBeTruthy();
  });
});
