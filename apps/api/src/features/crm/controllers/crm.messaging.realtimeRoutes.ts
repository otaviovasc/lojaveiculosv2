import type { Context, Hono } from "hono";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { requireCrmScope } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import { assertConversationRead } from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import { createCrmSseResponse } from "./crm.messaging.realtimeStream.js";
import {
  matchesTicketScope,
  readTicket,
  readTicketInput,
  setRealtimeSecurityHeaders,
} from "./crm.messaging.realtimeRouteSupport.js";
import type { CrmServices } from "./crmServices.js";

export type RegisterCrmMessagingRealtimeRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  realtimeBroker?: CrmRealtimeBroker;
  services: Pick<CrmServices, "resolveCrmQueueVisibility">;
};

export function registerCrmMessagingRealtimeRoutes(
  crmFeature: Hono,
  {
    createContext,
    realtimeBroker,
    services,
  }: RegisterCrmMessagingRealtimeRoutesOptions,
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
        queueVisibility:
          await services.resolveCrmQueueVisibility(serviceContext),
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
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const currentScope = requireCrmScope(serviceContext);
      const ticket = readTicket(context.req.header("x-crm-sse-ticket"));
      const scope = ticket ? await broker.resolveTicket(ticket) : null;
      if (!scope) {
        return jsonApiError(context, {
          code: "CRM_MESSAGING_INVALID_SSE_TICKET",
          message: "Invalid SSE ticket.",
          status: 401,
        });
      }
      if (
        !(await matchesTicketScope(
          currentScope,
          serviceContext,
          scope,
          services,
        ))
      ) {
        return jsonApiError(context, {
          code: "CRM_MESSAGING_SSE_ACCESS_REVOKED",
          message: "SSE access is no longer authorized.",
          status: 403,
        });
      }
      const authorize = async () => {
        try {
          const refreshedContext = await createContext(context);
          assertConversationRead(refreshedContext);
          return matchesTicketScope(
            requireCrmScope(refreshedContext),
            refreshedContext,
            scope,
            services,
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
        sinceEventId: scope.sinceEventId ?? null,
        signal: context.req.raw.signal,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
        ...(logEntry ? { logger: logEntry.logger } : {}),
      });
    }),
  );
}
