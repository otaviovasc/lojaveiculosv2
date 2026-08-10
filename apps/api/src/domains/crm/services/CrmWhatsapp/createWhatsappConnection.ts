import { randomBytes } from "node:crypto";
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
import {
  getCrmBillingQuotaGuard,
  getCrmConnectionCredentialVault,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
} from "../../ports/crmConnectionSetupProvider.js";
import {
  type CreateWhatsappConnectionInput,
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

const connectionPermission = "crm.whatsapp.connection.manage";
const integrationPermission = "crm.whatsapp.integrations.manage";

export async function createWhatsappConnection(
  context: ServiceContext,
  input: CreateWhatsappConnectionInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  assertPermission(context, connectionPermission);
  assertPermission(context, integrationPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM WhatsApp connection creation requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  if (input.provider === "zapi") {
    assertEntitlement(context as never, "crm_zapi");
  }
  logWhatsappServiceEvent(context, "crm.whatsapp.connection.create.started", {
    provider: input.provider,
  });

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.connection.create",
      category: "data_change",
      entityType: "crm_whatsapp_connection",
      metadata: { provider: input.provider },
      permission: connectionPermission,
      summary: "Created CRM WhatsApp connection",
    },
    async () => {
      const created = await runCrmTransaction(
        ports,
        async (transactionPorts) => {
          if (input.provider === "zapi") {
            const quotaGuard = getCrmBillingQuotaGuard(transactionPorts);
            await quotaGuard.assertAvailable({
              quotaKey: "crm_zapi",
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            });
          }
          const repository = getCrmConnectionRepository(transactionPorts);
          const current = await repository.listConnections({
            providers: [input.provider],
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          });
          if (current.some((connection) => connection.status !== "archived")) {
            throw new WhatsappConnectionProviderAlreadyExistsError(
              input.provider,
            );
          }
          const credentialsRef =
            input.provider === "zapi"
              ? await sealZapiCredentials(input, scope, transactionPorts)
              : {};
          let connection = await repository.createConnection({
            credentialsRef,
            displayName: input.displayName,
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
      return toWhatsappConnection(finalConnection, {
        checkedAt: new Date(),
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected",
        smartphoneConnected: null,
      });
    },
  );
}

async function sealZapiCredentials(
  input: Extract<CreateWhatsappConnectionInput, { provider: "zapi" }>,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const vault = getCrmConnectionCredentialVault(ports);
  const credentialScope = {
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const [instanceId, instanceToken, webhookSecret] = await Promise.all([
    vault.seal({
      ...credentialScope,
      plaintext: input.instanceId,
      purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...credentialScope,
      plaintext: input.instanceToken,
      purpose: ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...credentialScope,
      plaintext: randomBytes(32).toString("base64url"),
      purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    }),
  ]);
  return {
    mode: "stored",
    stored: { instanceId, instanceToken, webhookSecret },
  };
}
