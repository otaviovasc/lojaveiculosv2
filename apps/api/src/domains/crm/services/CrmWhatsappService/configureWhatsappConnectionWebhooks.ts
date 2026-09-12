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
import { runZapiWebhookSetupAttempt } from "./runZapiWebhookSetupAttempt.js";
import type { ZapiWebhookSetupState } from "../../whatsapp/zapiWebhookSetupState.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { toCrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";
import { assertTrustedZapiWebhookDestination } from "../../whatsapp/zapiWebhookDestination.js";
import {
  promoteZapiWebhookSecret,
  stageZapiWebhookSecretRotation,
} from "./zapiWebhookSecretRotation.js";

const setupPermission = "crm.messaging.connection.setup";

export type ConfigureCrmChannelConnectionWebhooksInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  mode?: "configure" | "reset";
};

export type ConfigureCrmChannelConnectionWebhooksResult =
  CrmMessagingConfigureWebhooksResult & {
    connectionId: string;
    setup: ZapiWebhookSetupState;
    tokenApplied: boolean;
  };

export async function configureWhatsappConnectionWebhooks(
  context: ServiceContext,
  input: ConfigureCrmChannelConnectionWebhooksInput,
  ports: CrmServicePorts,
): Promise<ConfigureCrmChannelConnectionWebhooksResult> {
  const operation = input.mode ?? "configure";
  assertPermission(context, setupPermission);
  if (operation === "reset") {
    assertPermission(context, "crm.messaging.credentials.rotate");
  }
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM WhatsApp webhook setup requires an authenticated store user.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  logCrmServiceEvent(
    context,
    `crm.channel.whatsapp.connection.webhooks.${operation}.started`,
    { connectionId: input.connectionId },
  );

  return recordCrmServiceMutation(
    context,
    {
      action: `crm.channel.whatsapp.connection.webhooks.${operation}`,
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId: input.connectionId,
        operation,
      },
      permission: setupPermission,
      summary:
        operation === "reset"
          ? "Reset ZAPI WhatsApp webhooks to the canonical API origin"
          : "Configured ZAPI WhatsApp webhooks",
    },
    async () => {
      const repository = getCrmConnectionRepository(ports);
      let connection = await repository.findConnectionById(input.connectionId);
      if (
        !connection ||
        connection.storeId !== scope.storeId ||
        connection.tenantId !== scope.tenantId
      ) {
        throw new CrmConnectionNotFoundError(input.connectionId);
      }
      if (connection.provider !== "zapi") {
        throw new CrmMessageActionError(
          "Only Z-API connections support automatic webhook configuration.",
          409,
        );
      }
      assertTrustedZapiWebhookDestination(
        connection.webhookUrl,
        input.canonicalApiOrigin,
      );
      let pendingWebhookSecret: string | null = null;
      if (operation === "reset") {
        const staged = await stageZapiWebhookSecretRotation(connection, ports);
        connection = staged.connection;
        pendingWebhookSecret = staged.pendingWebhookSecret;
      }
      const { results, setup } = await runZapiWebhookSetupAttempt(
        context,
        {
          basePath: input.basePath,
          canonicalApiOrigin: input.canonicalApiOrigin,
          connectionId: connection.id,
          forceReconfigure: operation === "reset",
          ...(operation === "reset"
            ? { webhookSecretSlot: "pending" as const }
            : {}),
        },
        ports,
      );
      if (
        operation === "reset" &&
        setup.status === "configured" &&
        pendingWebhookSecret
      ) {
        connection = await promoteZapiWebhookSecret(
          connection.id,
          pendingWebhookSecret,
          ports,
        );
      }
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
        `crm.channel.whatsapp.connection.webhooks.${operation}.completed`,
        {
          connectionId: connection.id,
          failed: results.filter((result) => !result.ok).length,
          succeeded: results.filter((result) => result.ok).length,
        },
      );

      return {
        connectionId: connection.id,
        results: results.map(redactWebhookResultUrl),
        setup,
        tokenApplied: setup.status === "configured",
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
