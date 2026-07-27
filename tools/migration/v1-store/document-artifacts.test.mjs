import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { renderMigratedDocumentPdf } from "./document-artifacts.mjs";

test("renderMigratedDocumentPdf renders the preview sections", async () => {
  const body = await renderMigratedDocumentPdf({
    documentId: "doc-1",
    kind: "warranty_certificate",
    metadata: {
      buyer: {
        document: "014.980.549-78",
        email: "buyer@example.com",
        name: "Jessica Denig",
        phone: "(44) 99999-0000",
      },
      finance: { paidAmountCents: 2750000, totalAmountCents: 2750000 },
      templateClauses: [],
      templateTitle: "Certificado de garantia",
      vehicle: { plate: "AWR0667", title: "Zafira", vin: "9BG" },
    },
    status: "issued",
    title: "Certificado de garantia — Jessica Denig",
  });
  assert.ok(body instanceof Uint8Array);
  assert.ok(body.byteLength > 500);
});

test("renderMigratedDocumentPdf survives emoji and non-WinAnsi characters", async () => {
  const body = await renderMigratedDocumentPdf({
    documentId: "doc-2",
    kind: "sale_contract",
    metadata: {
      buyer: { name: "João 💥 da Silva — “aspas” €" },
      finance: {},
      templateClauses: ["cláusula com emoji 🚗✨"],
      templateTitle: "Contrato 💥",
      vehicle: {},
    },
    status: "issued",
    title: "Contrato 💥 Teste",
  });
  assert.ok(body.byteLength > 500);
});

test("renderMigratedDocumentPdf renders migrated sale contracts with the V1-style template", async () => {
  const body = await renderMigratedDocumentPdf({
    documentId: "doc-sale-contract",
    kind: "sale_contract",
    metadata: {
      buyer: {
        address: "Rua das Flores, 123",
        city: "Maringá",
        document: "123.456.789-00",
        name: "Cliente Teste",
        state: "PR",
      },
      finance: {
        payments: [
          {
            amountCents: 7500000,
            method: "PIX",
            paidAt: "2026-07-17T12:00:00.000Z",
          },
        ],
        salePriceCents: 7500000,
        tablePriceCents: 7900000,
      },
      generatedAt: "2026-07-17T15:00:00.000Z",
      renderer: "react-pdf",
      saleCode: "207",
      store: {
        city: "Maringá",
        name: "MB Auto Store",
        state: "PR",
      },
      templateClauses: [],
      templateTitle: "Contrato de compra e venda",
      vehicle: {
        color: "Branco",
        km: 52481,
        manufactureYear: 2024,
        modelYear: 2025,
        plate: "ABC1D23",
        title: "Veículo de teste",
        vin: "9BW00000000000000",
      },
    },
    status: "issued",
    title: "Contrato — Cliente Teste",
  });

  assert.equal(Buffer.from(body.subarray(0, 4)).toString("utf8"), "%PDF");
  assert.ok(body.byteLength > 10_000);
  const pdf = await PDFDocument.load(body);
  assert.ok(pdf.getPageCount() > 1);
  assert.equal(pdf.getAuthor(), "MB Auto Store");
  assert.equal(pdf.getCreator(), "Loja Veículos OS");
});
