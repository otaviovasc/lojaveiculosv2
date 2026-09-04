import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { MirrorZapiWhatsappMediaResult } from "./mirrorZapiWhatsappMedia.js";
import type { ParsedZapiInboundMessage } from "./parseZapiInboundMessage.js";
import type { ingestZapiProfilePhoto } from "./zapiProfilePhotoIngestion.js";
import type { parseZapiAdAttribution } from "./zapiAdAttribution.js";
import { persistWhatsappCanonicalInbound } from "./persistWhatsappCanonicalInbound.js";

export async function persistZapiCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    attribution: ReturnType<typeof parseZapiAdAttribution>;
    lead: CrmLead;
    media: MirrorZapiWhatsappMediaResult;
    message: ParsedZapiInboundMessage;
    profilePhoto: Awaited<ReturnType<typeof ingestZapiProfilePhoto>>;
  },
) {
  return persistWhatsappCanonicalInbound(ports, { ...input, provider: "zapi" });
}
