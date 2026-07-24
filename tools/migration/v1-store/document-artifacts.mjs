import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { legacyMetadata, targetId } from "./common.mjs";
import { addLegacyMap } from "./target-foundation.mjs";
import { log } from "./log.mjs";
import {
  generatedStorageKey,
  planMigratedDocument,
} from "./document-preview-data.mjs";

// Loads R2_* variables from the nearest .env without overriding variables the
// user already exported. DATABASE_URL is intentionally not touched: the
// migration keeps requiring it explicitly in the environment.
export function loadR2Env(startDirectory = process.cwd()) {
  let current = startDirectory;
  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const separator = line.indexOf("=");
        if (separator === -1) continue;
        const key = line.slice(0, separator).trim();
        if (!key.startsWith("R2_") || process.env[key] !== undefined) continue;
        process.env[key] = line
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
      return;
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

export function createArtifactUploader() {
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) return null;
  const client = new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    forcePathStyle: true,
    region: process.env.R2_REGION ?? "auto",
  });
  return {
    bucketName,
    destroy: () => client.destroy(),
    upload: async (storageKey, body, contentType = "application/pdf") => {
      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: bucketName,
          ContentType: contentType,
          Key: storageKey,
        }),
      );
    },
  };
}

export function countDocumentsNeedingUpload(data) {
  return data.documents.filter(
    (document) =>
      planMigratedDocument(document, EMPTY_SCOPE).artifact !== "unavailable",
  ).length;
}

const EMPTY_SCOPE = { documentId: "", storeId: "", tenantId: "" };

export async function seedMigratedDocument(
  tx,
  document,
  config,
  ids,
  uploader,
) {
  const documentId = targetId(config.legacyStoreId, "Document", document.id);
  const scope = { documentId, storeId: ids.store, tenantId: ids.tenant };
  const plan = planMigratedDocument(document, scope);
  let mimeType = "application/pdf";
  let fileSizeBytes = null;

  if (config.apply && plan.artifact !== "unavailable") {
    if (!uploader)
      throw new Error(
        "R2 credentials are required to store migrated documents. Set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ENDPOINT.",
      );
    if (plan.artifact === "generated") {
      const body = await renderMigratedDocumentPdf({
        documentId,
        kind: plan.kind,
        metadata: legacyMetadata("Document", document, plan.metadataExtra),
        status: plan.status,
        title: document.title || document.type,
      });
      await uploader.upload(plan.storageKey, body, "application/pdf");
      fileSizeBytes = body.byteLength;
    } else {
      const fetched = await fetchLegacyArtifact(plan.sourceUrl);
      if (!fetched) {
        log(
          `  Legacy file unavailable for Document ${document.id}; kept as archived stub.`,
        );
        plan.artifact = "unavailable";
        plan.status = "archived";
        plan.storageKey = `legacy-unavailable/v1/Document/${document.id}`;
        plan.metadataExtra = {
          ...plan.metadataExtra,
          artifactAvailable: false,
          legacyFileFetchFailed: true,
        };
      } else {
        mimeType = fetched.mimeType;
        plan.fileName = plan.fileName.replace(
          /\.pdf$/i,
          extensionForMimeType(fetched.mimeType),
        );
        plan.storageKey = generatedStorageKey(scope, plan.fileName);
        await uploader.upload(plan.storageKey, fetched.body, fetched.mimeType);
        fileSizeBytes = fetched.body.byteLength;
      }
    }
  }

  const metadata = legacyMetadata("Document", document, plan.metadataExtra);
  const title = document.title || document.type;
  await tx`INSERT INTO documents
    (id, created_by_user_id, file_name, file_size_bytes, kind, metadata, mime_type, status, storage_key, store_id, tenant_id, title, uploaded_at, created_at, updated_at)
    VALUES (${documentId}, ${ids.users.get(document.sellerId) || null}, ${plan.fileName}, ${fileSizeBytes}, ${plan.kind},
      ${tx.json(metadata)}, ${mimeType}, ${plan.status}, ${plan.storageKey}, ${ids.store}, ${ids.tenant}, ${title},
      ${document.occurredAt || document.createdAt}, ${document.createdAt}, ${document.updatedAt})
    ON CONFLICT (id) DO UPDATE SET file_name=excluded.file_name, file_size_bytes=excluded.file_size_bytes,
      metadata=excluded.metadata, mime_type=excluded.mime_type, status=excluded.status, storage_key=excluded.storage_key, title=excluded.title, updated_at=excluded.updated_at`;
  const targets = [
    ["vehicle_unit", ids.units.get(document.veiculoId)],
    ["lead", ids.leads.get(document.leadId)],
    ["sale", ids.sales.get(document.saleId)],
  ].filter(([, id]) => id);
  if (!targets.length) targets.push(["store", ids.store]);
  for (const [type, id] of targets)
    await tx`INSERT INTO document_links
    (id, document_id, link_role, store_id, target_id, target_type, tenant_id, created_at, updated_at)
    VALUES (${targetId(config.legacyStoreId, `DocumentLink:${type}`, document.id)}, ${documentId}, 'primary', ${ids.store}, ${id}, ${type}, ${ids.tenant}, ${document.createdAt}, ${document.updatedAt})
    ON CONFLICT (id) DO NOTHING`;
  await addLegacyMap(
    tx,
    ids.run,
    "Document",
    document.id,
    "documents",
    documentId,
  );
  return plan;
}

