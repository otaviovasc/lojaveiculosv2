import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { MirrorUazapiWhatsappMediaResult } from "./mirrorUazapiWhatsappMedia.js";
import type { ParsedUazapiInboundMessage } from "./parseUazapiInboundMessage.js";
import type { ingestUazapiProfilePhoto } from "./uazapiProfilePhotoIngestion.js";
import type { UazapiAdAttribution } from "./uazapiAdAttribution.js";
import { persistWhatsappCanonicalInbound } from "./persistWhatsappCanonicalInbound.js";

export async function persistUazapiCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    attribution: UazapiAdAttribution | null;
    lead: CrmLead;
    media: MirrorUazapiWhatsappMediaResult;
    message: ParsedUazapiInboundMessage;
    profilePhoto: Awaited<ReturnType<typeof ingestUazapiProfilePhoto>>;
  },
) {
  return persistWhatsappCanonicalInbound(ports, {
    ...input,
    provider: "uazapi",
  });
}
