import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  getCrmMediaStorage,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import type { ParsedUazapiInboundMessage } from "./parseUazapiInboundMessage.js";
import { mirrorNewZapiProfilePhoto } from "./mirrorZapiProfilePhoto.js";

export async function ingestUazapiProfilePhoto(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: ParsedUazapiInboundMessage;
  },
  ports: CrmServicePorts,
) {
  const { connection, message } = input;
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
    logCrmServiceEvent(
      context,
      "crm.provider.uazapi.webhook.profile_photo.mirror_failed",
      {
        connectionId: connection.id,
        errorName: result.errorName ?? "UnknownError",
      },
    );
  }
  return result;
}
