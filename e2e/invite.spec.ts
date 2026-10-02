import { test, expect } from "@playwright/test";

test("convite inválido mostra a página pública sem login", async ({ page }) => {
  await page.goto("/convite/token-invalido");
  await expect(page.getByRole("heading", { name: "Convite inválido" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para o login" })).toBeVisible();
});
