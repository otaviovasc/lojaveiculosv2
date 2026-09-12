import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { openAcceptedUazapiWebhookSecrets } from "../../whatsapp/uazapiWebhookSecret.js";
import {
  authorizeWhatsappWebhook,
  completeWhatsappWebhookAuthorization,
  type WhatsappWebhookAuthorizationProvider,
} from "./authorizeWhatsappWebhookSupport.js";

const uazapiAuthorization: WhatsappWebhookAuthorizationProvider = {
  openAcceptedSecrets: openAcceptedUazapiWebhookSecrets,
  provider: "uazapi",
  rateLimitedMessage: "Uazapi webhook rate limit was reached.",
  summary: "Authorized Uazapi webhook connection",
};

export async function authorizeUazapiWebhook(
  context: ServiceContext,
  input: {
    connectionId: string;
    sourceFingerprint: string;
    token: string | null;
  },
  ports: CrmServicePorts,
) {
  return authorizeWhatsappWebhook(uazapiAuthorization, context, input, ports);
}

export async function completeUazapiWebhookAuthorization(
  context: ServiceContext,
  input: { connectionId: string; storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
) {
  return completeWhatsappWebhookAuthorization(
    uazapiAuthorization,
    context,
    input,
    outcome,
    metadata,
  );
}
