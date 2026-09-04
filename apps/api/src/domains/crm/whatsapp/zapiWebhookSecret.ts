import { ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../ports/crmConnectionSetupProvider.js";
import { createWhatsappWebhookSecretReader } from "./whatsappWebhookSecret.js";

const reader = createWhatsappWebhookSecretReader({
  notConfiguredMessage: "Z-API webhook authentication is not configured.",
  purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
});

export const openZapiWebhookSecret = reader.openWebhookSecret;
export const openAcceptedZapiWebhookSecrets = reader.openAcceptedWebhookSecrets;
