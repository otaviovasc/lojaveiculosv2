import type { Context, Hono } from "hono";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEventEnvelope,
} from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { requireCrmScope } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertWhatsappRead } from "./crm.whatsapp.controller.support.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";

export type RegisterCrmWhatsappRealtimeRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  realtimeBroker?: CrmRealtimeBroker;
};

export function registerCrmWhatsappRealtimeRoutes(
  crmFeature: Hono,
  { createContext, realtimeBroker }: RegisterCrmWhatsappRealtimeRoutesOptions,
) {
  const broker = realtimeBroker;
  if (!broker) return;

  crmFeature.post("/whatsapp/events/ticket", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      const scope = requireCrmScope(serviceContext);
      const input = await readTicketInput(context);
      const ticket = await broker.issueTicket({
        connectionId: input.connectionId ?? null,
        sinceEventId: input.sinceEventId ?? null,
        storeId: scope.storeId as StoreId,
        tenantId: scope.tenantId as TenantId,
      });
      return context.json({
        expiresAt: ticket.expiresAt.toISOString(),
        ticket: ticket.ticket,
      });
    }),
  );

  crmFeature.get("/whatsapp/events", async (context) =>
    handleWhatsapp(context, async () => {
      const ticket = context.req.query("ticket");
      const scope = ticket ? await broker.resolveTicket(ticket) : null;
      if (!scope) {
        return jsonApiError(context, {
          code: "CRM_WHATSAPP_INVALID_SSE_TICKET",
          message: "Invalid SSE ticket.",
          status: 401,
        });
      }
      return createSseResponse({
        broker,
        connectionId: scope.connectionId ?? null,
        sinceEventId: readSinceEventId(context) ?? scope.sinceEventId ?? null,
        signal: context.req.raw.signal,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
    }),
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

function createSseResponse(input: {
  broker: CrmRealtimeBroker;
  connectionId: string | null;
  sinceEventId: string | null;
  signal: AbortSignal;
  storeId: StoreId;
  tenantId: TenantId;
}) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const pending: CrmRealtimeEventEnvelope[] = [];
  const sent = new Set<string>();
  let isReplaying = true;

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cleanup();
    },
    start(controller) {
      const write = (value: string) => {
        controller.enqueue(encoder.encode(value));
      };
      const writeEnvelope = (envelope: CrmRealtimeEventEnvelope) => {
        if (sent.has(envelope.id)) return;
        sent.add(envelope.id);
        write(formatSseEnvelope(envelope));
      };
      const close = () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Stream may already be closed by the browser.
        }
      };
      write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      unsubscribe = input.broker.subscribe({
        connectionId: input.connectionId,
        onEvent: (envelope) => {
          if (isReplaying) {
            pending.push(envelope);
            return;
          }
          writeEnvelope(envelope);
        },
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      void input.broker
        .replay({
          connectionId: input.connectionId,
          limit: 250,
          sinceEventId: input.sinceEventId,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .then((events) => {
          for (const envelope of events) writeEnvelope(envelope);
        })
        .finally(() => {
          isReplaying = false;
          for (const envelope of pending.splice(0)) writeEnvelope(envelope);
        });
      heartbeat = setInterval(() => {
        write(":heartbeat\n\n");
      }, 15_000);
      input.signal.addEventListener("abort", close, { once: true });
    },
  });

  function cleanup() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    unsubscribe?.();
    unsubscribe = null;
  }

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
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

function formatSseEnvelope(envelope: CrmRealtimeEventEnvelope) {
  return [
    `id: ${envelope.id}`,
    `event: ${envelope.event.type}`,
    `data: ${JSON.stringify(envelope.event)}`,
    "",
    "",
  ].join("\n");
}
