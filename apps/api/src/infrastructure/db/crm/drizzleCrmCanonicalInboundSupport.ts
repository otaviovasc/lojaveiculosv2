export function readCanonicalThreadMetadata(
  value: unknown,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readCanonicalUnreadCount(metadata: Record<string, unknown>) {
  return typeof metadata.unreadCount === "number" ? metadata.unreadCount : 0;
}
