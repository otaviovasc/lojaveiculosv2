import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmZapiSupportAuthorizer } from "../CrmService/crmConnectionSetupSupport.js";
import { createCrmChannelConnection } from "../CrmChannelConnectionService/createCrmChannelConnection.js";
import { configureWhatsappConnectionWebhooks } from "./configureWhatsappConnectionWebhooks.js";
import {
  requestZapiPairingCode,
  requestZapiPairingQr,
} from "./zapiWhatsappConnectionSetup.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { updateVerifiedZapiConnectionIdentity } from "./replaceZapiConnectionIdentity.js";

export type ZapiSupportScope = { storeId: StoreId; tenantId: TenantId };
export type ZapiSupportWebhookTarget = {
  basePath: string;
  canonicalApiOrigin: string;
};

export async function createZapiConnectionAsSupport(
  context: ServiceContext,
  input: ZapiSupportScope &
    ZapiSupportWebhookTarget & {
      displayName: string;
      instanceId: string;
      instanceToken: string;
    },
  ports: CrmServicePorts,
) {
  const scoped = await authorizeSupport(context, input, ports);
  return createCrmChannelConnection(
    scoped,
    {
      channel: "whatsapp",
      displayName: input.displayName,
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
      provider: "zapi",
      webhookSetupTarget: input,
    },
    ports,
  );
}

export async function updateZapiCredentialsAsSupport(
  context: ServiceContext,
  input: ZapiSupportScope &
    ZapiSupportWebhookTarget & {
      connectionId: string;
      instanceId: string;
      instanceToken: string;
    },
  ports: CrmServicePorts,
) {
  const scoped = await authorizeSupport(context, input, ports);
  return updateVerifiedZapiConnectionIdentity(scoped, input, ports);
}

export async function configureZapiWebhooksAsSupport(
  context: ServiceContext,
  input: ZapiSupportScope &
    ZapiSupportWebhookTarget & {
      connectionId: string;
      mode?: "configure" | "reset";
    },
  ports: CrmServicePorts,
) {
  const scoped = await authorizeSupport(context, input, ports);
  return configureWhatsappConnectionWebhooks(scoped, input, ports);
}

export async function requestZapiPairingQrAsSupport(
  context: ServiceContext,
  input: ZapiSupportScope & { connectionId: string },
  ports: CrmServicePorts,
) {
  const scoped = await authorizeSupport(context, input, ports);
  return requestZapiPairingQr(scoped, input, ports);
}

export async function requestZapiPairingCodeAsSupport(
  context: ServiceContext,
  input: ZapiSupportScope & { connectionId: string; phone: string },
  ports: CrmServicePorts,
) {
  const scoped = await authorizeSupport(context, input, ports);
  return requestZapiPairingCode(scoped, input, ports);
}

async function authorizeSupport(
  context: ServiceContext,
  scope: ZapiSupportScope,
  ports: CrmServicePorts,
): Promise<StoreScopedServiceContext> {
  assertPermission(context, "tenant.manage");
  if (context.actor.kind !== "user" || context.storeId !== null) {
    throw new AuthorizationError(
      "Z-API provider setup requires a platform support account context.",
    );
  }
  await getCrmZapiSupportAuthorizer(ports).assertPaidSetupEligible(scope);
  const scoped: StoreScopedServiceContext = {
    ...context,
    entitlements: ["crm", "crm_zapi"],
    permissions: [
      ...new Set([
        ...context.permissions,
        "crm.messaging.connection.pair",
        "crm.messaging.connection.setup",
        "crm.conversations.read",
      ]),
    ],
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  };
  logCrmServiceEvent(
    scoped,
    "crm.provider.zapi.support.authorization.completed",
    {
      operation: "authorize_support_setup",
      provider: "zapi",
    },
  );
  await auditCrmServiceEvent(scoped, {
    action: "crm.provider.zapi.connection.support.authorize",
    category: "data_access",
    metadata: { provider: "zapi" },
    permission: "tenant.manage",
    storeId: scope.storeId,
    summary: "Authorized paid Z-API support setup",
    tenantId: scope.tenantId,
  });
  return scoped;
}
