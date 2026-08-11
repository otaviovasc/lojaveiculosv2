export type ParsedOlxLeadWebhook = {
  adId: string | null;
  adsInfo: Record<string, string | number>;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string | null;
  createdAt: Date;
  externalId: string | null;
  linkAd: string;
  listId: string;
  message: string;
  source: "whatsapp" | "telefone" | "chat" | "financing" | "olx";
};

const allowedKeys = new Set([
  "adId",
  "adsInfo",
  "buyerHistory",
  "createdAt",
  "email",
  "externalId",
  "linkAd",
  "listId",
  "message",
  "name",
  "phone",
  "source",
]);
const allowedSources = new Set([
  "whatsapp",
  "telefone",
  "chat",
  "financing",
  "olx",
]);
const adInfoKeys = [
  "category",
  "subject",
  "type",
  "price",
  "vehicle_brand",
  "vehicle_model",
  "vehicle_version",
] as const;

export function parseOlxLeadWebhook(
  payload: unknown,
): ParsedOlxLeadWebhook | null {
  const input = readRecord(payload);
  if (!input || Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const source = readString(input.source, 32);
  const listId = readString(input.listId, 191);
  const linkAd = readString(input.linkAd, 500);
  const buyerName = readString(input.name, 191);
  const buyerEmail = readString(input.email, 254);
  const message = readString(input.message, 10_000);
  const createdAtValue = readString(input.createdAt, 80);
  const createdAt = createdAtValue ? new Date(createdAtValue) : null;
  if (
    !source ||
    !allowedSources.has(source) ||
    !listId ||
    !linkAd ||
    !isHttpUrl(linkAd) ||
    !buyerName ||
    !buyerEmail ||
    !isEmail(buyerEmail) ||
    !message ||
    !createdAt ||
    Number.isNaN(createdAt.getTime())
  ) {
    return null;
  }
  const buyerPhone = readPhone(input.phone);
  if (hasNonEmptyValue(input.phone) && !buyerPhone) {
    return null;
  }
  const adsInfo = readAdsInfo(input.adsInfo);
  if (input.adsInfo !== undefined && !adsInfo) return null;
  if (
    !isValidNullableString(input.adId, 191) ||
    !isValidNullableString(input.externalId, 191)
  ) {
    return null;
  }
  if (
    input.buyerHistory !== undefined &&
    input.buyerHistory !== null &&
    !readRecord(input.buyerHistory)
  ) {
    return null;
  }
  return {
    adId: readNullableString(input.adId, 191),
    adsInfo: adsInfo ?? {},
    buyerEmail,
    buyerName,
    buyerPhone,
    createdAt,
    externalId: readNullableString(input.externalId, 191),
    linkAd,
    listId,
    message,
    source: source as ParsedOlxLeadWebhook["source"],
  };
}

function readAdsInfo(value: unknown) {
  if (value === undefined || value === null) return {};
  const input = readRecord(value);
  if (!input) return null;
  const sanitized: Record<string, string | number> = {};
  for (const key of adInfoKeys) {
    const candidate = input[key];
    if (
      (typeof candidate === "string" && candidate.length <= 191) ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      sanitized[key] = candidate;
    }
  }
  return sanitized;
}

function readPhone(value: unknown) {
  if (!hasNonEmptyValue(value)) return null;
  if (typeof value !== "string") return null;
  const phone = value.trim();
  return /^\d{1,13}$/u.test(phone) ? phone : null;
}

function hasNonEmptyValue(value: unknown) {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

function readNullableString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  return readString(value, maxLength);
}

function isValidNullableString(value: unknown, maxLength: number) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    readNullableString(value, maxLength) !== null
  );
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
