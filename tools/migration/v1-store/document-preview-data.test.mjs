import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPreviewData,
  generatedStorageKey,
  mapDocumentStatus,
  planMigratedDocument,
} from "./document-preview-data.mjs";

const scope = { documentId: "doc-1", storeId: "store-1", tenantId: "tenant-1" };

const saleRecordDocument = {
  id: 42,
  pdfData: {
    saleRecord: {
      buyerCpf: "014.980.549-78",
      buyerEmail: "buyer@example.com",
      buyerName: "Jessica Denig",
      buyerPhone1: "(44) 99999-0000",
      notes: null,
      payments: [
        { method: "TROCA", value: 25000 },
        { method: "CARTAO_CREDITO", value: 2500 },
      ],
      salePrice: 27500,
      vehicleSnapshot: {
        chassi: "9BGTS75COBC124520",
        placa_final: "AWR0667",
        titulo_anuncio: "Chevrolet Zafira Confort",
      },
    },
    schemaVersion: 1,
  },
  pdfR2Key: null,
  pdfUrl: null,
  status: "GENERATED",
  title: "Certificado de garantia — Jessica Denig",
  type: "WARRANTY_CERTIFICATE",
};

test("extractPreviewData maps saleRecord payload to the V2 preview contract", () => {
  const preview = extractPreviewData(saleRecordDocument);
  assert.equal(preview.templateTitle, "Certificado de garantia");
  assert.deepEqual(preview.buyer, {
    document: "014.980.549-78",
    email: "buyer@example.com",
    name: "Jessica Denig",
    phone: "(44) 99999-0000",
  });
  assert.deepEqual(preview.vehicle, {
    plate: "AWR0667",
    title: "Chevrolet Zafira Confort",
    vin: "9BGTS75COBC124520",
  });
  assert.equal(preview.finance.totalAmountCents, 2750000);
  assert.equal(preview.finance.paidAmountCents, 2750000);
  assert.equal(preview.finance.paymentMethod, "TROCA, CARTAO_CREDITO");
});

test("extractPreviewData maps test drive payload", () => {
  const preview = extractPreviewData({
    pdfData: {
      date: "2026-06-22",
      departureTime: "17:05",
      driver: {
        cpf: "059.947.339-89",
        email: "rodrigo@example.com",
        name: "Rodrigo Lima",
        phone: "(44) 98821-2673",
      },
      returnTime: null,
    },
    type: "TEST_DRIVE",
  });
  assert.equal(preview.templateTitle, "Termo de test drive");
  assert.equal(preview.buyer.name, "Rodrigo Lima");
  assert.deepEqual(preview.templateClauses, [
    "Data: 2026-06-22",
    "Saída: 17:05",
    "Retorno: -",
  ]);
});

test("extractPreviewData maps reservation and simulation payloads", () => {
  const reservation = extractPreviewData({
    pdfData: {
      reservationRecord: {
        buyerCpf: "111",
        buyerName: "Reserva",
        salePrice: 10000,
        sinalAmount: 500,
        veiculo: { placa_final: "ABC1234" },
      },
    },
    type: "RESERVATION_RECEIPT",
  });
  assert.equal(reservation.finance.signalAmountCents, 50000);
  assert.equal(reservation.finance.totalAmountCents, 1000000);
  assert.equal(reservation.vehicle.plate, "ABC1234");

  const simulation = extractPreviewData({
    pdfData: {
      customerCpf: "222",
      customerName: "Simulado",
      downPayment: 1000,
      installments: 36,
      vehicleValue: 40000,
    },
    type: "FINANCING_SIMULATION",
  });
  assert.equal(simulation.finance.paymentMethod, "36x");
  assert.equal(simulation.finance.totalAmountCents, 4000000);
});

test("planMigratedDocument marks legacy R2 files for copy into V2 storage", () => {
  const plan = planMigratedDocument(
    {
      id: 7,
      pdfData: {},
      pdfR2Key: "lojas/200/documentos/crlv-7.pdf",
      pdfUrl: "https://cdn.example/crlv-7.pdf",
      status: "DOWNLOADED",
      type: "CRLV",
    },
    scope,
  );
  assert.equal(plan.artifact, "legacy-file");
  assert.equal(plan.sourceUrl, "https://cdn.example/crlv-7.pdf");
  assert.equal(
    plan.metadataExtra.legacyStorageKey,
    "lojas/200/documentos/crlv-7.pdf",
  );
  assert.equal(
    plan.storageKey,
    "tenants/tenant-1/stores/store-1/documents/doc-1/versions/migrated-v1-crlv-7.pdf",
  );
  assert.equal(plan.status, "issued");
  assert.equal(plan.kind, "vehicle_registration");
  assert.equal(plan.metadataExtra.artifactAvailable, true);
});

test("planMigratedDocument renders generated documents with renderer metadata", () => {
  const plan = planMigratedDocument(saleRecordDocument, scope);
  assert.equal(plan.artifact, "generated");
  assert.equal(plan.status, "issued");
  assert.equal(plan.kind, "warranty_certificate");
  assert.equal(plan.metadataExtra.renderer, "metadata-summary-pdf");
  assert.equal(
    plan.storageKey,
    "tenants/tenant-1/stores/store-1/documents/doc-1/versions/migrated-v1-certificado-de-garantia-jessica-denig-42.pdf",
  );
});

test("planMigratedDocument archives documents without file or payload", () => {
  const plan = planMigratedDocument(
    {
      id: 9,
      pdfData: {},
      pdfR2Key: null,
      pdfUrl: null,
      status: "GENERATED",
      type: "OTHER",
    },
    scope,
  );
  assert.equal(plan.artifact, "unavailable");
  assert.equal(plan.status, "archived");
  assert.equal(plan.storageKey, "legacy-unavailable/v1/Document/9");
});

test("mapDocumentStatus maps every V1 status", () => {
  assert.equal(mapDocumentStatus("GENERATED"), "issued");
  assert.equal(mapDocumentStatus("DOWNLOADED"), "issued");
  assert.equal(mapDocumentStatus("SIGNED"), "signed");
  assert.equal(mapDocumentStatus("ARCHIVED"), "archived");
  assert.equal(mapDocumentStatus("CANCELLED"), "voided");
});

test("generatedStorageKey is deterministic and sanitized", () => {
  assert.equal(
    generatedStorageKey(scope, "Contrato João & Maria.pdf"),
    generatedStorageKey(scope, "Contrato João & Maria.pdf"),
  );
  assert.match(
    generatedStorageKey(scope, "Contrato João & Maria.pdf"),
    /^tenants\/tenant-1\/stores\/store-1\/documents\/doc-1\/versions\/migrated-v1-[\w.-]+$/,
  );
});
