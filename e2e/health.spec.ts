import { test, expect } from "@playwright/test";

test("GET /api/health não depende de OpenAI/Meta", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.web).toBe("up");
  expect(typeof body.timestamp).toBe("string");
  expect(typeof body.version).toBe("string");
  expect(body.openai === "CONNECTED" || body.openai === "NOT_CONFIGURED").toBeTruthy();
  expect(body.whatsapp === "CONNECTED" || body.whatsapp === "NOT_CONFIGURED").toBeTruthy();
});

test("login abre fora do Preview", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrar no Sales OS" })).toBeVisible();
});
