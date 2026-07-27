import { json, targetId } from "./common.mjs";

export function reconcileSpedyFiscalDocuments(
  legacyRows,
  productRows,
  serviceRows,
  config,
) {
  const providerRows = [
    ...productRows.map((row) => ({ kind: "nfe", row })),
    ...serviceRows.map((row) => ({ kind: "nfse", row })),
  ];
  const byProviderId = new Map(
    legacyRows
      .filter((row) => row.invoiceId)
      .map((row) => [String(row.invoiceId), row]),
  );
  const matchedLegacyIds = new Set();
  const reconciled = providerRows.map(({ kind, row }) => {
    const providerDocumentId = requiredString(
      row.id ?? row.documentId ?? row.providerDocumentId,
      "Spedy invoice id",
    );
    const legacy = byProviderId.get(providerDocumentId);
    if (legacy) matchedLegacyIds.add(legacy.id);
    return {
      accessKey: stringValue(row.accessKey ?? row.chaveAcesso),
      createdAt:
        dateValue(row.createdAt ?? row.effectiveDate) ??
        legacy?.createdAt ??
        new Date(),
      documentKind: kind,
      id: legacy
        ? targetId(config.legacyStoreId, "FiscalDocument", legacy.id)
        : targetId(
            config.legacyStoreId,
            "SpedyFiscalDocument",
            providerDocumentId,
          ),
      issuedAt:
        dateValue(row.issuedAt ?? row.authorizedAt) ?? legacy?.issuedAt ?? null,
      legacy,
      metadata: {
        providerNumber: row.number ?? null,
        providerSourceOfTruth: true,
        reconciliationStatus: legacy ? "matched" : "provider_only",
      },
      providerDocumentId,
      status: mapStatus(row.status ?? json(row.processingDetail).status),
      updatedAt: dateValue(row.updatedAt) ?? legacy?.updatedAt ?? new Date(),
    };
  });

  for (const legacy of legacyRows) {
    if (matchedLegacyIds.has(legacy.id)) continue;
    reconciled.push({
      accessKey: legacy.accessKey || null,
      createdAt: legacy.createdAt,
      documentKind: normalizeFiscalKind(legacy.docType),
      id: targetId(config.legacyStoreId, "FiscalDocument", legacy.id),
      issuedAt: null,
      legacy,
      metadata: {
        providerSourceOfTruth: false,
        reconciliationStatus: "not_found_at_spedy",
      },
      providerDocumentId: legacy.invoiceId || null,
      status: "error",
      updatedAt: legacy.updatedAt,
    });
  }
  return reconciled;
}

export function preserveLegacyFiscalDocuments(legacyRows, config) {
  return legacyRows.map((legacy) => {
    const normalizedStatus = safeLegacyStatus(legacy.status);
    return {
      accessKey: legacy.accessKey || null,
      createdAt: legacy.createdAt,
      documentKind: normalizeFiscalKind(legacy.docType),
      id: targetId(config.legacyStoreId, "FiscalDocument", legacy.id),
      issuedAt: legacy.issuedAt || null,
      legacy,
      metadata: {
        legacyStatus: String(legacy.status ?? ""),
        providerSourceOfTruth: false,
        reconciliationStatus: "provider_unavailable",
      },
      providerDocumentId: legacy.invoiceId || null,
      status: normalizedStatus,
      updatedAt: legacy.updatedAt,
    };
  });
}

export function normalizeFiscalKind(value) {
  const kind = String(value ?? "").toLowerCase();
  if (kind === "nfe" || kind === "nfse") return kind;
  throw new Error(`Unsupported V1 fiscal document kind: ${String(value)}`);
}

export function requiredString(value, label) {
  const result = stringValue(value);
  if (!result)
    throw new Error(`${label} is missing from the V1 fiscal config.`);
  return result;
}

function mapStatus(value) {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["created", "enqueued", "pending", "queued"].includes(status))
    return "queued";
  if (["received", "processing", "incontingent"].includes(status))
    return "processing";
  if (["authorized", "issued"].includes(status)) return "authorized";
  if (["rejected", "denied"].includes(status)) return "rejected";
  if (["cancelled", "canceled", "disabled", "removed"].includes(status))
    return "cancelled";
  if (["error", "failed"].includes(status)) return "error";
  throw new Error(
    `Unsupported Spedy fiscal status during migration: ${status}`,
  );
}

function safeLegacyStatus(value) {
  try {
    return mapStatus(value);
  } catch {
    return "error";
  }
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
