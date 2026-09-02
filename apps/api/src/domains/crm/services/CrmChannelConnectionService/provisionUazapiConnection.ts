import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  crmChannelConnectionCapabilityFacts,
  CRM_WHATSAPP_CONNECTION_LIMIT,
  type CreateCrmChannelConnectionInput,
  CrmWhatsappConnectionLimitError,
} from "../../channelConnections/connectionCreation.js";
import { auditCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { sealUazapiCredentials } from "./uazapiInitialCredentials.js";
import { CrmScopeError } from "../../crmScopeError.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { connectionPermission } from "./createCrmChannelConnection.js";

export async function provisionUazapiWhatsappConnection(
  context: ServiceContext,
  input: Extract<CreateCrmChannelConnectionInput, { provider: "uazapi" }>,
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
  const instanceName = `v2-${scope.storeId}-${randomUUID().slice(0, 8)}`;
  let provisioned: Awaited<ReturnType<typeof provisioning.createInstance>>;
  try {
    provisioned = await provisioning.createInstance({ name: instanceName });
  } catch (error) {
    await auditCrmServiceEvent(
      context,
      {
        action: "crm.channel_connection.uazapi.provision",
        category: "data_change",
        entityType: "crm_channel_connection",
        metadata: { provider: "uazapi" },
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
    metadata: { instanceName, provider: "uazapi" },
    permission: connectionPermission,
    summary: "Provisioned UAZAPI WhatsApp instance",
  });
  const credentialsRef = await sealUazapiCredentials(provisioned, scope, ports);
  try {
    return await runCrmTransaction(ports, async (transactionPorts) => {
      const transactionRepository =
        getCrmConnectionRepository(transactionPorts);
      const racedCount = (
        await transactionRepository.listConnections({
          channels: ["whatsapp"],
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        })
      ).filter((connection) => connection.status !== "archived").length;
      if (racedCount >= CRM_WHATSAPP_CONNECTION_LIMIT) {
        throw new CrmWhatsappConnectionLimitError();
      }
      return transactionRepository.createConnection({
        broker: "direct",
        channel: "whatsapp",
        credentialsRef,
        displayName: input.displayName,
        externalInstanceId: provisioned.instanceId,
        metadata: {
          capabilities: crmChannelConnectionCapabilityFacts({
            broker: "direct",
            channel: "whatsapp",
            provider: "uazapi",
          }),
          connected: false,
          degraded: false,
          errorCode: null,
          routingStatus: "preserved",
          uazapiWebhookSetup: { state: "pending" },
        },
        phone: input.connectionPhoneNumber?.trim() || null,
        provider: "uazapi",
        status: "sandbox",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
    });
  } catch (error) {
    try {
      await provisioning.deleteInstance({
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
