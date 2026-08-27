import type { Context, Hono } from "hono";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { requireCrmScope } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import { assertConversationRead } from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import { resolveCrmQueueVisibility } from "../../../domains/crm/messaging/crmQueueVisibility.js";
import { createCrmSseResponse } from "./crm.messaging.realtimeStream.js";

export type RegisterCrmMessagingRealtimeRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  realtimeBroker?: CrmRealtimeBroker;
};

export function registerCrmMessagingRealtimeRoutes(
  crmFeature: Hono,
  { createContext, realtimeBroker }: RegisterCrmMessagingRealtimeRoutesOptions,
) {
  const broker = realtimeBroker;
  if (!broker) return;
  const ticketLoggers = new Map<
    string,
    { logger: ServiceLogger; expiryTimer: ReturnType<typeof setTimeout> }
  >();

  crmFeature.post("/events/ticket", async (context) =>
    handleCrmMessaging(context, async () => {
      setRealtimeSecurityHeaders(context);
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const scope = requireCrmScope(serviceContext);
      const input = await readTicketInput(context);
      const ticket = await broker.issueTicket({
        connectionId: input.connectionId ?? null,
        queueVisibility: resolveCrmQueueVisibility(serviceContext),
        sinceEventId: input.sinceEventId ?? null,
        storeId: scope.storeId as StoreId,
        tenantId: scope.tenantId as TenantId,
      });
      const logger =
        serviceContext.logger.child?.({
          component: "crm.realtime",
          connectionId: input.connectionId ?? null,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }) ?? serviceContext.logger;
      const expiryTimer = setTimeout(
        () => {
          ticketLoggers.delete(ticket.ticket);
        },
        Math.max(0, ticket.expiresAt.getTime() - Date.now()),
      );
      expiryTimer.unref?.();
      ticketLoggers.set(ticket.ticket, { expiryTimer, logger });
      logger.info("crm.realtime.ticket.issued", {
        hasLastEventId: Boolean(input.sinceEventId),
      });
      return context.json({
        expiresAt: ticket.expiresAt.toISOString(),
        ticket: ticket.ticket,
      });
    }),
  );

  crmFeature.get("/events", async (context) =>
    handleCrmMessaging(context, async () => {
      setRealtimeSecurityHeaders(context);
      const ticket = context.req.query("ticket");
      const scope = ticket ? await broker.resolveTicket(ticket) : null;
      if (!scope) {
        return jsonApiError(context, {
          code: "CRM_MESSAGING_INVALID_SSE_TICKET",
          message: "Invalid SSE ticket.",
          status: 401,
        });
      }
      const authorize = async () => {
        try {
          const serviceContext = await createContext(context);
          assertConversationRead(serviceContext);
          const currentScope = requireCrmScope(serviceContext);
          return (
            currentScope.storeId === scope.storeId &&
            currentScope.tenantId === scope.tenantId &&
            haveSameQueueVisibility(
              resolveCrmQueueVisibility(serviceContext),
              scope.queueVisibility,
            )
          );
        } catch {
          return false;
        }
      };
      if (!(await authorize())) {
        return jsonApiError(context, {
          code: "CRM_MESSAGING_SSE_ACCESS_REVOKED",
          message: "SSE access is no longer authorized.",
          status: 403,
        });
      }
      const logEntry = ticket ? ticketLoggers.get(ticket) : undefined;
      if (ticket) ticketLoggers.delete(ticket);
      if (logEntry) clearTimeout(logEntry.expiryTimer);
      return createCrmSseResponse({
        authorize,
        broker,
        connectionId: scope.connectionId ?? null,
        queueVisibility: scope.queueVisibility,
        sinceEventId: readSinceEventId(context) ?? scope.sinceEventId ?? null,
        signal: context.req.raw.signal,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
        ...(logEntry ? { logger: logEntry.logger } : {}),
      });
    }),
  );
}

function haveSameQueueVisibility(
  left: ReturnType<typeof resolveCrmQueueVisibility>,
  right: ReturnType<typeof resolveCrmQueueVisibility>,
) {
  if (left.kind !== right.kind) return false;
  return (
    left.kind !== "assigned" ||
    right.kind !== "assigned" ||
    left.userId === right.userId
  );
}

async function readTicketInput(context: Context) {
  try {
    const body = (await context.req.json()) as {
      connectionId?: unknown;
      lastEventId?: unknown;
      sinceEventId?: unknown;
    };
    return {
      connectionId: readOptionalString(body.connectionId),
      sinceEventId:
        readOptionalString(body.sinceEventId) ??
        readOptionalString(body.lastEventId),
    };
  } catch {
    return { connectionId: null, sinceEventId: null };
  }
}

function setRealtimeSecurityHeaders(context: Context) {
  context.header("Cache-Control", "no-store");
  context.header("Referrer-Policy", "no-referrer");
}

function readSinceEventId(context: Context) {
  return (
    readOptionalString(context.req.query("afterId")) ??
    readOptionalString(context.req.query("sinceEventId")) ??
    readOptionalString(context.req.header("last-event-id"))
  );
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