const mimeTypeExtensions = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function extensionForMimeType(mimeType) {
  return mimeTypeExtensions[mimeType] ?? ".pdf";
}

async function fetchLegacyArtifact(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const mimeType = mimeTypeExtensions[contentType]
      ? contentType
      : "application/pdf";
    return {
      body: new Uint8Array(await response.arrayBuffer()),
      mimeType,
    };
  } catch {
    return null;
  }
}

// Port of apps/api buildDocumentPreview + renderDocumentPreviewPdf so the
// migrated artifact matches what V2 regeneration would produce later.
export async function renderMigratedDocumentPdf({
  documentId,
  kind,
  metadata,
  status,
  title,
}) {
  const sections = [
    {
      heading: "Documento",
      lines: [
        `Título: ${title}`,
        `Tipo: ${kindLabels[kind] ?? kind}`,
        `Status: ${statusLabels[status] ?? status}`,
        `Modelo: ${metadata.templateTitle ?? "-"}`,
      ],
    },
    { heading: "Comprador", lines: partyLines(metadata.buyer) },
    { heading: "Veículo", lines: vehicleLines(metadata.vehicle) },
    { heading: "Valores", lines: financeLines(metadata.finance) },
    {
      heading: "Cláusulas",
      lines:
        Array.isArray(metadata.templateClauses) &&
        metadata.templateClauses.length
          ? metadata.templateClauses
          : ["-"],
    },
  ];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 790;
  page.drawText(winAnsi(title).slice(0, 90), {
    color: rgb(0.05, 0.09, 0.16),
    font: bold,
    size: 18,
    x: 48,
    y,
  });
  y -= 24;
  page.drawText(`Documento ${documentId}`, {
    color: rgb(0.34, 0.39, 0.45),
    font: regular,
    size: 8,
    x: 48,
    y,
  });
  y -= 28;
  for (const section of sections) {
    page.drawText(winAnsi(section.heading), {
      color: rgb(0.02, 0.48, 0.28),
      font: bold,
      size: 11,
      x: 48,
      y,
    });
    y -= 15;
    for (const line of section.lines) {
      page.drawText(winAnsi(line).slice(0, 110), {
        font: regular,
        size: 9,
        x: 60,
        y,
      });
      y -= 12;
    }
    y -= 8;
  }
  return pdf.save();
}

// Standard Helvetica only encodes WinAnsi (CP1252); legacy data may carry
// emoji or other symbols, which are replaced so rendering never fails.
function winAnsi(value) {
  return String(value ?? "").replace(
    /[^\t\n\r -~\u00a0-\u00ff\u2013\u2014\u2018-\u201d\u2022\u2026\u20ac\u2122]/g,
    "?",
  );
}

const kindLabels = {
  buyer_document: "Cadastro comprador",
  consignment_contract: "Contrato de consignação",
  delivery_term: "Termo de entrega",
  finance_receipt: "Financeiro",
  inspection: "Vistoria",
  internal: "Interno",
  invoice: "Nota fiscal",
  other: "Outro",
  power_of_attorney: "Procuração",
  reservation_receipt: "Reserva",
  sale_contract: "Contrato",
  sale_receipt: "Recibo",
  test_drive: "Test drive",
  vehicle_registration: "Documento da unidade",
  warranty_certificate: "Certificado de garantia",
};

const statusLabels = {
  archived: "Arquivado",
  draft: "Rascunho",
  issued: "Emitido",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  voided: "Cancelado",
};

function partyLines(party = {}) {
  return [
    `Nome: ${text(party.name)}`,
    `Documento: ${text(party.document)}`,
    `Telefone: ${text(party.phone)}`,
    `Email: ${text(party.email)}`,
  ];
}

function vehicleLines(vehicle = {}) {
  return [
    `Título: ${text(vehicle.title)}`,
    `Placa: ${text(vehicle.plate)}`,
    `Chassi/VIN: ${text(vehicle.vin)}`,
  ];
}

function financeLines(finance = {}) {
  return [
    `Forma de pagamento: ${text(finance.paymentMethod)}`,
    `Valor do sinal: ${money(finance.signalAmountCents)}`,
    `Valor pago: ${money(finance.paidAmountCents)}`,
    `Valor total: ${money(finance.totalAmountCents ?? finance.salePriceCents)}`,
  ];
}

function money(value) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function text(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}
