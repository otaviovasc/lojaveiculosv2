import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

const viewports = [
  { height: 900, name: "desktop", width: 1440 },
  { height: 700, name: "laptop-short", width: 1280 },
  { height: 800, name: "tablet", width: 900 },
  { height: 844, name: "mobile", width: 390 },
] as const;

for (const viewport of viewports) {
  test(`roles panel · ${viewport.name} · many members stay reachable`, async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, {
      permissions: ["store_profile.manage", "users.manage"],
      persona: qaPersonas.owner,
    });
    await installRolesRoutes(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({
      height: viewport.height,
      width: viewport.width,
    });

    await page.goto("/settings#/settings?tab=roles");
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Membro 24/ }),
    ).toBeAttached();

    const metrics = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h3"));
      const heading = headings.find((item) => item.textContent === "Membros");
      const card = heading?.closest("section");
      const list = card?.querySelector(".overflow-y-auto");
      if (!(card instanceof HTMLElement) || !(list instanceof HTMLElement)) {
        return null;
      }
      const cardRect = card.getBoundingClientRect();
      const inviteButton = Array.from(card.querySelectorAll("button")).find(
        (item) => item.textContent?.includes("Convidar Novo Membro"),
      );
      const inviteRect = inviteButton?.getBoundingClientRect();
      const firstMember = list.querySelector("button");
      const firstMemberRect = firstMember?.getBoundingClientRect();
      const nameRect = firstMember
        ?.querySelector("strong")
        ?.getBoundingClientRect();
      return {
        cardBottom: cardRect.bottom,
        cardHeight: cardRect.height,
        docScrollHeight: document.documentElement.scrollHeight,
        firstMemberBottom: firstMemberRect?.bottom ?? null,
        firstMemberTop: firstMemberRect?.top ?? null,
        inviteButtonBottom: inviteRect?.bottom ?? null,
        listClientHeight: list.clientHeight,
        listScrollHeight: list.scrollHeight,
        nameBottom: nameRect?.bottom ?? null,
        nameTop: nameRect?.top ?? null,
        viewportHeight: window.innerHeight,
      };
    });

    console.log(`metrics ${viewport.name}`, JSON.stringify(metrics, null, 2));
    expect(metrics).not.toBeNull();
    // The member list must overflow its own scroll area...
    expect(metrics!.listScrollHeight).toBeGreaterThan(
      metrics!.listClientHeight,
    );
    // ...member cards must not clip their content (name fully visible)...
    expect(metrics!.nameTop).not.toBeNull();
    expect(metrics!.nameTop!).toBeGreaterThanOrEqual(
      metrics!.firstMemberTop! - 1,
    );
    expect(metrics!.nameBottom!).toBeLessThanOrEqual(
      metrics!.firstMemberBottom! + 1,
    );
    // ...and the invite button must stay inside the card.
    expect(metrics!.inviteButtonBottom).not.toBeNull();
    expect(metrics!.inviteButtonBottom!).toBeLessThanOrEqual(
      metrics!.cardBottom + 1,
    );
    if (viewport.width >= 768) {
      // On md+ the card is pinned to the viewport height.
      expect(metrics!.cardBottom).toBeLessThanOrEqual(
        metrics!.viewportHeight + 1,
      );
      expect(metrics!.inviteButtonBottom!).toBeLessThanOrEqual(
        metrics!.viewportHeight + 1,
      );
    } else {
      // On mobile the card is capped so the permissions panel stays reachable.
      expect(metrics!.cardHeight).toBeLessThanOrEqual(513);
    }

    // Scrolling the list must reveal the last member without moving the page.
    const lastMember = page.getByRole("button", { name: /Membro 24/ });
    await lastMember.scrollIntoViewIfNeeded();
    await expect(lastMember).toBeVisible();
    await saveQaScreenshot(page, testInfo, `settings-roles-${viewport.name}`);
  });
}

