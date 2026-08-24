import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  getCrmMessagingGateway,
  getCrmMediaStorage,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { mirrorNewZapiProfilePhoto } from "./mirrorZapiProfilePhoto.js";

export async function ingestZapiProfilePhoto(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: ParsedZapiInboundMessage;
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
      ...(!message.fromMe &&
      connection.provider === "zapi" &&
      gateway.getProfilePhotoUrl
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
  } catch (error) {
    result = {
      errorName: error instanceof Error ? error.name : "UnknownError",
      status: "failed" as const,
    };
  }
  if (result.status === "failed") {
    logCrmServiceEvent(
      context,
      "crm.provider.zapi.webhook.profile_photo.mirror_failed",
      {
        connectionId: connection.id,
        errorName: result.errorName ?? "UnknownError",
      },
    );
  }
  return result;
}
