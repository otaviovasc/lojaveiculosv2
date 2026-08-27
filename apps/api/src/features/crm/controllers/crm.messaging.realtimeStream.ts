import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEventEnvelope,
} from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import { toCrmRealtimeEventDto } from "./crm.messaging.realtime.dto.js";

export function createCrmSseResponse(input: {
  authorize?: () => Promise<boolean>;
  broker: CrmRealtimeBroker;
  connectionId: string | null;
  logger?: ServiceLogger;
  queueVisibility: Parameters<
    CrmRealtimeBroker["replay"]
  >[0]["queueVisibility"];
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
  let lastSentEventId: string | null = null;
  let terminated = false;
  let deliveryChain = Promise.resolve();
  let abortHandler: (() => void) | null = null;
  const log = (
    event: string,
    metadata: Parameters<ServiceLogger["info"]>[1] = {},
  ) => input.logger?.info(event, metadata);

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cleanup("cancel");
    },
    start(controller) {
      const write = (value: string) => {
        if (!terminated) controller.enqueue(encoder.encode(value));
      };
      const writeEnvelope = (envelope: CrmRealtimeEventEnvelope) => {
        if (sent.has(envelope.id)) return;
        sent.add(envelope.id);
        write(formatSseEnvelope(envelope));
        lastSentEventId = envelope.id;
        log("crm.realtime.last_event_id.advanced", {
          eventId: envelope.id,
          eventType: envelope.event.type,
        });
      };
      const close = (
        reason: "abort" | "authorization_revoked" | "replay_failed",
      ) => {
        cleanup(reason);
        try {
          controller.close();
        } catch {
          // Stream may already be closed by the browser.
        }
      };
      abortHandler = () => close("abort");
      log("crm.realtime.stream.open", {
        hasLastEventId: Boolean(input.sinceEventId),
      });
      write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      log("crm.realtime.frame.first", { eventType: "connected" });
      unsubscribe = input.broker.subscribe({
        connectionId: input.connectionId,
        onEvent: (envelope) => {
          if (isReplaying) pending.push(envelope);
          else deliverAuthorized(() => writeEnvelope(envelope));
        },
        queueVisibility: input.queueVisibility,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      log("crm.realtime.replay.started", {
        hasLastEventId: Boolean(input.sinceEventId),
      });
      void replay();
      heartbeat = setInterval(() => {
        deliverAuthorized(() => {
          write(":heartbeat\n\n");
          log("crm.realtime.heartbeat", { lastEventId: lastSentEventId });
        });
      }, 15_000);
      if (input.signal.aborted) close("abort");
      else input.signal.addEventListener("abort", abortHandler, { once: true });

      async function replay() {
        try {
          const events = await input.broker.replay({
            connectionId: input.connectionId,
            limit: 250,
            queueVisibility: input.queueVisibility,
            sinceEventId: input.sinceEventId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
          if (terminated) return;
          if (!(await authorize())) {
            close("authorization_revoked");
            return;
          }
          for (const envelope of events) writeEnvelope(envelope);
          log("crm.realtime.replay.completed", {
            eventCount: events.length,
            lastEventId: events.at(-1)?.id ?? input.sinceEventId ?? null,
          });
          isReplaying = false;
          for (const envelope of pending.splice(0)) {
            deliverAuthorized(() => writeEnvelope(envelope));
          }
        } catch (error: unknown) {
          input.logger?.warn("crm.realtime.replay.failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          close("replay_failed");
        }
      }

      function deliverAuthorized(deliver: () => void) {
        deliveryChain = deliveryChain.then(async () => {
          const authorized = await authorize();
          if (terminated) return;
          if (!authorized) {
            close("authorization_revoked");
            return;
          }
          deliver();
        });
        void deliveryChain;
      }

      async function authorize() {
        if (!input.authorize) return true;
        try {
          return await input.authorize();
        } catch {
          return false;
        }
      }
    },
  });

  function cleanup(
    reason: "abort" | "authorization_revoked" | "cancel" | "replay_failed",
  ) {
    if (terminated) return;
    terminated = true;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    unsubscribe?.();
    unsubscribe = null;
    pending.splice(0);
    if (abortHandler) input.signal.removeEventListener("abort", abortHandler);
    abortHandler = null;
    log(`crm.realtime.stream.${reason}`, { lastEventId: lastSentEventId });
  }

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Referrer-Policy": "no-referrer",
      "X-Accel-Buffering": "no",
    },
  });
}

function formatSseEnvelope(envelope: CrmRealtimeEventEnvelope) {
  const event = toCrmRealtimeEventDto(envelope.event);
  return [
    `id: ${envelope.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].join("\n");
}
