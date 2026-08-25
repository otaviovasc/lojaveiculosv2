import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { parseZapiAdAttribution } from "./zapiAdAttribution.js";
import type { mirrorZapiWhatsappMedia } from "./mirrorZapiWhatsappMedia.js";
import type { ingestZapiProfilePhoto } from "./zapiProfilePhotoIngestion.js";
import {
  getCrmConversationRepository,
  runCrmTransaction,
} from "../services/CrmService/serviceSupport.js";
import { trackCrmCampaignReply } from "../services/CrmMessagingService/crmCampaignReplyTracking.js";
import { createCrmMessageActivity } from "../messaging/createCrmMessageActivity.js";
import { resolveZapiWhatsappLead } from "./resolveZapiWhatsappLead.js";
import { findOrCreateCrmMessagingLead } from "../messaging/leadLinking.js";
import {
  applyZapiAdSessionTransition,
  unchangedZapiAdSession,
} from "./zapiAdSessionTransition.js";
import { persistZapiCanonicalInbound } from "./persistZapiCanonicalInbound.js";
import { hydrateCanonicalInbound } from "../messaging/hydrateCanonicalInbound.js";
import { interventionActorKind } from "../messaging/humanAttendanceTransition.js";
import { transitionConfirmedHumanOutboundAttendance } from "../messaging/outboundAttendance.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { enqueueCreatedInboundCrmPushIntent } from "../messaging/enqueueCreatedInboundCrmPushIntent.js";

