import { Buffer } from "node:buffer";
import type { CrmLeadCursor } from "../../../domains/crm/ports/crmRepository.js";
import { CrmRequestValidationError } from "./crm.controller.errors.js";

export function decodeCrmLeadCursor(
  value: string | undefined,
): CrmLeadCursor | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { id?: unknown; updatedAt?: unknown };
    if (typeof parsed.id !== "string" || typeof parsed.updatedAt !== "string") {
      throw new Error("Cursor fields are invalid.");
    }
    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error("Cursor date is invalid.");
    }
    return { id: parsed.id, updatedAt };
  } catch {
    throw new CrmRequestValidationError("Lead cursor is invalid.");
  }
}

export function encodeCrmLeadCursor(cursor: CrmLeadCursor | null) {
  if (!cursor) return null;
  return Buffer.from(
    JSON.stringify({
      id: cursor.id,
      updatedAt: cursor.updatedAt.toISOString(),
    }),
  ).toString("base64url");
}
