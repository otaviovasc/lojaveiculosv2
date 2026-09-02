import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { CrmUazapiInstanceNotFoundError } from "../../channelConnections/connectionCreation.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { sealUazapiCredentials } from "./uazapiInitialCredentials.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { connectionPermission } from "./createCrmChannelConnection.js";
import {
  persistUazapiConnection,
  type UazapiCallerCredentials,
  type UazapiConnectionInput,
  type UazapiProvisioning,
} from "./uazapiConnectionPersistence.js";

export async function attachExistingUazapiInstance(
  context: ServiceContext,
  input: Extract<UazapiConnectionInput, { mode: "attach" }>,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  provisioning: UazapiProvisioning,
  credentials: UazapiCallerCredentials,
): Promise<CrmConnection> {
  const instanceId = input.instanceId.trim();
  logCrmServiceEvent(context, "crm.channel_connection.uazapi.attach.started", {
    mode: "attach",
    provider: "uazapi",
  });
  let instances: Awaited<ReturnType<typeof provisioning.listInstances>>;
  try {
    instances = await provisioning.listInstances({
      adminToken: credentials.adminToken,
      ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {}),
    });
  } catch (error) {
    await auditUazapiAttach(context, { mode: "attach" }, "failed");
    throw error;
  }
  // The instance token is always taken from the server-side list response;
  // client-supplied tokens are never trusted.
  const instance = instances.find((candidate) => candidate.id === instanceId);
  if (!instance) {
    await auditUazapiAttach(
      context,
      { mode: "attach", reason: "instance_not_found" },
      "failed",
    );
    throw new CrmUazapiInstanceNotFoundError(instanceId);
  }
  await auditUazapiAttach(context, {
    instanceName: instance.name,
    mode: "attach",
  });
  const credentialsRef = await sealUazapiCredentials(
    {
      adminToken: credentials.adminToken,
      ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {}),
      instanceId: instance.id,
      instanceToken: instance.token,
    },
    scope,
    ports,
  );
  // Attach never compensation-deletes: the instance belongs to the store.
  return persistUazapiConnection(context, input, scope, ports, {
    connected: instance.status === "connected",
    credentialsRef,
    externalInstanceId: instance.id,
    phone:
      instance.status === "connected" && instance.connectedPhone
        ? instance.connectedPhone
        : null,
  });
}

async function auditUazapiAttach(
  context: ServiceContext,
  metadata: Record<string, string>,
  outcome?: "failed",
) {
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.channel_connection.uazapi.attach",
      category: "data_change",
      entityType: "crm_channel_connection",
      metadata: { ...metadata, provider: "uazapi" },
      permission: connectionPermission,
      summary: "Attached an existing UAZAPI WhatsApp instance",
    },
    outcome,
  );
}
