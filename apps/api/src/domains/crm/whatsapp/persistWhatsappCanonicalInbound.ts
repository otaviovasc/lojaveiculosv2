import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { persistCanonicalInbound } from "../messaging/persistCanonicalInbound.js";
import type { MirrorZapiWhatsappMediaResult } from "./mirrorZapiWhatsappMedia.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import type { ingestZapiProfilePhoto } from "./zapiProfilePhotoIngestion.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";

export async function persistWhatsappCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    attribution: ZapiAdAttribution | null;
    connection: CrmConnection;
    lead: CrmLead;
    media: MirrorZapiWhatsappMediaResult;
    message: ParsedZapiInboundMessage;
    profilePhoto: Awaited<ReturnType<typeof ingestZapiProfilePhoto>>;
    provider: "uazapi" | "zapi";
  },
) {
  const { attribution, connection, lead, media, message, profilePhoto } = input;
  const lidOnly = isWhatsappLidOnlyIdentity(message.phone, message.chatLid);
  return persistCanonicalInbound(ports, {
    channel: "whatsapp",
    connectionId: connection.id,
    contactDisplayName: message.customerDisplayName ?? null,
    content: message.content,
    customerChatId: message.chatLid ?? null,
    externalThreadId: lidOnly
      ? `lid:${message.chatLid}`
      : `phone:${message.phone}`,
    externalThreadAliases: [
      message.phone,
      ...(message.chatLid ? [message.chatLid] : []),
    ],
    identity: lidOnly
      ? {
          kind: "provider_subject",
          normalizedValue: `${input.provider}:${connection.id}:${message.chatLid}`,
        }
      : { kind: "phone", normalizedValue: message.phone },
    leadId: lead.id,
    occurredAt: message.providerTimestamp,
    mediaType: message.mediaType ?? null,
    mediaUrl: media.mediaUrl ?? null,
    messageType: message.type.toLowerCase(),
    metadata: media.metadata,
    provider: input.provider,
    providerMessageId: message.externalId,
    profilePhotoStorageKey:
      profilePhoto.status === "stored" ? profilePhoto.storageKey : null,
    profilePhotoUrl:
      profilePhoto.status === "stored"
        ? profilePhoto.profilePhotoUrl
        : (message.profilePhotoUrl ?? null),
    secondaryPhone: lidOnly ? null : message.phone,
    sender: "customer",
    senderOrigin: "customer",
    cycleMetadata: attribution ?? {},
    source: "whatsapp",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
}

function isWhatsappLidOnlyIdentity(phone: string, chatLid?: string) {
  if (!chatLid) return false;
  const digits = (value: string) => value.replace(/\D/g, "");
  return Boolean(digits(chatLid) && digits(chatLid) === digits(phone));
}
