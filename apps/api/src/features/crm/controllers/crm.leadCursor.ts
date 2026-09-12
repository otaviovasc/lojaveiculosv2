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
    ) as {
      id?: unknown;
      updatedAt?: unknown;
      sortBy?: unknown;
      sortAt?: unknown;
    };
    if (typeof parsed.id !== "string" || typeof parsed.updatedAt !== "string") {
      throw new Error("Cursor fields are invalid.");
    }
    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error("Cursor date is invalid.");
    }
    if (
      parsed.sortBy !== undefined &&
      parsed.sortBy !== "created_at" &&
      parsed.sortBy !== "next_task"
    )
      throw new Error("Invalid sort.");
    const sortAt =
      parsed.sortAt === null
        ? null
        : typeof parsed.sortAt === "string"
          ? new Date(parsed.sortAt)
          : undefined;
    if (sortAt && Number.isNaN(sortAt.getTime()))
      throw new Error("Invalid sort date.");
    if (
      (parsed.sortBy && sortAt === undefined) ||
      (parsed.sortBy === "created_at" && sortAt === null)
    )
      throw new Error("Missing sort date.");
    return {
      id: parsed.id,
      updatedAt,
      ...(parsed.sortBy ? { sortBy: parsed.sortBy, sortAt: sortAt! } : {}),
    };
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
      ...(cursor.sortBy
        ? {
            sortBy: cursor.sortBy,
            sortAt: cursor.sortAt?.toISOString() ?? null,
          }
        : {}),
    }),
  ).toString("base64url");
}
