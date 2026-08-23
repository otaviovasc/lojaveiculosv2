import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  AuthorizationError,
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ZapiSupportScope,
  ZapiSupportWebhookTarget,
} from "./manageZapiConnectionAsSupport.js";
import { updateVerifiedZapiConnectionIdentity } from "./replaceZapiConnectionIdentity.js";

export type RepairZapiConnectionCredentialsInput = ZapiSupportWebhookTarget & {
  connectionId: string;
  expectedRevision?: number;
  idempotencyKey?: string;
  instanceId: string;
  instanceToken: string;
};

export async function repairZapiConnectionCredentials(
  context: ServiceContext,
  input: RepairZapiConnectionCredentialsInput,
  ports: CrmServicePorts,
) {
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Z-API credential repair requires an authenticated store user.",
    );
  }
  assertPermission(context, "crm.messaging.connection.setup");
  assertPermission(context, "tenant.manage");
  assertEntitlement(context as never, "crm");
  assertEntitlement(context as never, "crm_zapi");
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.provider.zapi.connection.repair.started", {
    connectionId: input.connectionId,
    provider: "zapi",
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.zapi.connection.repair",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { provider: "zapi" },
      permission: "tenant.manage",
      summary: "Repaired credentials for an existing Z-API connection",
    },
    () =>
      updateVerifiedZapiConnectionIdentity(
        context as StoreScopedServiceContext,
        {
          ...input,
          allowIdentityReplacement: false,
          storeId: scope.storeId as ZapiSupportScope["storeId"],
          tenantId: scope.tenantId as ZapiSupportScope["tenantId"],
        },
        ports,
      ),
  );
}
