import { mapDocumentKind } from "./common.mjs";

// Renderer key understood by apps/api documentRegeneration.ts.
export const MIGRATION_RENDERER = "metadata-summary-pdf";

const templateTitles = {
  DELIVERY_TERM: "Termo de entrega",
  FINANCING_SIMULATION: "Simulação de financiamento",
  POWER_OF_ATTORNEY: "Procuração",
  RESERVATION_RECEIPT: "Recibo de reserva",
  SALE_CONTRACT: "Contrato de compra e venda",
  SALE_CONTRACT_NO_ESTADO: "Contrato de compra e venda (sem estado)",
  SALE_RECEIPT: "Recibo de venda",
  TEST_DRIVE: "Termo de test drive",
  WARRANTY_CERTIFICATE: "Certificado de garantia",
};

const documentStatuses = {
  ARCHIVED: "archived",
  CANCELLED: "voided",
  DOWNLOADED: "issued",
  GENERATED: "issued",
  SIGNED: "signed",
};

export function mapDocumentStatus(status) {
  return documentStatuses[String(status ?? "").toUpperCase()] ?? "issued";
}

// Decides how a V1 document becomes a V2 artifact:
// - "legacy-file": V1 stored the file in R2; the same bucket serves V2.
// - "generated": no file exists; V1 rendered on the fly from pdfData, so the
//   migration renders a PDF and stores the structured data V2 needs to
//   preview/regenerate it.
// - "unavailable": no file and no structured data; kept as archived stub.
export function planMigratedDocument(document, scope) {
  const fileName = `${document.title || document.type}-${document.id}.pdf`;
  const kind = mapDocumentKind(document.type);
  const status = mapDocumentStatus(document.status);
  const base = { document, fileName, kind, status };

  if (document.pdfR2Key) {
    // V1 files are not in the V2 bucket, so the migration copies the bytes
    // from the public V1 URL into a deterministic V2 key (see seeder).
    return {
      ...base,
      artifact: "legacy-file",
      metadataExtra: {
        artifactAvailable: true,
        legacyPublicUrl: document.pdfUrl || null,
        legacyStorageKey: document.pdfR2Key,
      },
      sourceUrl: document.pdfUrl || null,
      storageKey: generatedStorageKey(scope, fileName),
    };
  }

  const preview = extractPreviewData(document);
  if (preview) {
    return {
      ...base,
      artifact: "generated",
      metadataExtra: {
        artifactAvailable: true,
        legacyPublicUrl: null,
        renderer: MIGRATION_RENDERER,
        ...preview,
      },
      storageKey: generatedStorageKey(scope, fileName),
    };
  }

  return {
    ...base,
    artifact: "unavailable",
    metadataExtra: {
      artifactAvailable: false,
      legacyPublicUrl: document.pdfUrl || null,
    },
    status: "archived",
    storageKey: `legacy-unavailable/v1/Document/${document.id}`,
  };
}

export function generatedStorageKey(scope, fileName) {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "documents",
    scope.documentId,
    "versions",
    `migrated-v1-${sanitizeSegment(fileName)}`,
  ].join("/");
}

function sanitizeSegment(value) {
  const cleaned = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || "document.pdf";
}

// Mirrors the metadata contract read by apps/api documentPreview.ts:
// buyer, vehicle, finance, templateTitle, templateClauses.
export function extractPreviewData(document) {
  const pdfData = document.pdfData;
  if (!pdfData || typeof pdfData !== "object" || Array.isArray(pdfData))
    return null;
  const templateTitle =
    templateTitles[String(document.type).toUpperCase()] ??
    document.title ??
    String(document.type);

  if (pdfData.saleRecord)
    return { templateTitle, ...fromSaleRecord(pdfData.saleRecord) };
  if (pdfData.reservationRecord)
    return { templateTitle, ...fromReservation(pdfData.reservationRecord) };
  if (pdfData.driver) return { templateTitle, ...fromTestDrive(pdfData) };
  if (pdfData.customerName || pdfData.simulationUuid)
    return { templateTitle, ...fromSimulation(pdfData) };
  return null;
}

function fromSaleRecord(record) {
  const payments = Array.isArray(record.payments) ? record.payments : [];
  const methods = [
    ...new Set(payments.map((payment) => payment?.method).filter(Boolean)),
  ];
  return {
    buyer: {
      document: textOrNull(record.buyerCpf),
      email: textOrNull(record.buyerEmail),
      name: textOrNull(record.buyerName),
      phone: textOrNull(record.buyerPhone1),
    },
    finance: {
      paidAmountCents: toCents(
        payments.reduce(
          (total, payment) => total + Number(payment?.value || 0),
          0,
        ),
      ),
      paymentMethod: methods.length ? methods.join(", ") : null,
      signalAmountCents: null,
      totalAmountCents: toCents(record.salePrice),
    },
    templateClauses: textOrNull(record.notes) ? [String(record.notes)] : [],
    vehicle: vehicleSnapshot(record.vehicleSnapshot),
  };
}

function fromReservation(record) {
  return {
    buyer: {
      document: textOrNull(record.buyerCpf),
      email: textOrNull(record.buyerEmail),
      name: textOrNull(record.buyerName),
      phone: textOrNull(record.buyerPhone1),
    },
    finance: {
      paidAmountCents: null,
      paymentMethod: null,
      signalAmountCents: toCents(record.sinalAmount),
      totalAmountCents: toCents(record.salePrice),
    },
    templateClauses: textOrNull(record.notes) ? [String(record.notes)] : [],
    vehicle: vehicleSnapshot(record.veiculo),
  };
}

function fromTestDrive(pdfData) {
  const driver = pdfData.driver ?? {};
  return {
    buyer: {
      document: textOrNull(driver.cpf),
      email: textOrNull(driver.email),
      name: textOrNull(driver.name),
      phone: textOrNull(driver.phone),
    },
    finance: {},
    templateClauses: [
      `Data: ${pdfData.date ?? "-"}`,
      `Saída: ${pdfData.departureTime ?? "-"}`,
      `Retorno: ${pdfData.returnTime ?? "-"}`,
    ],
    vehicle: {},
  };
}

function fromSimulation(pdfData) {
  return {
    buyer: {
      document: textOrNull(pdfData.customerCpf),
      email: null,
      name: textOrNull(pdfData.customerName),
      phone: null,
    },
    finance: {
      paidAmountCents: null,
      paymentMethod: pdfData.installments ? `${pdfData.installments}x` : null,
      signalAmountCents: toCents(pdfData.downPayment),
      totalAmountCents: toCents(pdfData.vehicleValue),
    },
    templateClauses: [],
    vehicle: {},
  };
}

function vehicleSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return {};
  const title =
    textOrNull(snapshot.titulo_anuncio) ??
    textOrNull(
      [snapshot.marca, snapshot.modelo, snapshot.ano_modelo]
        .filter(Boolean)
        .join(" "),
    );
  return {
    plate: textOrNull(snapshot.placa_final ?? snapshot.placa),
    title,
    vin: textOrNull(snapshot.chassi),
  };
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toCents(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
