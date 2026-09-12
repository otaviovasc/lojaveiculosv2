import { assertEntitlement } from "../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import { readZapiWebhookSetupState } from "../whatsapp/zapiWebhookSetupState.js";

export function assertProviderEffectAllowed(
  context: ServiceContext,
  connection: CrmConnection,
  options: { olxChatEnabled: boolean } = { olxChatEnabled: false },
) {
  if (
    connection.status !== "active" ||
    connection.storeId !== context.storeId ||
    connection.tenantId !== context.tenantId
  ) {
    throw new CrmMessageActionError(
      "CRM channel connection is not active for this store.",
      409,
    );
  }
  if (connection.provider === "olx" && !options.olxChatEnabled) {
    throw new CrmMessageActionError(
      "OLX Chat is not enabled for provider operations.",
      409,
    );
  }
  if (connection.provider === "olx") {
    const setup = readRecord(connection.metadata.webhookSetup);
    const capabilities = readRecord(setup.capabilities);
    const chat = readRecord(capabilities.chat);
    if (chat.status !== "active") {
      throw new CrmMessageActionError(
        "OLX Chat setup is not active for provider operations.",
        409,
      );
    }
    return;
  }
  if (connection.provider !== "zapi") return;
  if (!("entitlements" in context)) {
    throw new CrmMessageActionError(
      "Z-API access is not active for this store.",
      409,
    );
  }
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  if (readZapiWebhookSetupState(connection.metadata)?.status !== "configured") {
    throw new CrmMessageActionError(
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
