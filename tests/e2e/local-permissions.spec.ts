import { expect, test, type Page, type TestInfo } from "@playwright/test";

type Persona = {
  email: string;
  expectedPath: RegExp;
  name: string;
  userId: string;
};

const personas = {
  agency: {
    email: "agency.seed@lojaveiculos.com.br",
    expectedPath: /\/agency\/admin$/,
    name: "Seed Agency",
    userId: "clerk_seed_agency",
  },
  owner: {
    email: "owner.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Owner",
    userId: "clerk_seed_owner",
  },
  salesman: {
    email: "salesman.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Salesman",
    userId: "clerk_seed_salesman",
  },
  supervisor: {
    email: "supervisor.seed@lojaveiculos.com.br",
    expectedPath: /\/dashboard$/,
    name: "Seed Supervisor",
    userId: "clerk_seed_supervisor",
  },
} satisfies Record<string, Persona>;

test.describe("local seeded permission UX", () => {
  test("routes seeded personas to the correct shells", async ({
    page,
    request,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Entrar" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Começar|Comecar|Criar|Teste/i }).first(),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
    await capture(page, testInfo, "public-landing");

    await loginAs(page, personas.agency, testInfo);
    await expect(page).toHaveURL(personas.agency.expectedPath);
    await expect(page.getByText("Rede de Lojas")).toBeVisible();
    await capture(page, testInfo, "agency-dashboard");

    const agencyBootstrap = await request.get("/api/v1/session/bootstrap", {
      headers: accountHeaders(personas.agency),
    });
    expect(agencyBootstrap.status()).toBe(200);
    expect(await agencyBootstrap.json()).toMatchObject({
      defaultStore: null,
      needsOnboarding: false,
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/agency\/admin$/);
    await capture(page, testInfo, "agency-store-route-redirect");

    for (const persona of [
      personas.owner,
      personas.supervisor,
      personas.salesman,
    ]) {
      await loginAs(page, persona, testInfo);
      await expect(page).toHaveURL(persona.expectedPath);
      await expect(
        page.getByRole("navigation", { name: "Modulos" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible();
      if (persona === personas.salesman) {
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
      } else if (persona === personas.supervisor) {
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
        await expect(page.getByText("Status da Loja")).toBeVisible();
      }
      await expect(
        page.getByRole("status", { name: "Carregando dashboard" }),
      ).toHaveCount(0);
      await expect(page.getByText("Missing permission")).toHaveCount(0);
      await capture(page, testInfo, `${persona.userId}-dashboard`);
    }
  });

  test("settings permission is quiet and capability-aware", async ({
    page,
  }, testInfo) => {
    await loginAs(page, personas.owner, testInfo);
    await expect(page.getByRole("button", { name: "Geral" })).toBeVisible();
    await page.goto("/settings");
    await expect(page.getByText("Perfil da Loja").first()).toBeVisible();
    await expect(page.getByText("Papéis e Permissões")).toBeVisible();
    await capture(page, testInfo, "owner-settings");

    for (const persona of [personas.supervisor, personas.salesman]) {
      await loginAs(page, persona, testInfo);
      await expect(page.getByRole("button", { name: "Geral" })).toHaveCount(0);
      await page.goto("/settings");
      await expect(page.getByText("Acesso restrito")).toBeVisible();
      await expect(page.getByText("Missing permission")).toHaveCount(0);
      await capture(page, testInfo, `${persona.userId}-settings-restricted`);
    }
  });
});

async function loginAs(page: Page, persona: Persona, testInfo: TestInfo) {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selecionar perfil" }),
  ).toBeVisible();
  await capture(page, testInfo, `${persona.userId}-sign-in`);
  await page.getByRole("button", { name: new RegExp(persona.name) }).click();
  await expect(page).toHaveURL(persona.expectedPath);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`${name}.png`),
  });
}

function accountHeaders(persona: Persona) {
  return {
    "x-clerk-user-id": persona.userId,
    "x-user-email": persona.email,
    "x-user-name": persona.name,
  };
}
