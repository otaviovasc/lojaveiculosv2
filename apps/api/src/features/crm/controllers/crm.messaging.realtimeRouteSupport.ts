import type { Context } from "hono";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmQueueVisibility } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { requireCrmScope } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";

export async function matchesTicketScope(
  currentScope: ReturnType<typeof requireCrmScope>,
  serviceContext: ServiceContext,
  ticketScope: NonNullable<
    Awaited<ReturnType<CrmRealtimeBroker["resolveTicket"]>>
  >,
  services: Pick<CrmServices, "resolveCrmQueueVisibility">,
) {
  return (
    currentScope.storeId === ticketScope.storeId &&
    currentScope.tenantId === ticketScope.tenantId &&
    haveSameQueueVisibility(
      await services.resolveCrmQueueVisibility(serviceContext),
      ticketScope.queueVisibility,
    )
  );
}

function haveSameQueueVisibility(
  left: CrmQueueVisibility,
  right: CrmQueueVisibility,
) {
  if (left.kind !== right.kind) return false;
  if (
    !haveSameConnectionIds(
      left.connectionIds ?? null,
      right.connectionIds ?? null,
    )
  ) {
    return false;
  }
  return (
    left.kind !== "assigned" ||
    right.kind !== "assigned" ||
    left.userId === right.userId
  );
}

function haveSameConnectionIds(
  left: readonly string[] | null,
  right: readonly string[] | null,
) {
  if (left === null || right === null) return left === right;
  if (left.length !== right.length) return false;
  const remaining = new Set(right);
  return left.every((connectionId) => remaining.delete(connectionId));
}

export async function readTicketInput(context: Context) {
  let rawBody: unknown;
  try {
    rawBody = await context.req.json();
  } catch {
    throw new CrmMessagingValidationError("Request body must be valid JSON.");
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    throw new CrmMessagingValidationError("Request body must be an object.");
  }
  const body = rawBody as {
    connectionId?: unknown;
    lastEventId?: unknown;
    sinceEventId?: unknown;
  };
  return {
    connectionId: readConnectionId(body.connectionId),
    sinceEventId: readEventCursor(body.sinceEventId ?? body.lastEventId),
  };
}

export function setRealtimeSecurityHeaders(context: Context) {
  context.header("Cache-Control", "no-store");
  context.header("Referrer-Policy", "no-referrer");
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readConnectionId(value: unknown) {
  const connectionId = readOptionalString(value);
  if (!connectionId) return null;
  if (isUuid(connectionId)) return connectionId;
  throw new CrmMessagingValidationError("connectionId is invalid.");
}

function readEventCursor(value: unknown) {
  const cursor = readOptionalString(value);
  if (!cursor) return null;
  if (
    cursor.length <= 128 &&
    /^\d{1,20}-(?:\d{1,20}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      cursor,
    )
  ) {
    return cursor;
  }
  throw new CrmMessagingValidationError("lastEventId is invalid.");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function readTicket(value: string | undefined) {
  const ticket = readOptionalString(value);
  return ticket && isUuid(ticket) ? ticket : null;
}
