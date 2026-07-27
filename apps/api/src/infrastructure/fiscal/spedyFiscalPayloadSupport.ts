import { SpedyGatewayConfigurationError } from "./spedyErrors.js";

export type JsonRecord = Record<string, unknown>;

export function normalizeProductItem(item: JsonRecord) {
  const quantity = numberValue(item.quantity);
  const unitAmount = numberValue(item.unitAmount);
  const totalAmount = numberValue(item.totalAmount);
  assertFields([
    ["item.code", stringValue(item.code)],
    ["item.description", stringValue(item.description)],
    ["item.cfop", numberValue(item.cfop)],
    ["item.ncm", stringValue(item.ncm)],
    ["item.quantity", quantity],
    ["item.totalAmount", totalAmount],
    ["item.unit", stringValue(item.unit)],
    ["item.unitAmount", unitAmount],
  ]);
  return compact({
    ...item,
    cfop: numberValue(item.cfop),
    ncm: stringValue(item.ncm),
    quantity,
    quantityTax: numberValue(item.quantityTax) ?? quantity,
    totalAmount,
    unit: stringValue(item.unit),
    unitAmount,
    unitTax: stringValue(item.unitTax) ?? stringValue(item.unit),
    unitTaxAmount: numberValue(item.unitTaxAmount) ?? unitAmount,
  });
}

export function productItemDefaults(defaults: JsonRecord) {
  const keys = [
    "cfop",
    "cofinsCst",
    "cofinsRate",
    "icmsBaseTaxModality",
    "icmsBaseTaxReduction",
    "icmsCst",
    "icmsFcpRate",
    "icmsOrigin",
    "icmsRate",
    "icmsStBaseTaxModality",
    "icmsStRate",
    "ipiCst",
    "ipiRate",
    "ncm",
    "pisCst",
    "pisRate",
  ];
  return Object.fromEntries(
    keys
      .filter((key) => defaults[key] !== undefined)
      .map((key) => [key, defaults[key]]),
  );
}

export function assertFields(
  fields: ReadonlyArray<readonly [string, unknown]>,
) {
  const missing = fields
    .filter(
      ([, value]) => value === null || value === undefined || value === "",
    )
    .map(([name]) => name);
  if (missing.length) {
    throw new SpedyGatewayConfigurationError(
      missing.map((field) => `fiscal.${field}`),
    );
  }
}

export function compact<T extends JsonRecord>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        (!(typeof value === "object") ||
          Array.isArray(value) ||
          Object.keys(value as JsonRecord).length > 0),
    ),
  ) as T;
}

export function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function numberValue(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

export function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function digits(value: string | undefined) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || undefined;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
