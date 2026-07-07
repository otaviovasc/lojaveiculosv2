import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  getCrmRepository,
  getCrmWhatsappGateway,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../ports/crmWhatsappGateway.js";
import type {
  CrmWhatsappMessageType,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { WhatsappMessage } from "./whatsappModels.js";
import { toWhatsappMessage, toWhatsappSession } from "./whatsappModels.js";
import {
  forwardWhatsappMessageToBot,
  notifyWhatsappInterventionChangedToBot,
} from "./whatsappBotWebhookForwarding.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappSessionNotFoundError,
} from "./whatsappSendErrors.js";

const terminalLeadStatuses = new Set(["archived", "lost", "won"]);

export type ProviderSentMessage = {
  externalId: string;
  providerTimestamp: Date;
  raw: Record<string, unknown>;
};

export type PreparedOutboundWhatsappMessage = {
  content: string;
  leadActivityContent?: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  sent: ProviderSentMessage;
  type: CrmWhatsappMessageType;
};

export type SendWhatsappOutboundInput = {
  prepare: (input: {
    connection: CrmConnection;
    gateway: CrmWhatsappGateway;
    phone: string;
    scope: { storeId: string; tenantId: string };
    session: CrmWhatsappSession;
  }) => Promise<PreparedOutboundWhatsappMessage>;
  sessionId: string;
};

export async function sendWhatsappOutboundMessage(
  context: ServiceContext,
  input: SendWhatsappOutboundInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  const scope = requireCrmScope(context);
  const whatsappRepository = getCrmWhatsappRepository(ports);
  const [session] = await whatsappRepository.listSessions({
    limit: 1,
    offset: 0,
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(input.sessionId);

  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    session.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== session.storeId ||
    connection.tenantId !== session.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(session.connectionId);
  }
  const prepared = await input.prepare({
    connection,
    gateway: getCrmWhatsappGateway(ports),
    phone: session.buyerPhone,
    scope,
    session,
  });
  const result = await whatsappRepository.ingestMessage({
    ...(session.buyerChatLid ? { buyerChatLid: session.buyerChatLid } : {}),
    ...(session.buyerName ? { buyerName: session.buyerName } : {}),
    buyerPhone: session.buyerPhone,
    channel: "WHATSAPP",
    connectionId: connection.id,
    content: prepared.content,
    direction: "OUTBOUND",
    externalId: prepared.sent.externalId,
    firstHandledAt: prepared.sent.providerTimestamp,
    leadId: session.leadId,
    ...(prepared.mediaType ? { mediaType: prepared.mediaType } : {}),
    ...(prepared.mediaUrl ? { mediaUrl: prepared.mediaUrl } : {}),
    metadata: prepared.metadata,
    providerTimestamp: prepared.sent.providerTimestamp,
    senderType: context.actor.kind === "integration" ? "AI" : "HUMAN",
    status: "SENT",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: prepared.type,
  });

  if (session.leadId && result.createdMessage) {
    await recordOutboundLeadInteraction(
      context,
      {
        content: prepared.leadActivityContent ?? prepared.content,
        leadId: session.leadId,
        messageExternalId: prepared.sent.externalId,
        occurredAt: prepared.sent.providerTimestamp,
        provider: connection.provider,
        raw: prepared.sent.raw,
        sessionId: session.id,
      },
      ports,
    );
  }

  const message = toWhatsappMessage(result.message);
  const realtimeSession = toWhatsappSession(result.session, connection);
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    message,
    session: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    session: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "session",
  });
  await forwardWhatsappMessageToBot(
    context,
    {
      connection,
      message: result.message,
      session: result.session,
    },
    ports,
  );
  if (
    session.status !== "HUMAN_TAKEOVER" &&
    result.session.status === "HUMAN_TAKEOVER"
  ) {
    await notifyWhatsappInterventionChangedToBot(
      context,
      {
        active: true,
        connection,
        session: result.session,
      },
      ports,
    );
  }

  return message;
}

async function recordOutboundLeadInteraction(
  context: ServiceContext,
  input: {
    content: string;
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    provider: string;
    raw: unknown;
    sessionId: string;
  },
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead = await repository.findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!lead) return;

  if (!terminalLeadStatuses.has(lead.status) && lead.status === "new") {
    await repository.updateLead({
      leadId: lead.id,
      status: "contacted",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
  }

  await repository.createActivity({
    activityType: "whatsapp",
    content: input.content,
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: "outbound",
    leadId: lead.id,
    metadata: {
      crmWhatsapp: {
        messageExternalId: input.messageExternalId,
        sessionId: input.sessionId,
      },
      provider: input.provider,
      raw: input.raw,
    },
    occurredAt: input.occurredAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}
