import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { CrmScopeError } from "../../crmScopeError.js";
import { connectionPermission } from "./createCrmChannelConnection.js";

export type ListUazapiInstancesInput = {
  /** Write-only BYOK admin token used only for this validation call. */
  adminToken: string;
  baseUrl?: string;
};

export type ListUazapiInstancesResult = {
  instances: readonly {
    connectedPhone: string | null;
    id: string;
    name: string;
    status: string;
  }[];
};

export async function listUazapiInstances(
  context: ServiceContext,
  input: ListUazapiInstancesInput,
  ports: CrmServicePorts,
): Promise<ListUazapiInstancesResult> {
  assertPermission(context, connectionPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "CRM uazapi instance discovery requires an authenticated store user.",
    );
  }
  requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  logCrmServiceEvent(context, "crm.channel_connection.uazapi.list_instances", {
    provider: "uazapi",
  });
  const provisioning = ports.crmUazapiProvisioningProvider;
  if (!provisioning) {
    throw new CrmScopeError("crmUazapiProvisioningProvider");
  }
  const audit = {
    action: "crm.channel_connection.uazapi.list_instances",
    category: "data_change",
    entityType: "crm_channel_connection",
    metadata: { provider: "uazapi" },
    permission: connectionPermission,
    summary: "Validated uazapi admin token by listing instances",
  } as const satisfies Parameters<typeof auditCrmServiceEvent>[1];
  try {
    const instances = await provisioning.listInstances({
      adminToken: input.adminToken.trim(),
      ...(input.baseUrl?.trim() ? { baseUrl: input.baseUrl.trim() } : {}),
    });
    await auditCrmServiceEvent(context, audit);
    return {
      instances: instances.map((instance) => ({
        connectedPhone: instance.connectedPhone,
        id: instance.id,
        name: instance.name,
        status: instance.status,
      })),
    };
  } catch (error) {
    await auditCrmServiceEvent(context, audit, "failed");
    throw error;
  }
}
