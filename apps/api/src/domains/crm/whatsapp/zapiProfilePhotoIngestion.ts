import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  getCrmWhatsappGateway,
  getCrmWhatsappMediaStorage,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logWhatsappServiceEvent } from "../services/CrmWhatsapp/serviceSupport.js";
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
  const gateway = getCrmWhatsappGateway(ports);
  const result = await mirrorNewZapiProfilePhoto({
    ...(message.chatLid ? { buyerChatLid: message.chatLid } : {}),
    ...(message.buyerName ? { buyerName: message.buyerName } : {}),
    buyerPhone: message.phone,
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
    remoteMediaFetcher: ports.crmWhatsappMediaFetcher ?? null,
    repository: getCrmWhatsappRepository(ports),
    storage: getCrmWhatsappMediaStorage(ports),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (result.status === "failed") {
    logWhatsappServiceEvent(
      context,
      "crm.whatsapp.webhook.zapi.profile_photo.mirror_failed",
      {
        connectionId: connection.id,
        errorName: result.errorName ?? "UnknownError",
      },
    );
  }
  return result;
}
