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
  CrmUazapiConnectionPhoneConflictError,
  CrmWhatsappConnectionLimitError,
} from "../../channelConnections/connectionCreation.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";

export type UazapiConnectionInput = Extract<
  CreateCrmChannelConnectionInput,
  { provider: "uazapi" }
>;

export type UazapiProvisioning = NonNullable<
  CrmServicePorts["crmUazapiProvisioningProvider"]
>;

export type UazapiCallerCredentials = {
  adminToken: string;
  baseUrl: string | undefined;
};

export async function persistUazapiConnection(
  input: UazapiConnectionInput,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  provisioned: {
    connected?: boolean;
    credentialsRef: Record<string, unknown>;
    externalInstanceId: string;
    phone: string | null;
  },
): Promise<CrmConnection> {
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
        credentialsRef: provisioned.credentialsRef,
        displayName: input.displayName,
        externalInstanceId: provisioned.externalInstanceId,
        metadata: {
          capabilities: crmChannelConnectionCapabilityFacts({
            broker: "direct",
            channel: "whatsapp",
            provider: "uazapi",
          }),
          connected: provisioned.connected ?? false,
          degraded: false,
          errorCode: null,
          routingStatus: "preserved",
          uazapiWebhookSetup: { state: "pending" },
        },
        phone: provisioned.phone,
        provider: "uazapi",
        status: "sandbox",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
    });
  } catch (error) {
    if (isPhoneUniqueViolation(error)) {
      throw new CrmUazapiConnectionPhoneConflictError();
    }
    throw error;
  }
}

/** Maps the per-store WhatsApp phone unique index without importing Drizzle. */
function isPhoneUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    candidate?.code === "23505" &&
    typeof candidate.constraint === "string" &&
    candidate.constraint.includes(
      "crm_channel_connections_whatsapp_phone_store_unique",
    )
  );
}
