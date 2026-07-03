export type SnapshotRecord = Record<string, unknown>;

export function asSnapshotRecord(value: unknown): SnapshotRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SnapshotRecord;
}

export function snapshotBoolean(value: unknown) {
  return value === true;
}

export function snapshotNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
