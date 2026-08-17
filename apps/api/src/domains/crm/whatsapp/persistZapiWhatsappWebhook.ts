import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { parseZapiAdAttribution } from "./zapiAdAttribution.js";
import type { mirrorZapiWhatsappMedia } from "./mirrorZapiWhatsappMedia.js";
import type { ingestZapiProfilePhoto } from "./zapiProfilePhotoIngestion.js";
import {
  getCrmWhatsappRepository,
  runCrmTransaction,
} from "../services/CrmService/serviceSupport.js";
import { trackWhatsappCampaignReply } from "../services/CrmWhatsapp/whatsappCampaignReplyTracking.js";
import { createWhatsappMessageActivity } from "./createWhatsappMessageActivity.js";
import { resolveZapiWhatsappLead } from "./resolveZapiWhatsappLead.js";
import {
  applyZapiAdSessionTransition,
  unchangedZapiAdSession,
} from "./zapiAdSessionTransition.js";
import { persistZapiCanonicalInbound } from "./persistZapiCanonicalInbound.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import { transitionConfirmedHumanOutboundAttendance } from "./sendWhatsappOutboundAttendance.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";

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
    ? "human_whatsapp"
    : parsed.fromMe
      ? "unknown"
      : "customer";
  const senderType = directHumanOutbound
    ? "HUMAN"
    : parsed.fromMe
      ? "SYSTEM"
      : "CUSTOMER";
  return runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmWhatsappRepository(transactionPorts);
    const lead = await resolveZapiWhatsappLead(transactionPorts, {
      connection,
      message: parsed,
    });
    const result = await repository.ingestMessage({
      ...(parsed.chatLid ? { buyerChatLid: parsed.chatLid } : {}),
      ...((lead.buyerName ?? parsed.buyerName)
        ? { buyerName: lead.buyerName ?? parsed.buyerName }
        : {}),
      buyerPhone: parsed.phone,
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
    if (!parsed.fromMe) {
      await persistZapiCanonicalInbound(transactionPorts, {
        connection,
        media,
        message: parsed,
        session: result.session,
      });
    }
    if (result.createdMessage) {
      await createWhatsappMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: parsed.content,
        direction: parsed.fromMe ? "outbound" : "inbound",
        leadId: lead.id,
        messageExternalId: parsed.externalId,
        occurredAt: parsed.providerTimestamp,
        provider: connection.provider,
        sessionId: result.session.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!parsed.fromMe) {
        await trackWhatsappCampaignReply(
          context,
          { message: result.message, session: result.session },
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
            session: result.session,
          })
        : unchangedZapiAdSession(result.session);
    const attendanceTransition = directHumanOutbound
      ? await transitionConfirmedHumanOutboundAttendance({
          actorId: context.actor.id,
          actorKind: interventionActorKind(context.actor.kind, "provider"),
          interventionId: result.session.interventionId ?? randomUUID(),
          providerTimestamp: parsed.providerTimestamp,
          reason: "human_whatsapp_message",
          repository,
          senderOrigin,
          senderType,
          source: "seller_whatsapp",
          session: result.session,
        })
      : null;
    return {
      result: {
        ...result,
        session: attendanceTransition?.session ?? transition.session,
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
