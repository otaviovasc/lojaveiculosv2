export function readRequiredDocumentKinds(
  snapshot: Record<string, unknown>,
): readonly string[] {
  const direct = snapshot.requiredDocumentKinds;
  if (Array.isArray(direct)) {
    return direct.filter((value): value is string => typeof value === "string");
  }

  const policy = snapshot.policy;
  if (!policy || typeof policy !== "object") return [];
  const required = (policy as { requiredDocumentKinds?: unknown })
    .requiredDocumentKinds;
  if (!Array.isArray(required)) return [];
  return required.filter((value): value is string => typeof value === "string");
}
