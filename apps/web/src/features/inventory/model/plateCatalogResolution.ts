import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
  InventoryCatalogVehicleType,
  InventoryCatalogVersionOption,
  InventoryCatalogYearOption,
} from "./catalogTypes";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";

export async function resolvePlateCatalogSnapshot(
  api: InventoryApi,
  lookup: InventoryPlateLookupResponse,
): Promise<InventoryCatalogSnapshot | null> {
  try {
    const vehicleType = resolveVehicleType(lookup.vehicle.vehicleType);
    const brands = await api.listCatalogBrands(vehicleType);
    const brand = findBestOption(brands, [
      lookup.fipe?.brandName,
      lookup.vehicle.brand,
    ]);
    if (!brand) return null;

    const models = await api.listCatalogModels(brand.code, vehicleType);
    const model = findBestOption(models, [
      lookup.vehicle.model,
      lookup.fipe?.modelName,
    ]);
    if (!model) return null;

    const versions = await api.listCatalogVersions(
      brand.code,
      model.code,
      vehicleType,
    );
    const matchingVersions = findBestOptions(
      versions,
      [
        lookup.fipe?.modelName,
        joinVehicleName(lookup),
        lookup.vehicle.version,
        lookup.vehicle.model,
      ],
      true,
    );
    for (const version of matchingVersions) {
      const years = await api.listCatalogYears(
        brand.code,
        version.code,
        vehicleType,
      );
      const year = findBestYear(years, lookup);
      if (!year) continue;

      return await api.getCatalogSnapshot({
        brandCode: brand.code,
        modelCode: version.code,
        vehicleType,
        yearCode: year.code,
      });
    }
    return null;
  } catch {
    return null;
  }
}

function findBestOption<T extends InventoryCatalogOption>(
  options: readonly T[],
  rawTargets: ReadonlyArray<string | null | undefined>,
): T | null {
  return findBestOptions(options, rawTargets)[0] ?? null;
}

function findBestOptions<T extends InventoryCatalogOption>(
  options: readonly T[],
  rawTargets: ReadonlyArray<string | null | undefined>,
  allowVariantBadge = false,
): T[] {
  const targets = rawTargets
    .map(normalize)
    .filter((value): value is string => Boolean(value));

  return options
    .flatMap((option, index) => {
      const candidate = normalize(option.name);
      if (!candidate) return [];
      const score = Math.max(
        0,
        ...targets.map((target) =>
          matchScore(candidate, target, allowVariantBadge),
        ),
      );
      return score >= 60 ? [{ index, option, score }] : [];
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ option }) => option);
}

function findBestYear(
  years: readonly InventoryCatalogYearOption[],
  lookup: InventoryPlateLookupResponse,
) {
  const modelYear = lookup.fipe?.modelYear ?? lookup.vehicle.modelYear;
  if (modelYear === null) return null;
  const matches = years.filter((year) => year.modelYear === modelYear);
  if (matches.length <= 1) return matches[0] ?? null;

  const fuel = normalize(lookup.fipe?.fuel ?? lookup.vehicle.fuel);
  return (
    matches.find((year) => fuel && normalize(year.name)?.includes(fuel)) ??
    matches[0] ??
    null
  );
}

function matchScore(
  candidate: string,
  target: string,
  allowVariantBadge: boolean,
) {
  if (candidate === target) return 100;
  const compactCandidate = compact(candidate);
  const compactTarget = compact(target);
  if (compactCandidate === compactTarget) return 100;
  if (target.includes(candidate)) {
    return 80 + Math.round((candidate.length / target.length) * 10);
  }
  if (candidate.includes(target)) {
    return 70 + Math.round((target.length / candidate.length) * 10);
  }
  if (compactTarget.includes(compactCandidate)) {
    return (
      80 + Math.round((compactCandidate.length / compactTarget.length) * 10)
    );
  }
  if (compactCandidate.includes(compactTarget)) {
    return (
      70 + Math.round((compactTarget.length / compactCandidate.length) * 10)
    );
  }
  if (allowVariantBadge && hasSharedVariantBadge(candidate, target)) return 65;

  const candidateTokens = new Set(candidate.split(" "));
  const targetTokens = new Set(target.split(" "));
  const overlap = [...candidateTokens].filter((token) =>
    targetTokens.has(token),
  ).length;
  return Math.round(
    (overlap / Math.max(candidateTokens.size, targetTokens.size)) * 70,
  );
}

function compact(value: string) {
  return value.replace(/\s+/g, "");
}

function hasSharedVariantBadge(candidate: string, target: string) {
  const candidateBadges = extractVariantBadges(candidate);
  return [...extractVariantBadges(target)].some((badge) =>
    candidateBadges.has(badge),
  );
}

function extractVariantBadges(value: string) {
  const tokens = value.split(" ");
  const badges = new Set(
    tokens.filter((token) => /^[a-z]\d{1,2}$/.test(token)),
  );
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const letter = tokens[index];
    const number = tokens[index + 1];
    if (/^[a-z]$/.test(letter ?? "") && /^\d{1,2}$/.test(number ?? "")) {
      badges.add(`${letter}${number}`);
    }
  }
  return badges;
}

function joinVehicleName(lookup: InventoryPlateLookupResponse) {
  return [lookup.vehicle.model, lookup.vehicle.version]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function resolveVehicleType(value: string | null): InventoryCatalogVehicleType {
  const normalized = normalize(value);
  if (normalized?.includes("moto") || normalized?.includes("cycle")) {
    return "motorcycles";
  }
  if (
    normalized?.includes("truck") ||
    normalized?.includes("caminhao") ||
    normalized?.includes("camion")
  ) {
    return "trucks";
  }
  return "cars";
}

function normalize(value: string | null | undefined) {
  const normalized = value
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalized || null;
}
