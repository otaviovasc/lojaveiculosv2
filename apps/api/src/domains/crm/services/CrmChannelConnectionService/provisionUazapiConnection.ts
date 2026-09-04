import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  CRM_WHATSAPP_CONNECTION_LIMIT,
  CrmWhatsappConnectionLimitError,
} from "../../channelConnections/connectionCreation.js";
import { auditCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { sealUazapiCredentials } from "./uazapiInitialCredentials.js";
import { CrmScopeError } from "../../crmScopeError.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { connectionPermission } from "./createCrmChannelConnection.js";
import { attachExistingUazapiInstance } from "./attachUazapiConnection.js";
import {
  persistUazapiConnection,
  type UazapiCallerCredentials,
  type UazapiConnectionInput,
  type UazapiProvisioning,
} from "./uazapiConnectionPersistence.js";

export async function provisionUazapiWhatsappConnection(
  context: ServiceContext,
  input: UazapiConnectionInput,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
): Promise<CrmConnection> {
  const provisioning = ports.crmUazapiProvisioningProvider;
  if (!provisioning) {
    throw new CrmScopeError("crmUazapiProvisioningProvider");
  }
  const repository = getCrmConnectionRepository(ports);
  const activeWhatsappCount = (
    await repository.listConnections({
      channels: ["whatsapp"],
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })
  ).filter((connection) => connection.status !== "archived").length;
  if (activeWhatsappCount >= CRM_WHATSAPP_CONNECTION_LIMIT) {
    throw new CrmWhatsappConnectionLimitError();
  }
  const credentials: UazapiCallerCredentials = {
    adminToken: input.adminToken.trim(),
    baseUrl: input.baseUrl?.trim() || undefined,
  };
  return input.mode === "attach"
    ? attachExistingUazapiInstance(
        context,
        input,
        scope,
        ports,
        provisioning,
        credentials,
      )
    : createNewUazapiInstance(
        context,
        input,
        scope,
        ports,
        provisioning,
        credentials,
      );
}

async function createNewUazapiInstance(
  context: ServiceContext,
  input: Extract<UazapiConnectionInput, { mode: "create" }>,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  provisioning: UazapiProvisioning,
  credentials: UazapiCallerCredentials,
): Promise<CrmConnection> {
  const instanceName = `v2-${scope.storeId}-${randomUUID().slice(0, 8)}`;
  let provisioned: Awaited<ReturnType<typeof provisioning.createInstance>>;
  try {
    provisioned = await provisioning.createInstance({
      adminToken: credentials.adminToken,
      ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {}),
      name: instanceName,
    });
  } catch (error) {
    await auditCrmServiceEvent(
      context,
      {
        action: "crm.channel_connection.uazapi.provision",
        category: "data_change",
        entityType: "crm_channel_connection",
        metadata: { mode: "create", provider: "uazapi" },
        permission: connectionPermission,
        summary: "Provisioned UAZAPI WhatsApp instance",
      },
      "failed",
    );
    throw error;
  }
  await auditCrmServiceEvent(context, {
    action: "crm.channel_connection.uazapi.provision",
    category: "data_change",
    entityType: "crm_channel_connection",
    metadata: { instanceName, mode: "create", provider: "uazapi" },
    permission: connectionPermission,
    summary: "Provisioned UAZAPI WhatsApp instance",
  });
  const credentialsRef = await sealUazapiCredentials(
    {
      adminToken: credentials.adminToken,
      baseUrl: provisioned.baseUrl,
      instanceId: provisioned.instanceId,
      instanceToken: provisioned.instanceToken,
    },
    scope,
    ports,
  );
  try {
    return await persistUazapiConnection(context, input, scope, ports, {
      credentialsRef,
      externalInstanceId: provisioned.instanceId,
      phone: input.connectionPhoneNumber?.trim() || null,
    });
  } catch (error) {
    try {
      await provisioning.deleteInstance({
        adminToken: credentials.adminToken,
        baseUrl: provisioned.baseUrl,
        instanceId: provisioned.instanceId,
      });
    } catch (compensationError) {
      context.logger.error(
        "crm.channel_connection.uazapi.compensation_failed",
        {
          errorName:
            compensationError instanceof Error
              ? compensationError.name
              : "UnknownError",
          instanceName,
          requestId: context.requestId,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        },
      );
    }
    throw error;
  }
}
