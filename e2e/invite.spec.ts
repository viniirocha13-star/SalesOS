import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.getByTestId("login-ready")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("convite inválido mostra a página pública sem login", async ({ page }) => {
  await page.goto("/convite/token-invalido");
  await expect(page.getByRole("heading", { name: "Convite inválido" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para o login" })).toBeVisible();
});

test("admin gera convite mágico e convidado cria senha", async ({ page }) => {
  const email = `e2e.convite.${Date.now()}@brisa.test`;
  await login(page, "ursula.b@example.com", "Brisa@2026");
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Usuários" }).click();
  await expect(page.getByRole("heading", { name: "Convite mágico" })).toBeVisible();
  await page.getByPlaceholder("E-mail (opcional)").fill(email);
  await page.getByPlaceholder("Nome (opcional)").fill("Convidado E2E");
  await page.getByRole("button", { name: "Gerar convite mágico" }).click();
  const url = await page.getByTestId("invite-url").innerText();
  expect(url).toMatch(/\/convite\//);

  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Convite mágico" })).toBeVisible();
  await page.getByLabel("Senha").fill("senha-e2e-10");
  await page.getByRole("button", { name: "Ativar acesso" }).click();
  await expect(page.getByText("Acesso criado")).toBeVisible({ timeout: 15_000 });

  await login(page, email, "senha-e2e-10");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
});
