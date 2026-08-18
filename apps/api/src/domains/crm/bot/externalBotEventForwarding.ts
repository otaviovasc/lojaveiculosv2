import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { enqueueExternalBotEvent } from "./services/ExternalBotManagerService/enqueueExternalBotEvent.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmHumanAttendanceState,
  CrmMessage,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export type CrmAttendanceChangeSource =
  "admin" | "ai_request" | "auto" | "bot" | "seller_whatsapp";

export async function enqueueCrmMessageExternalBotEvent(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: CrmMessage;
    conversationCycle: CrmConversationCycle;
  },
  ports: CrmServicePorts,
  options: { throwOnFailure?: boolean } = {},
) {
  if (input.conversationCycle.status === "HUMAN_TAKEOVER") return;
  if (input.message.type === "STICKER") return;
  await enqueueCanonicalEvent(
    context,
    input,
    ports,
    {
      channel: input.connection.channel,
      classification: "message_activity",
      direction:
        input.message.direction === "OUTBOUND" ? "outbound" : "inbound",
      messageRef: input.message.id,
    },
    "message_received",
    options.throwOnFailure ?? false,
  );
}

export async function enqueueCrmAttendanceExternalBotEvent(
  context: ServiceContext,
  input: {
    active: boolean;
    attendanceChangedAt?: Date | null;
    attendanceState?: CrmHumanAttendanceState | null;
    attendanceStateVersion?: number | null;
    connection: CrmConnection;
    endedAt?: Date | null;
    excludedMessageId?: string;
    interventionId?: string | null;
    reason?: string | null;
    conversationCycle: CrmConversationCycle;
    source?: string | null;
    startedAt?: Date | null;
    triggeredBy?: CrmAttendanceChangeSource;
  },
  ports: CrmServicePorts,
) {
  if (input.active) return;
  await enqueueCanonicalEvent(
    context,
    input,
    ports,
    {
      channel: input.connection.channel,
      humanAttendanceActive: false,
    },
    "human_attendance_changed",
    false,
  );
}

async function enqueueCanonicalEvent(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    conversationCycle: CrmConversationCycle;
  },
  ports: CrmServicePorts,
  payload: Record<string, unknown>,
  type: "human_attendance_changed" | "message_received",
  throwOnFailure: boolean,
) {
  const manager = ports.externalBotManager;
  if (
    !manager ||
    !ports.crmExternalBotIntegrationRepository ||
    !input.conversationCycle.threadId
  )
    return;
  const integration =
    await ports.crmExternalBotIntegrationRepository.findExternalBotIntegration({
      storeId: input.connection.storeId,
      tenantId: input.connection.tenantId,
    });
  if (!integration?.enabled || !integration.id) return;
  const scopedContext = createServiceContext({
    actor: context.actor,
    audit: context.audit,
    logger: context.logger,
    permissions: ["crm.bot.events.publish"],
    request: context.request ?? { requestId: context.requestId },
    ...(context.source ? { source: context.source } : {}),
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  try {
    await enqueueExternalBotEvent(
      scopedContext,
      {
        allowedAction: "conversation.summarize",
        authorizedCommand: {
          action: "conversation.summarize",
          payload: { summary: "Canonical CRM conversation event." },
        },
        channel: input.connection.channel,
        connectionId: input.connection.id,
        expectedAttendanceRevision:
          input.conversationCycle.humanAttendanceStateVersion ?? 0,
        expectedRevision: input.conversationCycle.revision,
        idempotencyKey: `crm-bot-event:${type}:${input.conversationCycle.id}:${input.conversationCycle.revision}`,
        integrationId: integration.id,
        modelVersion: manager.modelVersion,
        payload,
        provider: input.connection.provider,
        threadId: input.conversationCycle.threadId,
        type,
      },
      manager,
    );
  } catch (error) {
    context.logger.warn("crm.external_bot.event.enqueue_failed", {
      connectionId: input.connection.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId: context.requestId,
      storeId: context.storeId,
      tenantId: context.tenantId,
      type,
    });
    if (throwOnFailure) throw error;
  }
}
