import { expect, test } from "@playwright/test";
import {
  apiFailure,
  automationPermissions as permissions,
  automationProposalDigest as proposalDigest,
  installAutomationRoutes,
} from "./automation-workspace.testSupport";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.describe("automation preview workspace", () => {
  test("keeps approval digest-bound and execution visibly disabled", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions });
    await installAutomationRoutes(page);
    await setQaViewport(page, "desktop");
    await page.goto("/autobot");

    await expect(
      page.getByRole("heading", { level: 1, name: "Central de automações" }),
    ).toBeVisible();
    await expect(
      page.getByText("Modo seguro: execução desativada"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Esta é uma prévia determinística. Nenhum navegador, API externa ou mutação foi executado.",
      ),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Validar/ }).click();
    await page.getByRole("button", { name: "Aprovar plano" }).click();
    const dialog = page.getByRole("dialog", { name: "Aprovar este plano?" });
    await expect(
      dialog.getByText(
        "Mesmo após a aprovação, a execução de ferramentas permanece desativada.",
      ),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Aprovar plano" }).click();
    await expect(page.getByText("Plano aprovado").first()).toBeVisible();
    await expect(page.getByText("Execução: bloqueada")).toBeVisible();
    await expect(page.getByRole("button", { name: /executar/i })).toHaveCount(
      0,
    );

    await expectViewportSafe(page);
    await expectAccessible(page);

    await saveQaScreenshot(page, testInfo, "automation-preview-desktop");
  });

  test("creates only a versioned preview with sanitized context", async ({
    page,
  }) => {
    await installLocalSession(page, { permissions });
    const routes = await installAutomationRoutes(page, { initialRun: null });
    await setQaViewport(page, "desktop");
    await page.goto("/autobot");

    await page.getByRole("button", { name: "Nova automação" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova automação segura" });
    await dialog
      .getByLabel("Objetivo operacional")
      .fill("Revisar anúncios sem fotografia publicada");
    await dialog.getByLabel("Módulo de contexto").fill(" inventory ");
    await dialog.getByLabel("ID do recurso").fill(" listing_42 ");
    await dialog.getByRole("button", { name: "Gerar prévia" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Revisar anúncios sem fotografia publicada",
      }),
    ).toBeVisible();
    expect(routes.requests.create).toEqual([
      {
        context: { module: "inventory", resourceId: "listing_42" },
        objective: "Revisar anúncios sem fotografia publicada",
      },
    ]);
    await expect(page.getByText("Run v1")).toBeVisible();
    await expect(page.getByText("Execução: bloqueada")).toBeVisible();
  });

  test("fails closed when approval digest or cancel version is stale", async ({
    page,
  }) => {
    await installLocalSession(page, { permissions });
    const routes = await installAutomationRoutes(page, {
      failures: {
        approve: apiFailure(
          "AUTOMATION_STALE_APPROVAL",
          "request_stale_digest",
        ),
        cancel: apiFailure("AUTOMATION_STALE_VERSION", "request_stale_version"),
      },
    });
    await setQaViewport(page, "desktop");
    await page.goto("/autobot");

    await page.getByRole("tab", { name: /Validar/ }).click();
    await page.getByRole("button", { name: "Aprovar plano" }).click();
    let dialog = page.getByRole("dialog", { name: "Aprovar este plano?" });
    await dialog.getByRole("button", { name: "Aprovar plano" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(
      page.getByText(/dados mudaram.*request_stale_digest/i),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancelar prévia" }).click();
    dialog = page.getByRole("dialog", { name: "Cancelar esta prévia?" });
    await dialog.getByRole("button", { name: "Cancelar prévia" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(
      page.getByText(/dados mudaram.*request_stale_version/i),
    ).toBeVisible();

    expect(routes.requests.approve).toEqual([
      {
        expectedApprovalVersion: 2,
        expectedProposalDigest: proposalDigest,
        expectedRunVersion: 4,
        expectedStepVersion: 3,
      },
    ]);
    expect(routes.requests.cancel).toEqual([{ expectedRunVersion: 4 }]);
    await expect(page.getByText("Aguardando revisão").first()).toBeVisible();
    await expect(page.getByText("Execução: bloqueada")).toBeVisible();
  });

  test("records a digest-bound rejection and keeps execution blocked", async ({
    page,
  }) => {
    await installLocalSession(page, { permissions });
    const routes = await installAutomationRoutes(page);
    await setQaViewport(page, "desktop");
    await page.goto("/autobot");

    await page.getByRole("tab", { name: /Validar/ }).click();
    await page.getByRole("button", { name: "Rejeitar plano" }).click();
    const dialog = page.getByRole("dialog", { name: "Rejeitar este plano?" });
    await expect(
      dialog.getByText(/gravada na trilha de auditoria/i),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Rejeitar plano" }).click();

    await expect(page.getByText("Rejeitado").first()).toBeVisible();
    expect(routes.requests.reject).toEqual([
      {
        expectedApprovalVersion: 2,
        expectedProposalDigest: proposalDigest,
        expectedRunVersion: 4,
        expectedStepVersion: 3,
      },
    ]);
    await expect(page.getByText("Execução: bloqueada")).toBeVisible();
  });

  test("cancels only the currently reviewed run version", async ({ page }) => {
    await installLocalSession(page, { permissions });
    const routes = await installAutomationRoutes(page);
    await setQaViewport(page, "desktop");
    await page.goto("/autobot");

    await page.getByRole("button", { name: "Cancelar prévia" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancelar esta prévia?" });
    await expect(
      dialog.getByText(/nenhuma etapa poderá ser aprovada/i),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar prévia" }).click();

    expect(routes.requests.cancel).toEqual([{ expectedRunVersion: 4 }]);
    await expect(page.getByText("Cancelado").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancelar prévia" }),
    ).toHaveCount(0);
  });

  test("keeps review visible but every mutation unavailable without permission", async ({
    page,
  }) => {
    await installLocalSession(page, { permissions: ["automation.read"] });
    const routes = await installAutomationRoutes(page);
    await setQaViewport(page, "mobile");
    await page.goto("/autobot");

    await page.getByRole("tab", { name: "Detalhes", exact: true }).click();
    await page.getByRole("tab", { name: /Validar/ }).click();
    await expect(page.getByText(/não registrar a decisão/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nova automação" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cancelar prévia" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Aprovar|Rejeitar/ }),
    ).toHaveCount(0);
    expect(routes.requests.create).toEqual([]);
    expect(routes.requests.approve).toEqual([]);
    expect(routes.requests.reject).toEqual([]);
    expect(routes.requests.cancel).toEqual([]);
    await expectViewportSafe(page);
    await expectAccessible(page);
  });

  test("uses queue, preview and details as focused mobile views", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions });
    await installAutomationRoutes(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setQaViewport(page, "mobile");
    await page.goto("/autobot");

    await expect(
      page.getByRole("tab", { name: "Fila", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Prévia", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Fila", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Prévias recentes" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Revisar veículos sem fotos/ })
      .click();
    await expect(page.getByText("Objetivo solicitado")).toBeVisible();
    await page.getByRole("tab", { name: "Detalhes", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Controle e validação" }),
    ).toBeVisible();

    await saveQaScreenshot(page, testInfo, "automation-preview-mobile");
  });
});
