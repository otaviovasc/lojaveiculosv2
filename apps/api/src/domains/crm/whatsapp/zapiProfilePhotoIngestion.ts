import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { ingestWhatsappProfilePhoto } from "./whatsappProfilePhotoIngestion.js";

export function ingestZapiProfilePhoto(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: ParsedZapiInboundMessage;
  },
  ports: CrmServicePorts,
) {
  return ingestWhatsappProfilePhoto(
    context,
    {
      connection: input.connection,
      failureEvent: "crm.provider.zapi.webhook.profile_photo.mirror_failed",
      message: input.message,
    },
    ports,
  );
}
