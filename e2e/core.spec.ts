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
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByText("Histórico de status")).toBeVisible();
});

test("login → Inbox → abrir conversa", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Inbox" }).click();
  await expect(page.getByRole("heading", { name: "Inbox WhatsApp" })).toBeVisible();
  await page.getByRole("button", { name: /Conversa Maria Alves/ }).click();
  await expect(page.getByRole("heading", { name: "Lead" })).toBeVisible();
});

test("Laboratório: objeção de preço sem desconto inventado", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Laboratório" }).click();
  await page.getByTestId("new-simulator").click();
  await expect(page).toHaveURL(/\/conversas\/.+/);
  await expect(page.getByText("Laboratório IA")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("customer-message").fill("Quero internet em Caucaia.");
  await page.getByRole("button", { name: /Enviar/i }).click();
  await expect(page.getByText(/Mega|aprovad|cidade/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("customer-message").fill("Rapaz, tá caro. A outra aqui é 80.");
  await page.getByRole("button", { name: /Enviar/i }).click();
  await expect(page.getByText(/faço por 80|desconto de R\$ ?80/i)).toHaveCount(0);
  await expect(page.getByText("Laboratório IA")).toBeVisible();
});

test("Laboratório abre conversa", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Laboratório" }).click();
  await expect(page.getByRole("heading", { name: "Conversas" })).toBeVisible();
  await page.getByRole("link", { name: /Maria Alves|SIMULATOR|WHATSAPP/ }).first().click();
  await expect(page.getByText("Laboratório IA")).toBeVisible();
});

test("Inbox → assumir → composer humano → devolver para IA", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Dashboard comercial" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Inbox" }).click();
  await page.getByRole("button", { name: /Conversa Maria Alves/ }).click();
  await expect(page.getByTestId("human-composer")).toBeDisabled();
  await page.getByTestId("assume-conversation").click();
  await expect(page.getByTestId("human-composer")).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId("human-composer").fill("Confirmando cobertura com você.");
  await page.getByTestId("send-human").click();
  await expect(page.getByText("Confirmando cobertura com você.").first()).toBeVisible();
  await page.getByTestId("return-to-ai").click();
  await expect(page.getByText("IA respondendo", { exact: true })).toBeVisible({ timeout: 10_000 });
});
