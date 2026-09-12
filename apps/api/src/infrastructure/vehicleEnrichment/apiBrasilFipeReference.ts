import type { InventoryPlateFipeReference } from "../../domains/vehicle/ports/vehicleEnrichmentTypes.js";

export function pickFipeReference(
  ...payloads: readonly unknown[]
): InventoryPlateFipeReference | null {
  return pickFipeReferences(...payloads)[0] ?? null;
}

export function pickFipeReferences(
  ...payloads: readonly unknown[]
): InventoryPlateFipeReference[] {
  const items = payloads
    .flatMap((payload) => extractFipeItems(payload))
    .sort(compareFipeItems);
  const references = items.map(toFipeReference);
  return references.filter(
    (reference, index) =>
      references.findIndex(
        (candidate) =>
          fipeReferenceKey(candidate) === fipeReferenceKey(reference),
      ) === index,
  );
}

function toFipeReference(
  best: Record<string, unknown>,
): InventoryPlateFipeReference {
  return {
    brandName: findString([best], ["texto_marca", "marca"]),
    code: findString([best], ["codigo_fipe", "codigoFipe"]),
    fuel: findString([best], ["combustivel"]),
    modelName: findString([best], ["texto_modelo", "modelo"]),
    modelYear: findNumber([best], ["ano_modelo", "anoModelo"]),
    priceCents: parseCurrencyCents(
      readFirst(best, ["texto_valor", "valor", "preco"]),
    ),
    priceLabel: findString([best], ["texto_valor", "valor_formatado", "preco"]),
    referenceMonth: findString(
      [best],
      ["mes_referencia", "mesReferencia", "referencia"],
    ),
    score: findNumber([best], ["score"]),
  };
}

function extractFipeItems(
  value: unknown,
  depth = 0,
): Record<string, unknown>[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractFipeItems(item, depth + 1));
  }
  const record = asRecord(value);
  if (!record) return [];
  if (readFirst(record, ["codigo_fipe", "codigoFipe"]) !== undefined) {
    return [record];
  }
  return ["data", "dados", "fipe", "fipes"].flatMap((key) =>
    extractFipeItems(readCaseInsensitive(record, key), depth + 1),
  );
}

function compareFipeItems(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) {
  const principalDifference =
    Number(isPrincipal(right)) - Number(isPrincipal(left));
  return principalDifference || scoreOf(right) - scoreOf(left);
}

function isPrincipal(record: Record<string, unknown>) {
  return readFirst(record, ["principal"]) === true;
}

function fipeReferenceKey(reference: InventoryPlateFipeReference) {
  return [
    reference.code,
    reference.modelYear,
    reference.fuel?.toLowerCase() ?? null,
    reference.modelName?.toLowerCase() ?? null,
  ].join("|");
}

function findString(
  candidates: readonly Record<string, unknown>[],
  keys: readonly string[],
): string | null {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = readCaseInsensitive(candidate, key);
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    }
  }
  return null;
}

function findNumber(
  candidates: readonly Record<string, unknown>[],
  keys: readonly string[],
): number | null {
  const value = findString(candidates, keys);
  if (!value) return null;
  const number = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function parseCurrencyCents(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0
      ? Math.round(value * 100)
      : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
}

function readFirst(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = readCaseInsensitive(record, key);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function readCaseInsensitive(record: Record<string, unknown>, key: string) {
  if (key in record) return record[key];
  const match = Object.keys(record).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return match ? record[match] : undefined;
}

function scoreOf(record: Record<string, unknown>) {
  return findNumber([record], ["score"]) ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
