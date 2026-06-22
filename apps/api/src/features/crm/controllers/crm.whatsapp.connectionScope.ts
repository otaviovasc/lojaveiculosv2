import type { Context } from "hono";
import { CrmWhatsappValidationError } from "./crm.whatsapp.controller.support.js";

export type WhatsappScopedConnection = {
  id: number;
  lojaSlug?: string;
  status?: string;
};

export function readOptionalConnectionId(context: Context): number | undefined {
  const raw = context.req.query("connectionId");
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new CrmWhatsappValidationError(
      "Query param connectionId is invalid.",
    );
  }
  return value;
}

export function normalizeWhatsappConnections(
  payload: unknown,
): WhatsappScopedConnection[] {
  const rawConnections = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.connections)
      ? payload.connections
      : [];

  return rawConnections
    .map(readWhatsappConnection)
    .filter((connection): connection is WhatsappScopedConnection =>
      Boolean(connection),
    );
}

export function selectScopedConnection(
  connections: WhatsappScopedConnection[],
  context: Context,
): WhatsappScopedConnection | null {
  const storeSlug = context.req.header("x-store-slug");
  if (storeSlug) {
    return (
      connections.find((connection) => connection.lojaSlug === storeSlug) ??
      null
    );
  }
  return connections.length === 1 ? (connections[0] ?? null) : null;
}

function readWhatsappConnection(
  input: unknown,
): WhatsappScopedConnection | null {
  if (!isRecord(input) || typeof input.id !== "number") return null;
  return {
    id: input.id,
    ...(typeof input.lojaSlug === "string" ? { lojaSlug: input.lojaSlug } : {}),
    ...(typeof input.status === "string" ? { status: input.status } : {}),
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === "object");
}
