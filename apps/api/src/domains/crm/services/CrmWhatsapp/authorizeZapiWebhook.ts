import { timingSafeEqual } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { openZapiWebhookSecret } from "../../whatsapp/zapiWebhookSecret.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

export async function authorizeZapiWebhook(
  context: ServiceContext,
  input: { connectionId: string; token: string | null },
  ports: CrmServicePorts,
) {
  assertPermission(context, "crm.whatsapp.ingest");
  logWhatsappServiceEvent(
    context,
    "crm.provider.zapi.webhook.authorize.started",
    {
      connectionId: input.connectionId,
      operation: "authorize_webhook",
      provider: "zapi",
    },
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.webhook.zapi.authorize",
      category: "data_access",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { connectionId: input.connectionId, provider: "zapi" },
      permission: "crm.whatsapp.ingest",
      summary: "Authorized Z-API webhook connection",
    },
    async () => {
      const connection = await getCrmConnectionRepository(
        ports,
      ).findConnectionById(input.connectionId);
      if (
        !connection ||
        connection.provider !== "zapi" ||
        connection.status === "archived" ||
        !input.token
      ) {
        throw denied();
      }
      let expected: string;
      try {
        expected = await openZapiWebhookSecret(connection, ports);
      } catch {
        throw denied();
      }
      const receivedBuffer = Buffer.from(input.token);
      const expectedBuffer = Buffer.from(expected);
      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        throw denied();
      }
      logWhatsappServiceEvent(
        context,
        "crm.provider.zapi.webhook.authorize.completed",
        {
          connectionId: connection.id,
          operation: "authorize_webhook",
          provider: "zapi",
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        },
      );
      return {
        authorized: true as const,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      };
    },
  );
}

function denied() {
  return new AuthorizationError("Invalid CRM WhatsApp webhook token.");
}
