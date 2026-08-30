import { describe, expect, it } from "vitest";
import { assertProdEnv, missingProductionEnv } from "@/lib/prod-env";
import { assertDevSeedAllowed, isDevSeedAllowed } from "@/lib/seed-guard";
import { shouldUseMockLlm } from "@/integrations/llm/provider";
import { appPort } from "@/lib/app-url";

const completeWeb = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://x",
  REDIS_URL: "redis://x",
  AUTH_SECRET: "secret",
  AUTH_URL: "https://app.example",
  APP_URL: "https://app.example",
  OPENAI_API_KEY: "sk-test",
  AI_SALES_MODEL: "gpt-5.6-luna",
  APP_ENCRYPTION_KEY: "enc",
} as NodeJS.ProcessEnv;

describe("env de produção", () => {
  it("lista faltantes do WEB sem imprimir valores", () => {
    expect(missingProductionEnv("web", { NODE_ENV: "production" })).toContain("DATABASE_URL");
    expect(missingProductionEnv("web", completeWeb)).toEqual([]);
  });

  it("aceita ENCRYPTION_KEY ou APP_ENCRYPTION_KEY", () => {
    const env = { ...completeWeb };
    delete env.APP_ENCRYPTION_KEY;
    env.ENCRYPTION_KEY = "enc";
    expect(missingProductionEnv("web", env)).toEqual([]);
  });

  it("não falha fora de production", () => {
    expect(() => assertProdEnv("web", { NODE_ENV: "development" })).not.toThrow();
  });
});

describe("seed de desenvolvimento", () => {
  it("bloqueia em production sem flag", () => {
    expect(isDevSeedAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(() => assertDevSeedAllowed({ NODE_ENV: "production" })).toThrow(/SEED_BLOCKED/);
  });

  it("só libera em production com ALLOW_DEV_SEED=1", () => {
    expect(isDevSeedAllowed({ NODE_ENV: "production", ALLOW_DEV_SEED: "1" })).toBe(true);
  });
});

describe("LLM em produção", () => {
  it("não cai em mock quando NODE_ENV=production", () => {
    const prevNode = process.env.NODE_ENV;
    const prevVitest = process.env.VITEST;
    delete process.env.VITEST;
    process.env.NODE_ENV = "production";
    expect(shouldUseMockLlm()).toBe(false);
    process.env.NODE_ENV = prevNode;
    if (prevVitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = prevVitest;
  });
});

describe("Porta Railway", () => {
  it("prefere PORT e depois APP_PORT", () => {
    const prevPort = process.env.PORT;
    const prevApp = process.env.APP_PORT;
    process.env.PORT = "8088";
    process.env.APP_PORT = "43147";
    expect(appPort()).toBe(8088);
    if (prevPort === undefined) delete process.env.PORT;
    else process.env.PORT = prevPort;
    if (prevApp === undefined) delete process.env.APP_PORT;
    else process.env.APP_PORT = prevApp;
  });
});
