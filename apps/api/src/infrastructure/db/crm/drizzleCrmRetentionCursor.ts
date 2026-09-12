import type { CrmRetentionCategory } from "../../../domains/crm/ports/crmRetentionRepository.js";

export type CrmRetentionCursor = Readonly<{
  category: CrmRetentionCategory;
  eligibleAt: Date;
  resourceId: string;
  resourceType: string;
}>;

export function encodeCrmRetentionCursor(cursor: CrmRetentionCursor): string {
  return Buffer.from(
    JSON.stringify({ ...cursor, eligibleAt: cursor.eligibleAt.toISOString() }),
    "utf8",
  ).toString("base64url");
}

export function decodeCrmRetentionCursor(
  value: string | undefined,
): CrmRetentionCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const eligibleAt = new Date(String(decoded.eligibleAt));
    const category = decoded.category;
    if (
      (category !== "canonical_message" &&
        category !== "provider_raw_payload" &&
        category !== "bot_interaction") ||
      Number.isNaN(eligibleAt.getTime()) ||
      typeof decoded.resourceId !== "string" ||
      typeof decoded.resourceType !== "string"
    ) {
      return null;
    }
    return {
      category,
      eligibleAt,
      resourceId: decoded.resourceId,
      resourceType: decoded.resourceType,
    };
  } catch {
    return null;
  }
}
