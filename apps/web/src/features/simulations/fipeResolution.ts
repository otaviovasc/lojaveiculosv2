import type { CredereFipeCandidate, CredereFipeResolution } from "./types";

export function parseFipeResolution(value: unknown): CredereFipeResolution {
  const record = asRecord(value);
  const status = record.status;
  if (status === "resolved") {
    const candidate = parseCandidate(record.candidate);
    if (candidate) return { candidate, status };
  }
  if (status === "not_found") return { candidates: [], status };
  if (status === "ambiguous" || status === "mismatch") {
    const candidates = Array.isArray(record.candidates)
      ? record.candidates
          .map(parseCandidate)
          .filter((entry): entry is CredereFipeCandidate => entry !== null)
      : [];
    return { candidates, status };
  }
  throw new Error("A Credere retornou uma resolução FIPE inválida.");
}

function parseCandidate(value: unknown): CredereFipeCandidate | null {
  const candidate = asRecord(value);
  const fipeCode = requiredString(candidate.fipeCode);
  const modelId = requiredString(candidate.modelId);
  const molicarCode = requiredString(candidate.molicarCode);
  const name = requiredString(candidate.name);
  if (!fipeCode || !modelId || !molicarCode || !name) return null;
  return {
    brand: optionalString(candidate.brand),
    fipeCode,
    fuelType: optionalString(candidate.fuelType),
    modelId,
    molicarCode,
    name,
    version: optionalString(candidate.version),
    yearEnd: optionalNumber(candidate.yearEnd),
    yearStart: optionalNumber(candidate.yearStart),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalString(value: unknown) {
  return requiredString(value);
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
