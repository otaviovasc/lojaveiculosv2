import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { UazapiAdAttribution } from "./uazapiAdAttribution.js";
import type { mirrorUazapiWhatsappMedia } from "./mirrorUazapiWhatsappMedia.js";
import type { ingestUazapiProfilePhoto } from "./uazapiProfilePhotoIngestion.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedUazapiInboundMessage } from "./parseUazapiInboundMessage.js";
import { persistUazapiCanonicalInbound } from "./persistUazapiCanonicalInbound.js";
import { persistWhatsappWebhook } from "./persistWhatsappWebhook.js";

export async function persistUazapiWhatsappWebhook(
  context: ServiceContext,
  input: {
    attribution: UazapiAdAttribution | null;
    connection: CrmConnection;
    detectedAt: Date;
    media: Awaited<ReturnType<typeof mirrorUazapiWhatsappMedia>>;
    parsed: ParsedUazapiInboundMessage;
    profilePhoto: Awaited<ReturnType<typeof ingestUazapiProfilePhoto>>;
  },
  ports: CrmServicePorts,
) {
  return persistWhatsappWebhook(
    context,
    input,
    ports,
    persistUazapiCanonicalInbound,
  );
}
