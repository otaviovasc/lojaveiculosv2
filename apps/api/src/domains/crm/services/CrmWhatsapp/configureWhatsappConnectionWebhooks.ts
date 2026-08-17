import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappConfigureWebhooksResult } from "../../ports/crmWhatsappGateway.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappMessageActionError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import { runZapiWebhookSetupAttempt } from "./runZapiWebhookSetupAttempt.js";
import type { ZapiWebhookSetupState } from "../../whatsapp/zapiWebhookSetupState.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { toWhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";
import { ensureFirstReadyChannelDefault } from "../CrmRoutingService/ensureFirstReadyChannelDefault.js";

const setupPermission = "crm.messaging.connection.setup";

export type ConfigureWhatsappConnectionWebhooksInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  mode?: "configure" | "reset";
};

export type ConfigureWhatsappConnectionWebhooksResult =
  CrmWhatsappConfigureWebhooksResult & {
    connectionId: string;
    setup: ZapiWebhookSetupState;
    tokenApplied: boolean;
  };

export async function configureWhatsappConnectionWebhooks(
  context: ServiceContext,
  input: ConfigureWhatsappConnectionWebhooksInput,
  ports: CrmServicePorts,
): Promise<ConfigureWhatsappConnectionWebhooksResult> {
  const operation = input.mode ?? "configure";
  assertPermission(context, setupPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM WhatsApp webhook setup requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  assertEntitlement(context as never, "crm_zapi");
  logWhatsappServiceEvent(
    context,
    `crm.whatsapp.connection.webhooks.${operation}.started`,
    { connectionId: input.connectionId },
  );

  return recordWhatsappServiceMutation(
    context,
    {
      action: `crm.whatsapp.connection.webhooks.${operation}`,
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId: input.connectionId,
        operation,
        tokenApplied: true,
      },
      permission: setupPermission,
      summary:
        operation === "reset"
          ? "Reset ZAPI WhatsApp webhooks to the canonical API origin"
          : "Configured ZAPI WhatsApp webhooks",
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
      assertSecretDestinationIsTrusted(connection.webhookUrl, input);
      const { results, setup } = await runZapiWebhookSetupAttempt(
        context,
        {
          basePath: input.basePath,
          canonicalApiOrigin: input.canonicalApiOrigin,
          connectionId: connection.id,
          forceReconfigure: operation === "reset",
        },
        ports,
      );
      const updated =
        (await repository.findConnectionById(connection.id)) ?? connection;
      const readyConnection = toWhatsappConnection(
        updated,
        await readConnectionLiveStatus(context, updated, ports),
      );
      if (
        readyConnection.ready &&
        context.permissions.includes("crm.routing.default.manage") &&
        ports.crmRoutingConnectionRepository &&
        ports.crmRoutingPolicyRepository
      ) {
        await ensureFirstReadyChannelDefault(
          context,
          { channel: "whatsapp", connectionId: connection.id },
          ports,
        );
      }

      logWhatsappServiceEvent(
        context,
        `crm.whatsapp.connection.webhooks.${operation}.completed`,
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
        tokenApplied: true,
      };
    },
  );
}

function assertSecretDestinationIsTrusted(
  webhookUrl: string | null,
  input: ConfigureWhatsappConnectionWebhooksInput,
) {
  if (!webhookUrl) return;
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
