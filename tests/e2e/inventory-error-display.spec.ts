import { expect, test, type Page, type TestInfo } from "@playwright/test";

const owner = {
  name: "Seed Owner",
  userId: "clerk_seed_owner",
};

test.describe("api error display", () => {
  test("shows friendly plate lookup failures with request ids", async ({
    page,
  }, testInfo) => {
    await installLocalOwnerSession(page);
    await page.route("**/api/v1/inventory/enrichment/plate", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          code: "HTTP_AUTHENTICATION_REQUIRED",
          message:
            "Authenticated HTTP context requires Clerk user and store slug",
          requestId: "req_pw_plate_lookup",
        }),
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_pw_plate_lookup",
        },
        status: 401,
      });
    });

    await page.goto("/inventory#/inventory/create");

    await expect(
      page.getByRole("heading", { name: "Cadastrar Veículo" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Ex: abc1d23" })
      .first()
      .fill("ABC1D23");
    await page.getByRole("button", { name: "Consultar placa" }).click();

    await expect(
      page.getByText(
        "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("ID do erro: req_pw_plate_lookup"),
    ).toBeVisible();
    await capture(page, testInfo, "inventory-plate-lookup-401");
  });

  test("shows structured settings failures with request ids", async ({
    page,
  }, testInfo) => {
    await installLocalOwnerSession(page);
    await page.route("**/api/v1/settings/store", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          code: "AUTHORIZATION_DENIED",
          message: "Missing permission: store_profile.manage",
          requestId: "req_pw_settings_store",
        }),
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_pw_settings_store",
        },
        status: 403,
      });
    });
    await page.route("**/api/v1/identity/roles", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          actor: {
            canManageRoles: false,
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
      });
    });

    await page.goto("/settings");

    await expect(
      page.getByRole("tab", { name: /Perfil da Loja/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Seu usuario nao tem permissao para realizar esta acao."),
    ).toBeVisible();
    await expect(
      page.getByText(/ID do erro: req_pw_settings_store/),
    ).toBeVisible();
    await capture(page, testInfo, "settings-store-403");
  });
});

async function installLocalOwnerSession(page: Page) {
  await page.addInitScript((userId) => {
    window.localStorage.setItem("lojaveiculosv2:local-auth-user-id", userId);
  }, owner.userId);

  await page.route("**/api/v1/session/bootstrap", async (route) => {
    const store = {
      effectivePermissions: [
        "inventory.read",
        "inventory.create",
        "store_profile.manage",
        "users.manage",
      ],
      role: "owner",
      status: "active",
      storeId: "store_1",
      storeName: "Loja Teste",
      storeSlug: "test-store",
      tenantId: "tenant_1",
      tenantName: "Tenant Teste",
    };
    await route.fulfill({
      body: JSON.stringify({
        defaultStore: store,
        needsOnboarding: false,
        platformAdmin: false,
        stores: [store],
        tenantMemberships: [],
        user: {
          clerkUserId: owner.userId,
          email: "owner.seed@lojaveiculos.com.br",
          id: "user_1",
          name: owner.name,
        },
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`${name}.png`),
  });
}
