import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnectionProvider } from "../../ports/crmConnectionRepository.js";
import type { CrmWhatsappProviderStatus } from "../../ports/crmWhatsappGateway.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.list";

export type WhatsappConnectionLiveStatus =
  | (CrmWhatsappProviderStatus & {
      providerStatus: "connected" | "disconnected" | "unknown";
    })
  | {
      checkedAt: Date;
      connected: null;
      connectedPhone: null;
      errorMessage: string;
      providerStatus: "error";
      smartphoneConnected: null;
    };

export type WhatsappConnection = {
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  live: WhatsappConnectionLiveStatus;
  phone: string | null;
  provider: CrmConnectionProvider;
  status: string;
  webhookUrl: string | null;
};

export async function listWhatsappConnections(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly WhatsappConnection[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const repository = getCrmConnectionRepository(ports);
  const gateway = getCrmWhatsappGateway(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.connections.list.started");
  const connections = await repository.listConnections({
    providers: ["zapi"],
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  const result = await Promise.all(
    connections.map(async (connection) => {
      const live = await gateway
        .getConnectionStatus(connection)
        .catch((error: unknown): WhatsappConnectionLiveStatus => ({
          checkedAt: new Date(),
          connected: null,
          connectedPhone: null,
          errorMessage:
            error instanceof Error ? error.message : "Unknown provider error.",
          providerStatus: "error",
          smartphoneConnected: null,
        }));

      return {
        displayName: connection.displayName,
        externalConnectionId: connection.externalConnectionId,
        externalInstanceId: connection.externalInstanceId,
        id: connection.id,
        live,
        phone: connection.phone,
        provider: connection.provider,
        status: connection.status,
        webhookUrl: connection.webhookUrl,
      };
    }),
  );
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.connections.list",
    category: "data_access",
    metadata: { connectionCount: result.length },
    permission,
    summary: "Listed CRM WhatsApp connections",
  });
  return result;
}
