import type { ContactIdentityKind } from "./models.js";

export function normalizeContactIdentity(
  kind: ContactIdentityKind,
  value: string,
): string {
  const trimmed = value.trim();
  if (kind === "email") return trimmed.toLocaleLowerCase("en-US");
  if (kind === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }
  return trimmed.toLocaleLowerCase("en-US");
}
