import { describe, expect, it } from "vitest";
import { isWorkerHeartbeatFresh } from "@/workers/heartbeat";
import { appOrigin, appPort, loginUrl, healthUrl } from "@/lib/app-url";

describe("Porta e URLs", () => {
  it("usa APP_PORT sem espalhar fallback só aqui", () => {
    const prev = process.env.APP_PORT;
    process.env.APP_PORT = "43147";
    delete process.env.APP_URL;
    expect(appPort()).toBe(43147);
    expect(appOrigin()).toBe("http://127.0.0.1:43147");
    expect(loginUrl()).toBe("http://127.0.0.1:43147/login");
    expect(healthUrl()).toBe("http://127.0.0.1:43147/api/health");
    process.env.APP_PORT = prev;
  });
});

describe("Heartbeat do worker", () => {
  it("recente é online; ausente ou velho é offline", () => {
    const now = 1_000_000;
    expect(isWorkerHeartbeatFresh(null, now)).toBe(false);
    expect(isWorkerHeartbeatFresh(JSON.stringify({ at: now - 2000, pid: 1, startedAt: now }), now)).toBe(true);
    expect(isWorkerHeartbeatFresh(JSON.stringify({ at: now - 30_000, pid: 1, startedAt: now }), now)).toBe(false);
  });
});
