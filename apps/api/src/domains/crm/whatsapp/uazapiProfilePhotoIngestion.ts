import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedUazapiInboundMessage } from "./parseUazapiInboundMessage.js";
import { ingestWhatsappProfilePhoto } from "./whatsappProfilePhotoIngestion.js";

export function ingestUazapiProfilePhoto(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: ParsedUazapiInboundMessage;
  },
  ports: CrmServicePorts,
) {
  return ingestWhatsappProfilePhoto(
    context,
    {
      connection: input.connection,
      failureEvent: "crm.provider.uazapi.webhook.profile_photo.mirror_failed",
      message: input.message,
    },
    ports,
  );
}
