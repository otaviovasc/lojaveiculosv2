import type { InventoryPlateFipeReference } from "../../domains/vehicle/ports/vehicleEnrichmentTypes.js";

export function pickFipeReference(
  root: Record<string, unknown>,
  envelope: Record<string, unknown>,
  data: Record<string, unknown>,
  extra: Record<string, unknown>,
): InventoryPlateFipeReference | null {
  const fipeValue = data.fipe ?? extra.fipe ?? envelope.fipe ?? root.fipe;
  const fipeRoot = asRecord(fipeValue);
  const rawItems = Array.isArray(fipeValue)
    ? fipeValue
    : Array.isArray(fipeRoot?.dados)
      ? fipeRoot.dados
      : fipeRoot
        ? [fipeRoot]
        : Array.isArray(data.fipes)
          ? data.fipes
          : [];
  const items = rawItems.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
  const best = items.sort((a, b) => scoreOf(b) - scoreOf(a))[0];
  if (!best) return null;

  const priceLabel = findString([best], ["texto_valor", "valor", "preco"]);
  return {
    brandName: findString([best], ["texto_marca", "marca"]),
    code: findString([best], ["codigo_fipe", "codigoFipe"]),
    fuel: findString([best], ["combustivel"]),
    modelName: findString([best], ["texto_modelo", "modelo"]),
    modelYear: findNumber([best], ["ano_modelo", "anoModelo"]),
    priceCents: parseCurrencyCents(priceLabel),
    priceLabel,
    referenceMonth: findString([best], ["mes_referencia", "referencia"]),
    score: findNumber([best], ["score"]),
  };
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

function parseCurrencyCents(value: string | null): number | null {
  if (!value) return null;
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
