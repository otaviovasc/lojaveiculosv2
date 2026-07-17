import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappConfigureWebhooksResult } from "../../ports/crmWhatsappGateway.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../whatsapp/whatsappWebhookEndpoints.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
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
  connectionId: string;
  requestOrigin: string;
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

      const baseUrl = resolveWebhookBaseUrl({
        basePath: input.basePath,
        requestOrigin: input.requestOrigin,
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
        results,
        tokenApplied: Boolean(input.webhookToken),
      };
    },
  );
}
