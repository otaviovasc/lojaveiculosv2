import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmMessagingConfigureWebhooksResult } from "../../ports/crmMessagingGateway.js";
import {
  CrmConnectionNotFoundError,
  CrmMessageActionError,
} from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { runUazapiWebhookSetupAttempt } from "./runUazapiWebhookSetupAttempt.js";
import type { UazapiWebhookSetupState } from "../../whatsapp/uazapiWebhookSetupState.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { toCrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";
import { assertTrustedUazapiWebhookDestination } from "../../whatsapp/uazapiWebhookDestination.js";

const setupPermission = "crm.messaging.connection.setup";

export type ConfigureUazapiConnectionWebhooksInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  forceReconfigure?: boolean;
};

export type ConfigureUazapiConnectionWebhooksResult =
  CrmMessagingConfigureWebhooksResult & {
    connectionId: string;
    setup: UazapiWebhookSetupState;
    tokenApplied: boolean;
  };

export async function configureUazapiConnectionWebhooks(
  context: ServiceContext,
  input: ConfigureUazapiConnectionWebhooksInput,
  ports: CrmServicePorts,
): Promise<ConfigureUazapiConnectionWebhooksResult> {
  assertPermission(context, setupPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM WhatsApp webhook setup requires an authenticated store user.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  logCrmServiceEvent(
    context,
    "crm.channel.whatsapp.connection.webhooks.configure.started",
    { connectionId: input.connectionId, provider: "uazapi" },
  );

  return recordCrmServiceMutation(
    context,
    {
      action: "crm.channel.whatsapp.connection.webhooks.configure",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId: input.connectionId,
        operation: "configure",
        provider: "uazapi",
      },
      permission: setupPermission,
      summary: "Configured uazapi WhatsApp webhooks",
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
        throw new CrmConnectionNotFoundError(input.connectionId);
      }
      if (connection.provider !== "uazapi") {
        throw new CrmMessageActionError(
          "Only uazapi connections support automatic webhook configuration.",
          409,
        );
      }
      assertTrustedUazapiWebhookDestination(
        connection.webhookUrl,
        input.canonicalApiOrigin,
      );
      const { results, setup } = await runUazapiWebhookSetupAttempt(
        context,
        {
          basePath: input.basePath,
          canonicalApiOrigin: input.canonicalApiOrigin,
          connectionId: connection.id,
          ...(input.forceReconfigure !== undefined
            ? { forceReconfigure: input.forceReconfigure }
            : {}),
        },
        ports,
      );
      const updated =
        (await repository.findConnectionById(connection.id)) ?? connection;
      const readyConnection = toCrmChannelConnection(
        updated,
        await readConnectionLiveStatus(context, updated, ports),
      );
      if (
        readyConnection.ready &&
        ports.crmRoutingConnectionRepository &&
        ports.crmRoutingPolicyRepository
      ) {
        await persistInitialReadyChannelDefault(
          context,
          { channel: "whatsapp", connectionId: connection.id },
          ports,
        );
      }

      logCrmServiceEvent(
        context,
        "crm.channel.whatsapp.connection.webhooks.configure.completed",
        {
          connectionId: connection.id,
          failed: results.filter((result) => !result.ok).length,
          provider: "uazapi",
          succeeded: results.filter((result) => result.ok).length,
        },
      );

      return {
        connectionId: connection.id,
        results: results.map(redactWebhookResultUrl),
        setup,
        tokenApplied: setup.state === "configured",
      };
    },
  );
}

function redactWebhookResultUrl(
  result: CrmMessagingConfigureWebhooksResult["results"][number],
) {
  try {
    const url = new URL(result.url);
    url.searchParams.delete("token");
    return { ...result, url: url.toString() };
  } catch {
    return { ...result, url: result.url.replace(/([?&])token=[^&]*/u, "$1") };
  }
}
