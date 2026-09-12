import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  getCrmMessagingGateway,
  getCrmMediaStorage,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import { mirrorNewZapiProfilePhoto } from "./mirrorZapiProfilePhoto.js";

export type WhatsappProfilePhotoMessage = {
  chatLid?: string | undefined;
  customerDisplayName?: string | undefined;
  fromMe: boolean;
  phone: string;
  profilePhotoUrl?: string | undefined;
};

/**
 * Shared inbound profile-photo mirroring for WhatsApp providers: store the
 * webhook-provided photo when present, otherwise fall back to the provider
 * lookup exposed by the messaging gateway (Z-API `profile-picture`, uazapi
 * `/chat/details`). Never blocks ingestion; failures are only logged.
 */
export async function ingestWhatsappProfilePhoto(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    failureEvent: string;
    message: WhatsappProfilePhotoMessage;
  },
  ports: CrmServicePorts,
) {
  const { connection, message } = input;
  const gateway = getCrmMessagingGateway(ports);
  const repository = getCrmConversationRepository(ports);
  let result;
  try {
    result = await mirrorNewZapiProfilePhoto({
      ...(message.chatLid ? { customerChatId: message.chatLid } : {}),
      ...(message.customerDisplayName
        ? { customerDisplayName: message.customerDisplayName }
        : {}),
      customerPhone: message.phone,
      connectionId: connection.id,
      contactIdentity: message.chatLid ?? message.phone,
      ...(message.profilePhotoUrl ? { photoUrl: message.profilePhotoUrl } : {}),
      ...(!message.fromMe && gateway.getProfilePhotoUrl
        ? {
            resolvePhotoUrl: () =>
              gateway.getProfilePhotoUrl!(connection, { phone: message.phone }),
          }
        : {}),
      remoteMediaFetcher: ports.crmMediaFetcher ?? null,
      repository,
      storage: getCrmMediaStorage(ports),
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (result.status === "stored") {
      const conversationCycle = await repository.upsertConversationCycleContext(
        {
          ...(message.chatLid ? { customerChatId: message.chatLid } : {}),
          ...(message.customerDisplayName
            ? { customerDisplayName: message.customerDisplayName }
            : {}),
          customerPhone: message.phone,
          channel: "WHATSAPP",
          connectionId: connection.id,
          profilePhotoStorageKey: result.storageKey,
          profilePhotoUrl: result.profilePhotoUrl,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        },
      );
      return { ...result, conversationCycle };
    }
    if ("sourcePhotoUrl" in result && result.sourcePhotoUrl) {
      const conversationCycle = await repository.upsertConversationCycleContext(
        {
          ...(message.chatLid ? { customerChatId: message.chatLid } : {}),
          ...(message.customerDisplayName
            ? { customerDisplayName: message.customerDisplayName }
            : {}),
          customerPhone: message.phone,
          channel: "WHATSAPP",
          connectionId: connection.id,
          profilePhotoUrl: result.sourcePhotoUrl,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        },
      );
      return { ...result, conversationCycle };
    }
  } catch (error) {
    result = {
      errorName: error instanceof Error ? error.name : "UnknownError",
      status: "failed" as const,
    };
  }
  if (result.status === "failed") {
    logCrmServiceEvent(context, input.failureEvent, {
      connectionId: connection.id,
      errorName: result.errorName ?? "UnknownError",
    });
  }
  return result;
}
