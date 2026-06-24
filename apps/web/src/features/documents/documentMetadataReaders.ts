import type { WorkspaceDocument } from "./types";

export function readMetadataString(
  document: WorkspaceDocument,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = document.metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function readMetadataNumber(
  document: WorkspaceDocument,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = document.metadata[key];
    if (typeof value === "number") return value;
  }
  return null;
}

export function readMetadataArray(
  document: WorkspaceDocument,
  keys: readonly string[],
): unknown[] {
  for (const key of keys) {
    const value = document.metadata[key];
    if (Array.isArray(value)) return value as unknown[];
  }
  return [];
}

export function readMetadataRecord(document: WorkspaceDocument, key: string) {
  return readRecord(document.metadata[key]);
}

export function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readRecordString(
  record: Record<string, unknown> | null,
  keys: readonly string[],
) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
