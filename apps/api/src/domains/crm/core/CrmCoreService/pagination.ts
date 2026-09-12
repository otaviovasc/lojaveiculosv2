import { CrmCoreRuleError } from "../errors.js";
import type { CrmCoreRecord } from "../models.js";

export function encodeCrmCoreCursor(
  entity: Pick<CrmCoreRecord, "createdAt" | "id">,
): string {
  return `${entity.createdAt.toISOString()}|${entity.id}`;
}

export function decodeCrmCoreCursor(
  value: string | undefined,
): { createdAt: Date; id: string } | undefined {
  if (!value) return undefined;
  const separator = value.indexOf("|");
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (separator < 1 || Number.isNaN(createdAt.getTime()) || !id) {
    throw new CrmCoreRuleError(
      "CRM core cursor is invalid.",
      "CRM_CORE_CURSOR_INVALID",
    );
  }
  return { createdAt, id };
}
