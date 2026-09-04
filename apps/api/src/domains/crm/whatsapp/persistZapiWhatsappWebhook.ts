import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { parseZapiAdAttribution } from "./zapiAdAttribution.js";
import type { mirrorZapiWhatsappMedia } from "./mirrorZapiWhatsappMedia.js";
import type { ingestZapiProfilePhoto } from "./zapiProfilePhotoIngestion.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import { persistZapiCanonicalInbound } from "./persistZapiCanonicalInbound.js";
import { persistWhatsappWebhook } from "./persistWhatsappWebhook.js";

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
  return persistWhatsappWebhook(
    context,
    input,
    ports,
    persistZapiCanonicalInbound,
  );
}
