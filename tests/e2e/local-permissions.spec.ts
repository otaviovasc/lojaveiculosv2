import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { accountHeaders, qaPersonas } from "./support/personas";

test.describe("local seeded permission UX", () => {
  test("routes seeded personas to the correct shells", async ({
    page,
    request,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Entrar" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Começar|Comecar|Criar|Teste/i }).first(),
    ).toBeVisible();
    expectNoPageCrashes(diagnostics);
    await saveQaScreenshot(page, testInfo, "public-landing");

    await loginAs(page, qaPersonas.agency, testInfo);
    await expect(page).toHaveURL(qaPersonas.agency.expectedPath);
    await expect(page.getByText("Rede de Lojas")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "agency-dashboard");

    const agencyBootstrap = await request.get("/api/v1/session/bootstrap", {
      headers: accountHeaders(qaPersonas.agency),
    });
    expect(agencyBootstrap.status()).toBe(200);
    expect(await agencyBootstrap.json()).toMatchObject({
      defaultStore: null,
      needsOnboarding: false,
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/agency\/admin$/);
    await saveQaScreenshot(page, testInfo, "agency-store-route-redirect");

    for (const persona of [
      qaPersonas.owner,
      qaPersonas.supervisor,
      qaPersonas.salesman,
    ]) {
      await loginAs(page, persona, testInfo);
      await expect(page).toHaveURL(persona.expectedPath);
      await expect(
        page.getByRole("navigation", { name: "Modulos" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible();
      if (persona === qaPersonas.salesman) {
        await expect(page.getByRole("button", { name: "Billing" })).toHaveCount(
          0,
        );
        await expect(
          page.getByRole("button", { name: "Relatorios" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "Painel gerencial restrito" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Ir para veículos" }),
        ).toBeVisible();
      } else if (persona === qaPersonas.supervisor) {
        await expect(page.getByRole("button", { name: "Billing" })).toHaveCount(
          0,
        );
        await expect(
          page.getByRole("button", { name: "Relatorios" }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("button", { name: "Billing" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Relatorios" }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Dashboard Gerencial" }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("status", { name: "Carregando dashboard" }),
      ).toHaveCount(0);
      await expect(page.getByText("Missing permission")).toHaveCount(0);
      await saveQaScreenshot(page, testInfo, `${persona.userId}-dashboard`);
    }
  });

  test("settings permission is quiet and capability-aware", async ({
    page,
  }, testInfo) => {
    await loginAs(page, qaPersonas.owner, testInfo);
    await expect(page.getByRole("button", { name: "Geral" })).toBeVisible();
    await page.goto("/settings");
    await expect(page.getByText("Perfil da Loja").first()).toBeVisible();
    await expect(page.getByText("Papéis e Permissões")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "owner-settings");

    for (const persona of [qaPersonas.supervisor, qaPersonas.salesman]) {
      await loginAs(page, persona, testInfo);
      await expect(page.getByRole("button", { name: "Geral" })).toHaveCount(0);
      await page.goto("/settings");
      await expect(page.getByText("Acesso restrito")).toBeVisible();
      await expect(page.getByText("Missing permission")).toHaveCount(0);
      await saveQaScreenshot(
        page,
        testInfo,
        `${persona.userId}-settings-restricted`,
      );
    }
  });
});
