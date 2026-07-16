import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

const viewports = ["desktop", "mobile"] satisfies QaViewport[];

for (const viewport of viewports) {
  test(`store profile · ${viewport} is accessible and viewport-safe`, async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["store_profile.manage", "users.manage"],
      persona: qaPersonas.owner,
    });
    await installSettingsRoutes(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setQaViewport(page, viewport);

    await page.goto("/settings#/settings");

    await expect(
      page.getByRole("heading", { name: "Autovale Prime" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Perfil da Loja" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Vitrine Digital" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Nome fantasia" }),
    ).toHaveValue("Autovale Prime");
    const documentField = page.getByRole("textbox", {
      name: "Documento fiscal (CNPJ/CPF)",
    });
    await expect(documentField).toHaveValue("12.345.678/0001-95");
    await documentField.fill("12345678901");
    await expect(documentField).toHaveValue("123.456.789-01");
    await documentField.fill("12345678000195");
    await expect(documentField).toHaveValue("12.345.678/0001-95");

    const stateField = page.getByRole("button", { name: "UF" });
    const cityField = page.getByRole("button", { name: "Cidade" });
    await expect(stateField).toContainText("Santa Catarina (SC)");
    await expect(cityField).toContainText("Florianópolis");
    await stateField.click();
    await page.getByRole("searchbox", { name: "UF: buscar" }).fill("parana");
    await page.getByRole("option", { name: "Paraná (PR)" }).click();
    await expect(cityField).toContainText("Selecione a cidade");
    await cityField.click();
    await page
      .getByRole("searchbox", { name: "Cidade: buscar" })
      .fill("curiti");
    await page.getByRole("option", { name: "Curitiba" }).click();
    await expect(cityField).toContainText("Curitiba");

    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, `settings-profile-${viewport}`);
  });
}

async function installSettingsRoutes(page: Page) {
  await page.route("**/api/v1/settings/store", (route) =>
    route.fulfill({
      body: JSON.stringify({
        identity: {
          legalName: "Autovale Comércio de Veículos Ltda.",
          primaryDomain: "autovale.local.test",
          publicSlug: "autovale-prime",
          tradingName: "Autovale Prime",
        },
        profile: {
          addressCity: "Florianópolis",
          addressLine1: "Avenida das Nações, 540",
          addressLine2: null,
          addressState: "SC",
          addressZipCode: "88010-400",
          businessHours: {
            text: "Segunda a sexta, 9h às 18h\nSábado, 9h às 14h",
          },
          contactEmail: "atendimento@autovale.local.test",
          contactPhone: "(48) 3333-1840",
          documentNumber: "12345678000195",
          logoImageUrl: null,
          whatsappPhone: "(48) 99142-6830",
        },
        publicSite: {
          customDomain: null,
          customDomainStatus: "verified",
          heroImageUrl: null,
          isPublished: true,
          layoutKey: "default",
          seoDescription: null,
          seoTitle: null,
          theme: {},
          verificationToken: null,
        },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );
  await page.route("**/api/v1/identity/roles", (route) =>
    route.fulfill({
      body: JSON.stringify({
        actor: {
          canManageRoles: true,
          membershipId: "membership_1",
          role: "owner",
        },
        memberships: [],
        pendingInvitations: [],
        permissionGroups: [],
        roles: [],
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );
}
