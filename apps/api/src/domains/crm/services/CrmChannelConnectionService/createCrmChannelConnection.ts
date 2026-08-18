import {
  assertPermission,
  assertEntitlement,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmBillingQuotaGuard } from "../CrmService/crmConnectionSetupSupport.js";
import {
  crmChannelConnectionCapabilityFacts,
  type CreateCrmChannelConnectionInput,
  CrmChannelConnectionCredentialStateError,
  CrmChannelConnectionProviderAlreadyExistsError,
} from "../../channelConnections/connectionCreation.js";
import {
  toCrmChannelConnection,
  type CrmChannelConnection,
} from "../../channelConnections/channelConnectionModels.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import { runZapiWebhookSetupAttempt } from "../CrmWhatsappService/runZapiWebhookSetupAttempt.js";
import {
  readZapiCredentialState,
  sealZapiCredentials,
} from "../../whatsapp/zapiInitialCredentials.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";

const connectionPermission = "crm.messaging.connection.setup";

export async function createCrmChannelConnection(
  context: ServiceContext,
  input: CreateCrmChannelConnectionInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  assertPermission(context, connectionPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM messaging connection creation requires an authenticated store user.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(
    context as never,
    input.provider === "zapi" ? "crm_zapi" : "crm",
  );
  logCrmServiceEvent(context, "crm.channel_connection.create.started", {
    channel: input.channel,
    provider: input.provider,
  });

  return recordCrmServiceMutation(
    context,
    {
      action: "crm.channel_connection.create_or_initial_configure",
      category: "data_change",
      entityType: "crm_channel_connection",
      metadata: { channel: input.channel, provider: input.provider },
      permission: connectionPermission,
      summary: "Created or initially configured CRM channel connection",
    },
    async () => {
      const created = await runCrmTransaction(
        ports,
        async (transactionPorts) => {
          const repository = getCrmConnectionRepository(transactionPorts);
          const current = await repository.listConnections({
            channels: [input.channel],
            providers: [input.provider],
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          });
          const existing = current.find(
            (connection) => connection.status !== "archived",
          );
          if (existing) {
            if (input.provider !== "zapi") {
              throw new CrmChannelConnectionProviderAlreadyExistsError(input);
            }
            const credentialState = readZapiCredentialState(
              existing.credentialsRef,
            );
            if (credentialState === "partial") {
              throw new CrmChannelConnectionCredentialStateError();
            }
            if (credentialState === "configured") {
              throw new CrmChannelConnectionProviderAlreadyExistsError(input);
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
              throw new CrmChannelConnectionCredentialStateError();
            }
            if (configured.status !== "configured") {
              throw new CrmChannelConnectionProviderAlreadyExistsError(input);
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
          const setupIdentity =
            input.provider === "zapi"
              ? ({
                  broker: "direct",
                  channel: "whatsapp",
                  provider: "zapi",
                } as const)
              : ({
                  broker: "composio",
                  channel: input.channel,
                  provider: "meta_cloud",
                } as const);
          let connection = await repository.createConnection({
            broker: setupIdentity.broker,
            channel: input.channel,
            credentialsRef,
            displayName: input.displayName,
            externalInstanceId:
              input.provider === "zapi" ? input.instanceId : null,
            metadata: {
              capabilities: crmChannelConnectionCapabilityFacts(setupIdentity),
              connected: false,
              degraded: false,
              errorCode: null,
            },
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
      const result = toCrmChannelConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
      if (
        result.ready &&
        ports.crmRoutingConnectionRepository &&
        ports.crmRoutingPolicyRepository
      ) {
        await persistInitialReadyChannelDefault(
          context,
          { channel: result.channel ?? "whatsapp", connectionId: result.id },
          ports,
        );
      }
      return result;
    },
  );
}
