import { mapDocumentKind } from "./common.mjs";

// Renderer keys understood by apps/api documentRegeneration.ts.
export const MIGRATION_RENDERER = "metadata-summary-pdf";
export const WORKFLOW_MIGRATION_RENDERER = "react-pdf";

const workflowDocumentKinds = new Set([
  "delivery_term",
  "power_of_attorney",
  "reservation_receipt",
  "sale_contract",
  "sale_receipt",
]);

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
export function planMigratedDocument(document, scope, migrationContext = {}) {
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

  const preview = extractPreviewData(document, migrationContext);
  if (preview) {
    return {
      ...base,
      artifact: "generated",
      metadataExtra: {
        artifactAvailable: true,
        legacyPublicUrl: null,
        renderer: workflowDocumentKinds.has(kind)
          ? WORKFLOW_MIGRATION_RENDERER
          : MIGRATION_RENDERER,
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
export function extractPreviewData(document, migrationContext = {}) {
  const pdfData = document.pdfData;
  if (!pdfData || typeof pdfData !== "object" || Array.isArray(pdfData))
    return null;
  const templateTitle =
    templateTitles[String(document.type).toUpperCase()] ??
    document.title ??
    String(document.type);

  if (pdfData.saleRecord)
    return {
      templateTitle,
      ...fromSaleRecord(pdfData.saleRecord),
      generatedAt: document.occurredAt ?? document.createdAt,
      store: storeSnapshot(migrationContext),
    };
  if (pdfData.reservationRecord)
    return {
      templateTitle,
      ...fromReservation(pdfData.reservationRecord),
      generatedAt: document.occurredAt ?? document.createdAt,
      store: storeSnapshot(migrationContext),
    };
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
      address: textOrNull(record.buyerAddress),
      cep: textOrNull(record.buyerCep),
      city: textOrNull(record.buyerCity),
      document: textOrNull(record.buyerCpf),
      documentType: textOrNull(record.buyerDocumentType),
      email: textOrNull(record.buyerEmail),
      maritalStatus: textOrNull(record.buyerEstadoCivil),
      name: textOrNull(record.buyerName),
      nationality: textOrNull(record.buyerNacionalidade),
      phone: textOrNull(record.buyerPhone1),
      phone2: textOrNull(record.buyerPhone2),
      phone3: textOrNull(record.buyerPhone3),
      profession: textOrNull(record.buyerProfissao),
      state: textOrNull(record.buyerState),
    },
    finance: {
      discountCents: toCents(record.discount),
      paidAmountCents: toCents(
        payments.reduce(
          (total, payment) => total + Number(payment?.value || 0),
          0,
        ),
      ),
      paymentMethod: methods.length ? methods.join(", ") : null,
      payments: payments.map((payment) => ({
        amountCents: toCents(payment?.value),
        description: textOrNull(payment?.description),
        method: textOrNull(payment?.method),
        paidAt: payment?.date ?? null,
        tradeInVehicle: payment?.metadata?.tradeInVehicle ?? null,
      })),
      salePriceCents: toCents(record.salePrice),
      signalAmountCents: null,
      tablePriceCents: toCents(record.tablePrice),
      totalAmountCents: toCents(record.salePrice),
    },
    notes: textOrNull(record.notes),
    saleCode: textOrNull(record.id),
    sellerName: textOrNull(record.sellerName),
    templateClauses: [],
    transfer: {
      crvCpf: textOrNull(record.crvCpf),
      crvName: textOrNull(record.crvName),
      status: textOrNull(record.transferStatus),
      valueCents: toCents(record.transferValue),
    },
    vehicle: vehicleSnapshot(record.vehicleSnapshot),
    witnesses: [record.witness1Name, record.witness2Name].filter(Boolean),
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
    brand: textOrNull(snapshot.marca),
    color: textOrNull(snapshot.cor),
    fuelType: textOrNull(snapshot.combustivel),
    km: numberOrNull(snapshot.km),
    laudo: textOrNull(snapshot.laudo),
    manufactureYear: numberOrNull(snapshot.ano_fabricacao),
    model: textOrNull(snapshot.modelo),
    modelYear: numberOrNull(snapshot.ano_modelo),
    plate: textOrNull(snapshot.placa_final ?? snapshot.placa),
    renavam: textOrNull(snapshot.renavam),
    title,
    trimName: textOrNull(snapshot.versao),
    vin: textOrNull(snapshot.chassi),
  };
}

function storeSnapshot({ store, settings } = {}) {
  const customization = objectOrEmpty(store?.customization);
  const footer = objectOrEmpty(customization.footer);
  const contact = objectOrEmpty(customization.contact);
  const contactExtras = objectOrEmpty(customization.contact_extras);
  const owner = objectOrEmpty(store?.user);
  const ownerAddress = objectOrEmpty(owner.address);
  const address =
    textOrNull(contactExtras.address_full) ??
    textOrNull(
      [
        ownerAddress.street ?? ownerAddress.address,
        ownerAddress.number,
        ownerAddress.city ?? settings?.cidade,
        ownerAddress.state ?? settings?.estado,
      ]
        .filter(Boolean)
        .join(", "),
    );
  return {
    address,
    city: textOrNull(ownerAddress.city ?? settings?.cidade),
    document: textOrNull(footer.cnpj ?? owner.cpfCnpj),
    instagram: textOrNull(settings?.instagram_url),
    logoUrl: textOrNull(customization.logo_url),
    name: textOrNull(store?.nome_da_loja ?? settings?.profile_name),
    phone: textOrNull(
      settings?.whatsapp_number ??
        contact.whatsapp ??
        contact.phone ??
        owner.phone,
    ),
    state: textOrNull(ownerAddress.state ?? settings?.estado),
  };
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
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

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
