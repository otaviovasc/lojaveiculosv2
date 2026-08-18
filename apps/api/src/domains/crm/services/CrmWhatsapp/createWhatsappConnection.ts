import {
  assertPermission,
  assertEntitlement,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmBillingQuotaGuard } from "../CrmService/crmConnectionSetupSupport.js";
import {
  type CreateWhatsappConnectionInput,
  WhatsappConnectionCredentialStateError,
  WhatsappConnectionProviderAlreadyExistsError,
} from "../../whatsapp/whatsappConnectionCreation.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
} from "../../whatsapp/whatsappConnectionModels.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import { runZapiWebhookSetupAttempt } from "./runZapiWebhookSetupAttempt.js";
import {
  readZapiCredentialState,
  sealZapiCredentials,
} from "../../whatsapp/zapiInitialCredentials.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { ensureFirstReadyChannelDefault } from "../CrmRoutingService/ensureFirstReadyChannelDefault.js";

const connectionPermission = "crm.messaging.connection.setup";

export async function createWhatsappConnection(
  context: ServiceContext,
  input: CreateWhatsappConnectionInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  assertPermission(context, connectionPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM WhatsApp connection creation requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  assertEntitlement(
    context as never,
    input.provider === "zapi" ? "crm_zapi" : "crm",
  );
  logWhatsappServiceEvent(context, "crm.whatsapp.connection.create.started", {
    provider: input.provider,
  });

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.connection.create_or_initial_configure",
      category: "data_change",
      entityType: "crm_whatsapp_connection",
      metadata: { provider: input.provider },
      permission: connectionPermission,
      summary: "Created or initially configured CRM WhatsApp connection",
    },
    async () => {
      const created = await runCrmTransaction(
        ports,
        async (transactionPorts) => {
          const repository = getCrmConnectionRepository(transactionPorts);
          const current = await repository.listConnections({
            providers: [input.provider],
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          });
          const existing = current.find(
            (connection) => connection.status !== "archived",
          );
          if (existing) {
            if (input.provider !== "zapi") {
              throw new WhatsappConnectionProviderAlreadyExistsError(
                input.provider,
              );
            }
            const credentialState = readZapiCredentialState(
              existing.credentialsRef,
            );
            if (credentialState === "partial") {
              throw new WhatsappConnectionCredentialStateError();
            }
            if (credentialState === "configured") {
              throw new WhatsappConnectionProviderAlreadyExistsError(
                input.provider,
              );
            }
            const credentialsRef = await sealZapiCredentials(
              input,
              scope,
              transactionPorts,
              existing.credentialsRef,
            );
            const configured = await repository.configureInitialZapiCredentials(
              {
                connectionId: existing.id,
                credentialsRef,
                externalInstanceId: input.instanceId,
                storeId: existing.storeId,
                tenantId: existing.tenantId,
              },
            );
            if (configured.status === "partial_state") {
              throw new WhatsappConnectionCredentialStateError();
            }
            if (configured.status !== "configured") {
              throw new WhatsappConnectionProviderAlreadyExistsError(
                input.provider,
              );
            }
            return configured.connection;
          }
          if (input.provider === "zapi") {
            const quotaGuard = getCrmBillingQuotaGuard(transactionPorts);
            await quotaGuard.assertAvailable({
              quotaKey: "crm_zapi",
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            });
          }
          const credentialsRef =
            input.provider === "zapi"
              ? await sealZapiCredentials(input, scope, transactionPorts)
              : {};
          let connection = await repository.createConnection({
            credentialsRef,
            displayName: input.displayName,
            externalInstanceId:
              input.provider === "zapi" ? input.instanceId : null,
            provider: input.provider,
            status: "sandbox",
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          });
          if (input.provider === "zapi") {
            const metadata = withZapiWebhookSetupState(
              connection.metadata,
              createZapiWebhookSetupIntent(connection.id),
            );
            connection =
              (await repository.updateConnection({
                connectionId: connection.id,
                metadata,
                storeId: connection.storeId,
                tenantId: connection.tenantId,
              })) ?? connection;
          }
          return connection;
        },
      );
      if (input.provider === "zapi" && input.webhookSetupTarget) {
        await runZapiWebhookSetupAttempt(
          context,
          { connectionId: created.id, ...input.webhookSetupTarget },
          ports,
        );
      }
      const finalConnection =
        (await getCrmConnectionRepository(ports).findConnectionById(
          created.id,
        )) ?? created;
      const result = toWhatsappConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
      if (
        result.ready &&
        ports.crmRoutingConnectionRepository &&
        ports.crmRoutingPolicyRepository
      ) {
        await ensureFirstReadyChannelDefault(
          context,
          { channel: result.channel ?? "whatsapp", connectionId: result.id },
          ports,
        );
      }
      return result;
    },
  );
}
