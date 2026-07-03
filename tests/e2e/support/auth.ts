import { expect, type Page, type TestInfo } from "@playwright/test";
import { saveQaScreenshot } from "./artifacts";
import { qaPersonas, type QaPersona } from "./personas";

const localAuthStorageKey = "lojaveiculosv2:local-auth-user-id";

type LocalSessionOptions = {
  permissions?: string[];
  persona?: QaPersona;
};

export async function loginAs(
  page: Page,
  persona: QaPersona,
  testInfo?: TestInfo,
) {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selecionar perfil" }),
  ).toBeVisible();
  if (testInfo) {
    await saveQaScreenshot(page, testInfo, `${persona.userId}-sign-in`);
  }
  await page
    .getByRole("button", {
      name: new RegExp(`^${escapeRegExp(persona.name)}\\b`),
    })
    .click();
  await expect(page).toHaveURL(persona.expectedPath);
}

export async function installLocalSession(
  page: Page,
  options: LocalSessionOptions = {},
) {
  const persona = options.persona ?? qaPersonas.owner;
  await page.addInitScript(
    ({ key, userId }) => {
      window.localStorage.setItem(key, userId);
    },
    { key: localAuthStorageKey, userId: persona.userId },
  );

  await page.route("**/api/v1/session/bootstrap", async (route) => {
    await route.fulfill({
      body: JSON.stringify(buildLocalBootstrap(persona, options.permissions)),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

function buildLocalBootstrap(persona: QaPersona, permissions?: string[]) {
  const defaultStore =
    persona.role === "agency"
      ? null
      : {
          effectivePermissions: permissions ?? [
            "inventory.read",
            "inventory.create",
            "store_profile.manage",
            "users.manage",
          ],
          role: persona.role,
          status: "active",
          storeId: "store_1",
          storeName: "Loja Teste",
          storeSlug: persona.storeSlug ?? "test-store",
          tenantId: "tenant_1",
          tenantName: "Tenant Teste",
        };

  return {
    defaultStore,
    needsOnboarding: false,
    platformAdmin: false,
    stores: defaultStore ? [defaultStore] : [],
    tenantMemberships: [],
    user: {
      clerkUserId: persona.userId,
      email: persona.email,
      id: "user_1",
      name: persona.name,
    },
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