test("roles panel exposes provider-neutral CRM connection permissions", async ({
  page,
}) => {
  await installLocalSession(page, {
    permissions: ["store_profile.manage", "users.manage"],
    persona: qaPersonas.owner,
  });
  await installRolesRoutes(page, [
    {
      key: "crm",
      label: "CRM e canais de mensagens",
      permissions: [
        {
          description:
            "Cadastrar a configuração inicial e gravar credenciais write-only de um canal.",
          key: "crm.messaging.connection.setup",
          label: "Configurar novo canal",
          risk: "high",
        },
        {
          description:
            "Solicitar QR Code ou código por telefone e atualizar o estado de conexão do canal.",
          key: "crm.messaging.connection.pair",
          label: "Conectar canal",
          risk: "high",
        },
        {
          description:
            "Criar, pausar, retomar e cancelar campanhas de mensagens.",
          key: "crm.whatsapp.campaigns.manage",
          label: "Gerenciar campanhas",
          risk: "high",
        },
      ],
    },
  ]);

  await page.goto("/settings#/settings?tab=roles");
  const crmAccordion = page.getByRole("button", {
    name: /Vendas, Propostas e Atendimento \(CRM\)/,
  });
  await expect(crmAccordion).toBeVisible();
  await crmAccordion.click();

  const setupPermission = page
    .locator("article")
    .filter({ hasText: "Configurar novo canal" });
  await setupPermission.scrollIntoViewIfNeeded();
  await expect(setupPermission).toBeVisible();
  await expect(setupPermission).toContainText(
    "Cadastrar a configuração inicial e gravar credenciais write-only de um canal.",
  );
  await expect(
    page.locator("article").filter({ hasText: "Conectar canal" }),
  ).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: "Gerenciar campanhas" }),
  ).toContainText("Criar, pausar, retomar e cancelar campanhas de mensagens.");
  await expect(
    page.getByText(
      /campanhas WhatsApp|mensagens WhatsApp agendadas|etiquetas do WhatsApp|Gerenciar conexão ZAPI|webhooks|rotacionar credenciais|interações de WhatsApp/i,
    ),
  ).toHaveCount(0);
});

type PermissionGroupFixture = {
  key: string;
  label: string;
  permissions: Array<{
    description: string;
    key: string;
    label: string;
    risk: "high" | "low" | "medium";
  }>;
};

async function installRolesRoutes(
  page: Page,
  permissionGroups: PermissionGroupFixture[] = [
    {
      key: "inventory_marketplace",
      label: "Estoque e Marketplace",
      permissions: Array.from({ length: 12 }, (_, index) => ({
        description: `Permissão ${index}`,
        key: `inventory.permission_${index}`,
        label: `Permissão ${index}`,
        risk: "low" as const,
      })),
    },
  ],
) {
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
          businessHours: { text: "Segunda a sexta, 9h às 18h" },
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

  const memberships = Array.from({ length: 25 }, (_, index) => ({
    basePermissions: [],
    effectivePermissions: [],
    manageable: index !== 0,
    membershipId: `membership_${index}`,
    overrides: [],
    role: index === 0 ? "owner" : "salesman",
    status: "active",
    user: {
      email: `membro-${index}@loja.test`,
      id: `user_${index}`,
      name: `Membro ${index}`,
    },
  }));

  const pendingInvitations = Array.from({ length: 4 }, (_, index) => ({
    email: `convite-${index}@loja.test`,
    id: `invitation_${index}`,
    name: `Convidado ${index}`,
    role: "salesman",
    status: "sent",
    storeId: "store_1",
    tenantId: "tenant_1",
  }));

  await page.route("**/api/v1/identity/roles", (route) =>
    route.fulfill({
      body: JSON.stringify({
        actor: {
          canManageRoles: true,
          membershipId: "membership_0",
          role: "owner",
        },
        memberships,
        pendingInvitations,
        permissionGroups,
        roles: [
          {
            assignable: true,
            defaultPermissions: [],
            description: "Dono.",
            label: "Proprietário",
            level: 80,
            role: "owner",
          },
          {
            assignable: true,
            defaultPermissions: [],
            description: "Vendedor.",
            label: "Vendedor",
            level: 40,
            role: "salesman",
          },
        ],
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );
}
