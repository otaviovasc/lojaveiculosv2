import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { openAcceptedZapiWebhookSecrets } from "../../whatsapp/zapiWebhookSecret.js";
import {
  authorizeWhatsappWebhook,
  completeWhatsappWebhookAuthorization,
  type WhatsappWebhookAuthorizationProvider,
} from "./authorizeWhatsappWebhookSupport.js";

const zapiAuthorization: WhatsappWebhookAuthorizationProvider = {
  openAcceptedSecrets: openAcceptedZapiWebhookSecrets,
  provider: "zapi",
  rateLimitedMessage: "Z-API webhook rate limit was reached.",
  summary: "Authorized Z-API webhook connection",
};

export async function authorizeZapiWebhook(
  context: ServiceContext,
  input: {
    connectionId: string;
    sourceFingerprint: string;
    token: string | null;
  },
  ports: CrmServicePorts,
) {
  return authorizeWhatsappWebhook(zapiAuthorization, context, input, ports);
}

export async function completeZapiWebhookAuthorization(
  context: ServiceContext,
  input: { connectionId: string; storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
) {
  return completeWhatsappWebhookAuthorization(
    zapiAuthorization,
    context,
    input,
    outcome,
    metadata,
  );
}
