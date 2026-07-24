import { createHash } from "node:crypto";

export const IMPORT_NAMESPACE = "lojaveiculos-v1-store-import-v1";

export function deterministicUuid(...parts) {
  const bytes = createHash("sha256")
    .update([IMPORT_NAMESPACE, ...parts.map(String)].join("\u0000"))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function targetId(storeId, sourceTable, legacyId) {
  return deterministicUuid("store", storeId, sourceTable, legacyId);
}

export function cents(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`Invalid money value: ${value}`);
  return Math.round(parsed * 100);
}

export function json(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

export function nullableString(value, max = Infinity) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function mapRole(role) {
  const roles = {
    AGENCY: "owner",
    SALESMAN: "salesman",
    SUPERVISOR: "supervisor",
  };
  const mapped = roles[role];
  if (!mapped) throw new Error(`Unmapped V1 LojaAccess role: ${role}`);
  return mapped;
}

export function mapDocumentKind(kind) {
  const kinds = {
    ATPVE: "vehicle_registration",
    BUYER_DOCUMENT: "buyer_document",
    CNH: "buyer_document",
    CONSIGNMENT_CONTRACT: "consignment_contract",
    CRLV: "vehicle_registration",
    DELIVERY_TERM: "delivery_term",
    FINANCE_RECEIPT: "finance_receipt",
    FINANCING_SIMULATION: "other",
    INSPECTION: "inspection",
    INTERNAL: "internal",
    INVOICE: "invoice",
    LAUDO: "inspection",
    MANUAL_PROPOSAL: "other",
    OTHER: "other",
    POWER_OF_ATTORNEY: "power_of_attorney",
    PROOF_OF_RESIDENCE: "buyer_document",
    RESERVATION_RECEIPT: "reservation_receipt",
    SALE_CONTRACT: "sale_contract",
    SALE_CONTRACT_NO_ESTADO: "sale_contract",
    SALE_RECEIPT: "sale_receipt",
    TEST_DRIVE: "test_drive",
    VEHICLE_REGISTRATION: "vehicle_registration",
    WARRANTY_CERTIFICATE: "warranty_certificate",
  };
  const mapped = kinds[kind];
  if (!mapped) throw new Error(`Unmapped V1 document kind: ${kind}`);
  return mapped;
}

export function mapLeadSource(source) {
  const value = String(source ?? "").toLowerCase();
  if (value.includes("whatsapp")) return "whatsapp";
  if (value.includes("olx")) return "olx";
  if (value.includes("site") || value.includes("website")) return "public_site";
  if (value.includes("crm")) return "crm";
  if (value.includes("manual")) return "manual";
  if (value.includes("api")) return "external_api";
  return "other";
}

export function mapFuel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("flex")) return "flex";
  if (normalized.includes("diesel")) return "diesel";
  if (normalized.includes("elétr") || normalized.includes("eletr"))
    return "electric";
  if (normalized.includes("híbr") || normalized.includes("hibr"))
    return "hybrid";
  if (normalized.includes("etanol") || normalized.includes("álcool"))
    return "ethanol";
  if (normalized.includes("gasolina")) return "gasoline";
  return value ? "other" : null;
}

export function mapTransmission(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("cvt")) return "cvt";
  if (normalized.includes("automatiz")) return "automated";
  if (normalized.includes("autom")) return "automatic";
  if (normalized.includes("manual")) return "manual";
  return value ? "other" : null;
}

export function legacyMetadata(table, row, extra = {}) {
  return {
    legacyV1: { sourceTable: table, sourceId: String(row.id), ...row },
    ...extra,
  };
}

export function assertConfigured(config) {
  const placeholders = [
    ["V1_ARCHIVE_PATH", config.archivePath],
    ["V2_DATABASE_URL", config.targetUrl],
    ["TARGET_OWNER_CLERK_USER_ID", config.ownerClerkUserId],
    ["TARGET_OWNER_EMAIL", config.ownerEmail],
  ];
  for (const [name, value] of placeholders) {
    if (!value || String(value).includes("PASTE_"))
      throw new Error(`Fill ${name} at the top of the migration script.`);
  }
  if (!Number.isInteger(config.legacyStoreId) || config.legacyStoreId <= 0) {
    throw new Error("V1_STORE_ID must be a positive integer.");
  }
  if (!config.storeSlug)
    throw new Error(
      "Fill TARGET_STORE_SLUG at the top of the migration script.",
    );
}
