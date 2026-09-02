import { UAZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../ports/crmConnectionSetupProvider.js";
import { createWhatsappWebhookSecretReader } from "./whatsappWebhookSecret.js";

const reader = createWhatsappWebhookSecretReader({
  notConfiguredMessage: "Uazapi webhook authentication is not configured.",
  purpose: UAZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
});

export const openUazapiWebhookSecret = reader.openWebhookSecret;
export const openAcceptedUazapiWebhookSecrets =
  reader.openAcceptedWebhookSecrets;
