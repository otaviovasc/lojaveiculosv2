import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  AuthorizationError,
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import {
  CrmConnectionSetupProviderError,
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../ports/crmConnectionSetupProvider.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { toCrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";
import { readConnectionLiveStatus } from "../../whatsapp/zapiConnectionCredentialUpdate.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  getCrmConnectionCredentialVault,
  getUazapiConnectionSetupProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { persistReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";
import {
  CrmUazapiCredentialVerificationError,
  UazapiConnectionRevisionConflictError,
  UazapiIdentityReplacementRequiresSupportError,
  readCurrentUazapiInstanceId,
  readRecord,
  readString,
} from "./repairUazapiConnectionCredentialsSupport.js";

export type RepairUazapiConnectionCredentialsInput = {
  baseUrl?: string;
  connectionId: string;
  expectedRevision?: number;
  instanceId: string;
  instanceToken: string;
};

const credentialRotationPermission = "crm.messaging.credentials.rotate";
const setupPermission = "crm.messaging.connection.setup";

export async function repairUazapiConnectionCredentials(
  context: ServiceContext,
  input: RepairUazapiConnectionCredentialsInput,
  ports: CrmServicePorts,
) {
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Uazapi credential repair requires an authenticated store user.",
    );
  }
  assertPermission(context, setupPermission);
  assertPermission(context, credentialRotationPermission);
  assertEntitlement(context as never, "crm");
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.provider.uazapi.connection.repair.started", {
    connectionId: input.connectionId,
    provider: "uazapi",
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.uazapi.connection.repair",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { provider: "uazapi" },
      permission: credentialRotationPermission,
      summary: "Repaired credentials for an existing uazapi connection",
    },
    async () => {
      const repository = getCrmConnectionRepository(ports);
      const current = await repository.findConnectionById(input.connectionId);
      if (
        !current ||
        current.provider !== "uazapi" ||
        current.status === "archived" ||
        current.storeId !== scope.storeId ||
        current.tenantId !== scope.tenantId
      ) {
        throw new CrmConnectionNotFoundError(input.connectionId);
      }
      if (
        input.expectedRevision !== undefined &&
        (current.revision ?? 0) !== input.expectedRevision
      ) {
        throw new UazapiConnectionRevisionConflictError({
          connectionId: current.id,
          expectedRevision: input.expectedRevision,
        });
      }
      const instanceId = input.instanceId.trim();
      const currentInstanceId = await readCurrentUazapiInstanceId(
        current,
        ports,
      );
      if (currentInstanceId && currentInstanceId !== instanceId) {
        throw new UazapiIdentityReplacementRequiresSupportError();
      }
      const vault = getCrmConnectionCredentialVault(ports);
      const credentialScope = {
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      };
      const stored = readRecord(current.credentialsRef.stored);
      const sealedBaseUrl = readString(stored.baseUrl);
      const apiBaseUrl =
        input.baseUrl?.trim() ||
        (sealedBaseUrl
          ? await vault.open({
              ...credentialScope,
              purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
              sealed: sealedBaseUrl,
            })
          : null);
      if (!apiBaseUrl) {
        throw new CrmConnectionSetupProviderError(
          "Uazapi base URL is missing. Inform the uazapi base URL to repair the connection.",
          "configuration_error",
        );
      }
      const instanceToken = input.instanceToken.trim();
      let providerStatus: Awaited<
        ReturnType<
          ReturnType<typeof getUazapiConnectionSetupProvider>["validateStatus"]
        >
      >;
      try {
        providerStatus = await getUazapiConnectionSetupProvider(
          ports,
        ).validateStatus({ apiBaseUrl, instanceId, instanceToken });
      } catch {
        throw new CrmUazapiCredentialVerificationError();
      }
      const [baseUrl, sealedInstanceId, sealedInstanceToken] =
        await Promise.all([
          vault.seal({
            ...credentialScope,
            plaintext: apiBaseUrl,
            purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
          }),
          vault.seal({
            ...credentialScope,
            plaintext: instanceId,
            purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
          }),
          vault.seal({
            ...credentialScope,
            plaintext: instanceToken,
            purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
          }),
        ]);
      const updated = await repository.updateConnection({
        connectionId: current.id,
        credentialsRef: {
          ...(current.credentialsRef.env
            ? { env: current.credentialsRef.env }
            : {}),
          mode: "stored",
          stored: {
            ...stored,
            baseUrl,
            instanceId: sealedInstanceId,
            instanceToken: sealedInstanceToken,
          },
        },
        metadata: {
          ...current.metadata,
          capabilities: crmChannelConnectionCapabilityFacts({
            broker: "direct",
            channel: "whatsapp",
            provider: "uazapi",
          }),
          connected: providerStatus.connected,
          degraded: false,
          errorCode: providerStatus.connected ? null : "disconnected",
          providerConnected: providerStatus.connected,
        },
        ...(providerStatus.connectedPhone
          ? { phone: providerStatus.connectedPhone }
          : {}),
        status:
          current.status === "paused"
            ? "paused"
            : providerStatus.connected
              ? "active"
              : "disconnected",
        ...(input.expectedRevision !== undefined
          ? { expectedRevision: input.expectedRevision }
          : {}),
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!updated) throw new CrmConnectionNotFoundError(input.connectionId);
      const finalConnection =
        (await repository.findConnectionById(updated.id)) ?? updated;
      await auditCrmServiceEvent(context, {
        action: "crm.provider.uazapi.connection.credentials_rotated",
        category: "data_change",
        entityId: updated.id,
        entityType: "crm_whatsapp_connection",
        metadata: { identityOutcome: "same_instance", provider: "uazapi" },
        permission: credentialRotationPermission,
        summary: "Rotated credentials for the verified uazapi instance",
      });
      const result = toCrmChannelConnection(
        finalConnection,
        await readConnectionLiveStatus(context, finalConnection, ports),
      );
      await persistReadyChannelDefault(context, result, ports);
      return result;
    },
  );
}
