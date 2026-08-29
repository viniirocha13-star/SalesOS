import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email = "ursula.b@example.com", password = "Brisa@2026") {
  await page.goto("/login");
  await expect(page.getByTestId("login-ready")).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("login válido abre o dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
});

test("credenciais inválidas mostram alerta", async ({ page }) => {
  await login(page, "ursula.b@example.com", "senha-errada");
  await expect(page.getByRole("alert")).toHaveText(/inválidos/i, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/login/);
});

test("rota protegida deslogado redireciona para login", async ({ page }) => {
  await page.goto("/leads");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Entrar no Sales OS" })).toBeVisible();
});

test("login → Books e ofertas", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Ofertas" }).click();
  await expect(page.getByRole("heading", { name: "Books e ofertas" })).toBeVisible();
});

test("login → Leads → abrir lead", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Leads" }).click();
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await page.getByRole("link", { name: "Maria Alves" }).click();
  await expect(page.getByRole("heading", { name: "Maria Alves" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Histórico de status" })).toBeVisible();
});

test("login → Inbox → abrir conversa", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Inbox" }).click();
  await expect(page.getByRole("heading", { name: "Inbox WhatsApp" })).toBeVisible();
  await page.getByRole("button", { name: /Conversa Maria Alves/ }).click();
  await expect(page.getByRole("heading", { name: "Lead" })).toBeVisible();
});
