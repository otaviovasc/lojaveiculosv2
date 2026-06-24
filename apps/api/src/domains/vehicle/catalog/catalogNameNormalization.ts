import { compoundFamilies, variantMarkers } from "./catalogNameRules.js";

export type VehicleCatalogNameParts = {
  modelFamilyName: string;
  versionName: string;
};

export function splitVehicleCatalogName(
  providerName: string,
): VehicleCatalogNameParts {
  const clean = providerName.replace(/\s+/g, " ").trim();
  if (!clean)
    return { modelFamilyName: providerName, versionName: providerName };

  const special = findSpecialSplit(clean);
  if (special) return special;

  const compound = findCompoundFamily(clean);
  const modelFamilyName = compound ?? inferModelFamilyName(clean);
  const suffix = clean.slice(modelFamilyName.length).trim();

  return {
    modelFamilyName,
    versionName: cleanVersionName(suffix || clean, modelFamilyName),
  };
}

export function deriveModelFamilyName(providerName: string): string {
  return splitVehicleCatalogName(providerName).modelFamilyName;
}

function findSpecialSplit(clean: string): VehicleCatalogNameParts | null {
  const avantRs2 = clean.match(/^Avant\s+RS2\b\s*(.*)$/i);
  if (avantRs2) {
    return {
      modelFamilyName: "RS2",
      versionName: cleanVersionName(`Avant ${avantRs2[1] ?? ""}`, "RS2"),
    };
  }

  const bmwMSeries = clean.match(/^M\s+(\d{3}i)\b\s*(.*)$/i);
  if (!bmwMSeries) return null;
  return {
    modelFamilyName: `M${bmwMSeries[1]}`,
    versionName: cleanVersionName(bmwMSeries[2] || clean, `M${bmwMSeries[1]}`),
  };
}

function findCompoundFamily(clean: string): string | null {
  const normalized = normalize(clean);
  const match = compoundFamilies.find(
    (family) => normalized === family || normalized.startsWith(`${family} `),
  );
  return match ? clean.slice(0, match.length) : null;
}

function inferModelFamilyName(clean: string): string {
  const tokens = clean.split(" ");
  const markerIndex = tokens.findIndex(
    (token, index) => index > 0 && isVersionMarker(token),
  );
  if (markerIndex > 0) return cleanFamilyName(tokens.slice(0, markerIndex));

  const oldSplit = clean.search(
    /\s(?:\d|16V|8V|T\.|TB|MPI|TSI|TDI|FLEX|DIESEL|HYBRID|ELETRICO|AUT\.|MEC\.)/i,
  );
  if (oldSplit > 0) return cleanFamilyName(clean.slice(0, oldSplit));

  return tokens[0] ?? clean;
}

function cleanFamilyName(input: string | string[]): string {
  const value = Array.isArray(input) ? input.join(" ") : input;
  return value.replace(/[./-]+$/g, "").trim();
}

function isVersionMarker(token: string): boolean {
  const normalized = normalize(token).replace(/[.,;:]+$/g, "");
  if (variantMarkers.has(normalized)) return true;
  const firstSegment = normalized.split(/[./]/)[0];
  if (firstSegment && variantMarkers.has(firstSegment)) return true;
  if (/^m\d{2,3}i?$/i.test(normalized)) return true;
  if (/^(?:s|x)drive/i.test(normalized)) return true;
  if (/^\d/.test(normalized)) return true;
  return /^(?:8v|12v|16v|20v|24v|v6|v8|tb|tsi|tdi|mpi)$/i.test(normalized);
}

function cleanVersionName(
  versionName: string,
  modelFamilyName: string,
): string {
  const escapedFamily = escapeRegExp(modelFamilyName.trim());
  return versionName
    .replace(/^[./\-\s]+/g, "")
    .replace(new RegExp(`/\\s*${escapedFamily}\\s+`, "i"), "/")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
