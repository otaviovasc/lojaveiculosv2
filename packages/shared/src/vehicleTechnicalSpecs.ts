export const vehicleEngineDisplacementValues = [
  "0.8",
  "1.0",
  "1.2",
  "1.3",
  "1.4",
  "1.5",
  "1.6",
  "1.8",
  "2.0",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "2.8",
  "3.0",
  "3.2",
  "3.5",
  "3.6",
  "4.0",
  "4.4",
  "5.0",
  "5.2",
  "6.2",
  "other",
] as const;

export const vehicleEngineAspirationValues = [
  "aspirated",
  "turbo",
  "supercharged",
  "twincharged",
] as const;

export type VehicleEngineDisplacement =
  (typeof vehicleEngineDisplacementValues)[number];

export type VehicleEngineAspiration =
  (typeof vehicleEngineAspirationValues)[number];

export type VehicleTechnicalOption<Value extends string> = {
  label: string;
  value: Value;
};

export const vehicleEngineDisplacementOptions =
  vehicleEngineDisplacementValues.map((value) => ({
    label: value === "other" ? "Outro" : value,
    value,
  })) satisfies readonly VehicleTechnicalOption<VehicleEngineDisplacement>[];

export const vehicleEngineAspirationOptions = [
  { label: "Aspirado", value: "aspirated" },
  { label: "Turbo", value: "turbo" },
  { label: "Supercharged", value: "supercharged" },
  { label: "Twincharged", value: "twincharged" },
] as const satisfies readonly VehicleTechnicalOption<VehicleEngineAspiration>[];

export function normalizeVehicleEngineDisplacement(
  value: number | string | null | undefined,
): VehicleEngineDisplacement | null {
  if (value === null || value === undefined) return null;

  const normalized = normalizeTechnicalText(String(value));
  if (!normalized) return null;
  if (normalized === "other" || normalized === "outro") return "other";

  const numeric = Number(
    normalized.match(/\d+(?:[,.]\d+)?/)?.[0]?.replace(",", ".") ?? "",
  );
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const liters = numeric > 10 ? numeric / 1000 : numeric;
  const rounded = (Math.round(liters * 10) / 10).toFixed(1);
  if (isVehicleEngineDisplacement(rounded)) return rounded;

  const closest = vehicleEngineDisplacementValues
    .filter((candidate) => candidate !== "other")
    .map((candidate) => ({
      distance: Math.abs(Number(candidate) - liters),
      value: candidate,
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  return closest && closest.distance <= 0.16 ? closest.value : null;
}

export function normalizeVehicleEngineAspiration(
  value: string | null | undefined,
): VehicleEngineAspiration | null {
  const normalized = normalizeTechnicalText(value);
  if (!normalized) return null;

  const hasTurbo = normalized.includes("turbo");
  const hasSupercharger =
    normalized.includes("supercharg") ||
    normalized.includes("super charg") ||
    normalized.includes("compressor");

  if (normalized.includes("twincharg") || (hasTurbo && hasSupercharger)) {
    return "twincharged";
  }
  if (hasTurbo) return "turbo";
  if (hasSupercharger) return "supercharged";
  if (
    normalized.includes("aspirad") ||
    normalized.includes("aspirat") ||
    normalized.includes("natural") ||
    normalized.includes("n/a")
  ) {
    return "aspirated";
  }

  return null;
}

export function getVehicleEngineAspirationLabel(
  value: string | null | undefined,
): string {
  const aspiration = normalizeVehicleEngineAspiration(value);
  return (
    vehicleEngineAspirationOptions.find((option) => option.value === aspiration)
      ?.label ??
    value?.trim() ??
    ""
  );
}

function isVehicleEngineDisplacement(
  value: string,
): value is VehicleEngineDisplacement {
  return (vehicleEngineDisplacementValues as readonly string[]).includes(value);
}

function normalizeTechnicalText(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") ?? ""
  );
}
