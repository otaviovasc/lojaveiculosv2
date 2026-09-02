import {
  assertPermission,
  assertEntitlement,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";

const connectionPermission = "crm.messaging.connection.pair" as const;

export type WhatsappConnectionSetupProvider = "uazapi" | "zapi";

export async function loadWhatsappSetupTarget<TCredentials>(
  providerConfig: {
    actorErrorMessage: string;
    provider: WhatsappConnectionSetupProvider;
  },
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
  openCredentials: (
    connection: CrmConnection,
    ports: CrmServicePorts,
  ) => Promise<TCredentials>,
) {
  assertPermission(context, connectionPermission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(providerConfig.actorErrorMessage);
  }
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  logCrmServiceEvent(
    context,
    `crm.provider.${providerConfig.provider}.connection.setup.started`,
    {
      connectionId,
    },
  );
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.provider !== providerConfig.provider ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(connectionId);
  }
  return {
    connection,
    credentials: await openCredentials(connection, ports),
  };
}

export async function runWhatsappProviderOperation<T>(
  provider: WhatsappConnectionSetupProvider,
  context: ServiceContext,
  connectionId: string,
  operation: string,
  action: () => Promise<T>,
) {
  const startedAt = Date.now();
  try {
    const result = await action();
    logCrmServiceEvent(
      context,
      `crm.provider.${provider}.operation.completed`,
      {
        connectionId,
        durationMs: Date.now() - startedAt,
        operation,
        provider,
      },
    );
    return result;
  } catch (error) {
    logCrmServiceEvent(context, `crm.provider.${provider}.operation.failed`, {
      connectionId,
      durationMs: Date.now() - startedAt,
      errorCode:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "request_failed",
      operation,
      provider,
    });
    throw error;
  }
}
