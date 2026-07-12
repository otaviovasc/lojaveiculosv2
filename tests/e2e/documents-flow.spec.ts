import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { accountHeaders, qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const documentOwnerPermissions = [
  "documents.download",
  "documents.preview",
  "documents.read",
  "documents.regenerate",
  "documents.template_update",
  "documents.update_links",
  "documents.update_metadata",
  "documents.upload",
  "documents.void",
  "inventory.read",
];

test.describe("documents center QA flow", () => {
  test("shows the restricted state without documents.read", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions: ["inventory.read"] });
    await page.goto("/documents");

    await expect(page.getByText("Acesso restrito")).toBeVisible();
    await expect(page.getByText("Missing permission")).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "documents-restricted-after");
  });

  test("covers list, detail, templates, upload, download, links, delete, and mobile folders", async ({
    page,
    request,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await installLocalSession(page, {
      permissions: documentOwnerPermissions,
      persona: qaPersonas.owner,
    });
    await page.route(
      /https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/.*/,
      async (route) => {
        if (route.request().method() !== "PUT") {
          await route.continue();
          return;
        }
        await route.fulfill({
          headers: { etag: '"qa-document-upload"' },
          status: 200,
        });
      },
    );
    await page.goto("/documents");

    await expect(page.getByRole("heading", { name: "Geral" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar documento" }),
    ).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.setViewportSize({ height: 900, width: 1100 });
    const unitColumnHeader = page
      .locator("thead th.documents-table-wide-only")
      .filter({ hasText: "Unidade" });
    await expect(unitColumnHeader).toHaveCount(1);
    await expect(unitColumnHeader).toBeHidden();
    await expect(
      page.getByRole("columnheader", { name: "Tipo" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "documents-table-tablet-after");
    await setQaViewport(page, "desktop");
    await saveQaScreenshot(page, testInfo, "documents-list-after");

    const documentsResponse = await request.get("/api/v1/documents", {
      headers: {
        ...accountHeaders(qaPersonas.owner),
        "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
      },
    });
    expect(documentsResponse.status()).toBe(200);
    expect((await documentsResponse.json()).documents.length).toBeGreaterThan(
      0,
    );

    const seededDocumentRow = page
      .locator("tbody tr", { hasText: "Comprovante de pagamento" })
      .first();
    await expect(seededDocumentRow).toBeVisible();
    await seededDocumentRow.click();
    await expect(page.getByLabel("Documento aberto")).toBeVisible();
    await expect(page.getByText("Emitido").first()).toBeVisible();
    await expect(page.getByText("finance_receipt")).toHaveCount(0);
    await expect(page.getByText("issued")).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "document-detail-after");

    const downloadResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/documents/") &&
        response.url().includes("/download") &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: "Baixar" }).first().click();
    await downloadResponse;

    await page.getByRole("button", { name: "Gerenciar vínculos" }).click();
    await expect(
      page.getByRole("dialog", { name: "Gerenciar vínculos do documento" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "manage-links-after");
    await page.getByRole("button", { exact: true, name: "Fechar" }).click();

    await page.getByRole("button", { name: "Fechar detalhes" }).click();
    await page.getByRole("button", { name: "Modelos" }).click();
    await expect(page.getByText("Document builder")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Blocos do documento" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "document-templates-after");
    await page.getByRole("button", { name: "Voltar para documentos" }).click();
    await expect(page.getByRole("heading", { name: "Geral" })).toBeVisible();

    const uploadTitle = `QA documento ${Date.now()}`;
    const pdfPath = testInfo.outputPath("sample-document.pdf");
    await writeFile(
      pdfPath,
      Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"),
    );

    await page.getByRole("button", { name: "Enviar documento" }).click();
    await expect(
      page.getByRole("dialog", { name: "Anexar documentos" }),
    ).toBeVisible();
    await page
      .getByLabel("Selecionar documentos para envio")
      .setInputFiles(pdfPath);
    await page
      .getByRole("textbox", { name: /Título do arquivo/ })
      .fill(uploadTitle);
    await saveQaScreenshot(page, testInfo, "upload-dialog-after");
    const uploadDialog = page.getByRole("dialog", {
      name: "Anexar documentos",
    });
    const uploadResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/documents/uploads") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );
    const saveUploadButton = uploadDialog.getByRole("button", {
      name: "Salvar documento",
    });
    await expect(saveUploadButton).toBeEnabled();
    await saveUploadButton.click();
    await uploadResponse;
    await expect(
      page.getByRole("dialog", { name: "Anexar documentos" }),
    ).toHaveCount(0);
    const uploadedRow = page
      .locator("tbody tr", { hasText: uploadTitle })
      .first();
    await expect(uploadedRow).toBeVisible();
    await uploadedRow.click();
    await page
      .getByLabel("Documento aberto")
      .getByRole("button", { exact: true, name: "Excluir" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Excluir documento" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "delete-dialog-after");
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Cancelado").first()).toBeVisible();

    await setQaViewport(page, "mobile");
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "Geral" })).toBeVisible();
    await expect(page.getByLabel("Ações rápidas")).toHaveCount(0);
    await page.getByRole("button", { name: "Pastas" }).click();
    await expect(
      page.getByRole("dialog", { name: "Pastas de documentos" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "documents-mobile-after");

    expectNoPageCrashes(diagnostics);
  });
});
