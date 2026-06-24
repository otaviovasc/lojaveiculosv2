import { brandLogoUrlsByName } from "./vehicleBrandLogoUrls.js";

const brandLogoAliasesByName = {
  "AM Gen": "AM General",
  "Caoa Changan": "Changan",
  "Caoa Chery": "Chery",
  "Caoa Chery/Chery": "Chery",
  GM: "Chevrolet",
  "GM - Chevrolet": "Chevrolet",
  "Kia Motors": "Kia",
  "VW - VolksWagen": "Volkswagen",
  VW: "Volkswagen",
} as const satisfies Record<string, keyof typeof brandLogoUrlsByName>;

const logoUrlsByKey = new Map(
  Object.entries(brandLogoUrlsByName).map(([name, url]) => [
    normalizeBrandLogoName(name),
    url,
  ]),
);
const aliasTargetByKey = new Map(
  Object.entries(brandLogoAliasesByName).map(([alias, target]) => [
    normalizeBrandLogoName(alias),
    normalizeBrandLogoName(target),
  ]),
);

export function resolveVehicleBrandLogoUrl(brandName: string): string | null {
  for (const candidate of getBrandNameCandidates(brandName)) {
    const key = normalizeBrandLogoName(candidate);
    const targetKey = aliasTargetByKey.get(key) ?? key;
    const url = logoUrlsByKey.get(targetKey);
    if (url) return url;
  }
  return null;
}

function getBrandNameCandidates(brandName: string): readonly string[] {
  return [
    brandName,
    ...brandName.split(/\s*[-/]\s*/u).filter((part) => part.trim()),
  ];
}

function normalizeBrandLogoName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