export async function persistZapiWhatsappWebhook(
  context: ServiceContext,
  input: {
    attribution: ReturnType<typeof parseZapiAdAttribution>;
    connection: CrmConnection;
    detectedAt: Date;
    media: Awaited<ReturnType<typeof mirrorZapiWhatsappMedia>>;
    parsed: ParsedZapiInboundMessage;
    profilePhoto: Awaited<ReturnType<typeof ingestZapiProfilePhoto>>;
  },
  ports: CrmServicePorts,
) {
  const { attribution, connection, detectedAt, media, parsed, profilePhoto } =
    input;
  const directHumanOutbound = isDirectHumanOutbound(parsed);
  const senderOrigin = directHumanOutbound
    ? "human_channel"
    : parsed.fromMe
      ? "unknown"
      : "customer";
  const senderType = directHumanOutbound
    ? "HUMAN"
    : parsed.fromMe
      ? "SYSTEM"
      : "CUSTOMER";
  return runCrmTransaction(ports, async (transactionPorts) => {
    if (!parsed.fromMe) {
      const existingSession = await getCrmConversationRepository(
        transactionPorts,
      ).findConversationCycleByIdentity({
        ...(parsed.chatLid ? { customerChatId: parsed.chatLid } : {}),
        customerPhone: parsed.phone,
        channel: "WHATSAPP",
        connectionId: connection.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      const lead = await findOrCreateCrmMessagingLead(transactionPorts, {
        buyerName: parsed.customerDisplayName ?? null,
        buyerPhone: parsed.phone,
        channel: "WHATSAPP",
        connectionId: connection.id,
        direction: "INBOUND",
        externalId: parsed.externalId,
        ...(existingSession?.leadId
          ? { preferredLeadId: existingSession.leadId }
          : {}),
        source: "whatsapp",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      const canonical = await persistZapiCanonicalInbound(transactionPorts, {
        attribution,
        connection,
        lead,
        media,
        message: parsed,
        profilePhoto,
      });
      const result = await hydrateCanonicalInbound(transactionPorts, {
        canonical,
        connection,
        message: parsed,
      });
      if (result.createdMessage) {
        await enqueueCreatedInboundCrmPushIntent(
          context,
          result,
          transactionPorts,
          canonical.threadId,
        );
        await createCrmMessageActivity(transactionPorts, {
          connectionId: connection.id,
          content: parsed.content,
          direction: "inbound",
          leadId: lead.id,
          messageExternalId: parsed.externalId,
          occurredAt: parsed.providerTimestamp,
          provider: connection.provider,
          cycleId: canonical.cycleId,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        });
        await trackCrmCampaignReply(
          context,
          {
            message: result.message,
            conversationCycle: result.conversationCycle,
          },
          transactionPorts,
        );
      }
      const transition =
        attribution && canonical.attendanceState !== "bot_active"
          ? await applyZapiAdSessionTransition(
              getCrmConversationRepository(transactionPorts),
              {
                actorId: context.actor.id,
                actorKind: "provider",
                attribution,
                detectedAt,
                conversationCycle: result.conversationCycle,
              },
            )
          : unchangedZapiAdSession(result.conversationCycle);
      return {
        result: { ...result, conversationCycle: transition.conversationCycle },
        attendanceTransition: null,
        transition,
      };
    }
    const repository = getCrmConversationRepository(transactionPorts);
    const lead = await resolveZapiWhatsappLead(transactionPorts, {
      connection,
      message: parsed,
    });
    const result = await repository.ingestMessage({
      ...(parsed.chatLid ? { customerChatId: parsed.chatLid } : {}),
      ...((lead.buyerName ?? parsed.customerDisplayName)
        ? { customerDisplayName: lead.buyerName ?? parsed.customerDisplayName }
        : {}),
      customerPhone: parsed.phone,
      channel: "WHATSAPP",
      connectionId: connection.id,
      content: parsed.content,
      direction: parsed.fromMe ? "OUTBOUND" : "INBOUND",
      externalId: parsed.externalId,
      firstHandledAt: null,
      freshLeadAt: parsed.fromMe ? null : parsed.providerTimestamp,
      leadId: lead.id,
      ...(parsed.mediaType ? { mediaType: parsed.mediaType } : {}),
      ...(media.mediaUrl ? { mediaUrl: media.mediaUrl } : {}),
      metadata: media.metadata,
      providerTimestamp: parsed.providerTimestamp,
      ...(profilePhoto.status === "stored"
        ? {
            profilePhotoStorageKey: profilePhoto.storageKey,
            profilePhotoUrl: profilePhoto.profilePhotoUrl,
          }
        : {}),
      senderOrigin,
      senderType,
      status: parsed.fromMe ? "SENT" : "DELIVERED",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: parsed.type,
    });
    if (result.createdMessage) {
      await createCrmMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: parsed.content,
        direction: parsed.fromMe ? "outbound" : "inbound",
        leadId: lead.id,
        messageExternalId: parsed.externalId,
        occurredAt: parsed.providerTimestamp,
        provider: connection.provider,
        cycleId: result.conversationCycle.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!parsed.fromMe) {
        await trackCrmCampaignReply(
          context,
          {
            message: result.message,
            conversationCycle: result.conversationCycle,
          },
          transactionPorts,
        );
      }
    }
    const transition =
      attribution && !parsed.fromMe
        ? await applyZapiAdSessionTransition(repository, {
            actorId: context.actor.id,
            actorKind: "provider",
            attribution,
            detectedAt,
            conversationCycle: result.conversationCycle,
          })
        : unchangedZapiAdSession(result.conversationCycle);
    const attendanceTransition =
      result.createdMessage && result.message.senderOrigin === "human_channel"
        ? await transitionConfirmedHumanOutboundAttendance({
            actorId: context.actor.id,
            actorKind: interventionActorKind(context.actor.kind, "provider"),
            interventionId:
              result.conversationCycle.interventionId ?? randomUUID(),
            providerTimestamp: parsed.providerTimestamp,
            reason: "human_channel_message",
            repository,
            senderOrigin: result.message.senderOrigin,
            senderType: result.message.senderType,
            source: "seller_whatsapp",
            conversationCycle: result.conversationCycle,
          })
        : null;
    return {
      result: {
        ...result,
        conversationCycle:
          attendanceTransition?.conversationCycle ??
          transition.conversationCycle,
      },
      attendanceTransition,
      transition,
    };
  });
}

function isDirectHumanOutbound(
  parsed: Pick<ParsedZapiInboundMessage, "fromMe" | "metadata">,
) {
  if (!parsed.fromMe) return false;
  const interactive = parsed.metadata.interactive;
  return !(
    interactive &&
    typeof interactive === "object" &&
    !Array.isArray(interactive) &&
    (interactive as Record<string, unknown>).kind === "reaction"
  );
}
