import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { persistCanonicalInbound } from "../messaging/persistCanonicalInbound.js";
import type { MirrorZapiWhatsappMediaResult } from "./mirrorZapiWhatsappMedia.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";

export async function persistZapiCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    media: MirrorZapiWhatsappMediaResult;
    message: ParsedZapiInboundMessage;
    session: CrmWhatsappSession;
  },
) {
  const { connection, media, message, session } = input;
  const lidOnly = isZapiLidOnlyIdentity(message.phone, message.chatLid);
  await persistCanonicalInbound(ports, {
    channel: "whatsapp",
    connectionCapabilities: {
      inbound: true,
      outbound: true,
      templates: false,
    },
    connectionDisplayName: connection.displayName,
    connectionId: connection.id,
    contactDisplayName: message.buyerName ?? null,
    content: message.content,
    externalThreadId: lidOnly
      ? `lid:${message.chatLid}`
      : `phone:${message.phone}`,
    externalThreadAliases: [
      message.phone,
      ...(message.chatLid ? [message.chatLid] : []),
      ...(session.channelExternalId ? [session.channelExternalId] : []),
      ...(session.externalSessionId ? [session.externalSessionId] : []),
    ],
    identity: lidOnly
      ? {
          kind: "provider_subject",
          normalizedValue: `zapi:${connection.id}:${message.chatLid}`,
        }
      : { kind: "phone", normalizedValue: message.phone },
    occurredAt: message.providerTimestamp,
    mediaType: message.mediaType ?? null,
    mediaUrl: media.mediaUrl ?? null,
    messageType: message.type.toLowerCase(),
    metadata: media.metadata,
    provider: "zapi",
    providerMessageId: message.externalId,
    sender: "customer",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
}

function isZapiLidOnlyIdentity(phone: string, chatLid?: string) {
  if (!chatLid) return false;
  const digits = (value: string) => value.replace(/\D/g, "");
  return Boolean(digits(chatLid) && digits(chatLid) === digits(phone));
}
