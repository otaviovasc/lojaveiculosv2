import assert from "node:assert/strict";
import test from "node:test";
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
