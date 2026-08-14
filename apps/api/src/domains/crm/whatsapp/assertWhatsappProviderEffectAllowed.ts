import { assertEntitlement } from "../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";
import { readZapiWebhookSetupState } from "./zapiWebhookSetupState.js";

export function assertWhatsappProviderEffectAllowed(
  context: ServiceContext,
  connection: CrmConnection,
  options: { olxChatEnabled: boolean } = { olxChatEnabled: false },
) {
  if (
    connection.status !== "active" ||
    connection.storeId !== context.storeId ||
    connection.tenantId !== context.tenantId
  ) {
    throw new WhatsappMessageActionError(
      "WhatsApp connection is not active for this store.",
      409,
    );
  }
  if (connection.provider === "olx_chat" && !options.olxChatEnabled) {
    throw new WhatsappMessageActionError(
      "OLX Chat is not enabled for provider operations.",
      409,
    );
  }
  if (connection.provider === "olx_chat") {
    const setup = readRecord(connection.metadata.webhookSetup);
    const capabilities = readRecord(setup.capabilities);
    const chat = readRecord(capabilities.chat);
    if (chat.status !== "active") {
      throw new WhatsappMessageActionError(
        "OLX Chat setup is not active for provider operations.",
        409,
      );
    }
    return;
  }
  if (connection.provider !== "zapi") return;
  if (!("entitlements" in context)) {
    throw new WhatsappMessageActionError(
      "Z-API access is not active for this store.",
      409,
    );
  }
  assertEntitlement(context as StoreScopedServiceContext, "crm_zapi");
  if (readZapiWebhookSetupState(connection.metadata)?.status !== "configured") {
    throw new WhatsappMessageActionError(
      "Z-API setup is not configured for provider operations.",
      409,
    );
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
