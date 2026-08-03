import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappConfigureWebhooksResult } from "../../ports/crmWhatsappGateway.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../whatsapp/whatsappWebhookEndpoints.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappMessageActionError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const managePermission = "crm.whatsapp.connection.manage";

export type ConfigureWhatsappConnectionWebhooksInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  webhookToken: string | null;
};

export type ConfigureWhatsappConnectionWebhooksResult =
  CrmWhatsappConfigureWebhooksResult & {
    connectionId: string;
    tokenApplied: boolean;
  };

export async function configureWhatsappConnectionWebhooks(
  context: ServiceContext,
  input: ConfigureWhatsappConnectionWebhooksInput,
  ports: CrmServicePorts,
): Promise<ConfigureWhatsappConnectionWebhooksResult> {
  assertPermission(context, managePermission);
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.connection.webhooks.configure.started",
    { connectionId: input.connectionId },
  );

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.connection.webhooks.configure",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId: input.connectionId,
        tokenApplied: Boolean(input.webhookToken),
      },
      permission: managePermission,
      summary: "Configured ZAPI WhatsApp webhooks",
    },
    async () => {
      const repository = getCrmConnectionRepository(ports);
      const connection = await repository.findConnectionById(
        input.connectionId,
      );
      if (
        !connection ||
        connection.storeId !== scope.storeId ||
        connection.tenantId !== scope.tenantId
      ) {
        throw new WhatsappConnectionNotFoundError(input.connectionId);
      }
      if (connection.provider !== "zapi") {
        throw new WhatsappMessageActionError(
          "Only Z-API connections support automatic webhook configuration.",
          409,
        );
      }
      assertSharedTokenDestinationIsTrusted(connection.webhookUrl, input);

      const baseUrl = resolveWebhookBaseUrl({
        basePath: input.basePath,
        requestOrigin: input.canonicalApiOrigin,
        webhookUrl: connection.webhookUrl,
      });
      const endpoints = buildWhatsappWebhookEndpoints({
        baseUrl,
        connectionId: connection.id,
        token: input.webhookToken,
      });

      const { results } = await getCrmWhatsappGateway(ports).configureWebhooks(
        connection,
        {
          webhooks: endpoints.map((endpoint) => ({
            type: endpoint.type,
            url: endpoint.url,
          })),
        },
      );

      logWhatsappServiceEvent(
        context,
        "crm.whatsapp.connection.webhooks.configure.completed",
        {
          connectionId: connection.id,
          failed: results.filter((result) => !result.ok).length,
          succeeded: results.filter((result) => result.ok).length,
        },
      );

      return {
        connectionId: connection.id,
        results: results.map(redactWebhookResultUrl),
        tokenApplied: Boolean(input.webhookToken),
      };
    },
  );
}

function assertSharedTokenDestinationIsTrusted(
  webhookUrl: string | null,
  input: ConfigureWhatsappConnectionWebhooksInput,
) {
  if (!input.webhookToken || !webhookUrl) return;
  try {
    if (
      new URL(webhookUrl).origin === new URL(input.canonicalApiOrigin).origin
    ) {
      return;
    }
  } catch {
    // Invalid configured URLs already fall back to the request origin.
    return;
  }
  throw new WhatsappMessageActionError(
    "A custom webhook origin cannot receive the shared Z-API webhook token.",
    409,
  );
}

function redactWebhookResultUrl(
  result: CrmWhatsappConfigureWebhooksResult["results"][number],
) {
  try {
    const url = new URL(result.url);
    url.searchParams.delete("token");
    return { ...result, url: url.toString() };
  } catch {
    return { ...result, url: result.url.replace(/([?&])token=[^&]*/u, "$1") };
  }
}
