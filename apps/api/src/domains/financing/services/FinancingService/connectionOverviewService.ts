import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { FinancingConnectionOverview } from "./types.js";
import {
  assertActiveConnection,
  financingConnectionManagePermission,
  FinancingValidationError,
  getFinancingGateway,
  now,
  requireAgencyFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";
import {
  credereFinancingProvider as provider,
  redactFinancingConnection,
} from "../../support/connectionSupport.js";

export async function getFinancingConnectionOverview(
  context: ServiceContext,
  ports: FinancingServicePorts,
): Promise<FinancingConnectionOverview> {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  context.logger.info(
    "financing.connection.overview.read.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
    }),
  );
  const [connection, mappings] = await Promise.all([
    ports.repository.findConnection({ provider, tenantId: scope.tenantId }),
    ports.repository.listStoreMappings({ provider, tenantId: scope.tenantId }),
  ]);
  await context.audit.record({
    action: "financing.connection.overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.tenantId,
    entityType: "financing_connection",
    metadata: {
      mappedStoreCount: mappings.length,
      permission: financingConnectionManagePermission,
      provider,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Read financing connection overview",
    tenantId: scope.tenantId,
  });
  return {
    connected: connection?.status === "connected",
    connectedAt: connection?.connectedAt ?? null,
    mappedStoreCount: mappings.length,
    provider,
    providerAccountId: connection?.providerAccountId ?? null,
    status: connection?.status ?? "not_connected",
    storeMappings: mappings.map((mapping) => ({
      externalStoreAlias: mapping.providerStoreName,
      externalStoreId: mapping.providerStoreId,
      storeId: mapping.storeId,
    })),
  };
}

export async function disconnectFinancingProvider(
  context: ServiceContext,
  ports: FinancingServicePorts,
) {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  context.logger.info(
    "financing.connection.disconnect.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
    }),
  );
  const activeConnection = await ports.repository.findConnection({
    provider,
    tenantId: scope.tenantId,
  });
  const revokeResult = await revokeProviderToken(
    activeConnection?.token,
    ports,
  );
  const connection = await ports.repository.disconnectConnection({
    disconnectedAt: now(ports),
    provider,
    tenantId: scope.tenantId,
  });
  await context.audit.record({
    action: "financing.connection.disconnect",
    actor: context.actor,
    category: "authorization",
    entityId: connection?.id ?? scope.tenantId,
    entityType: "financing_connection",
    metadata: {
      permission: financingConnectionManagePermission,
      provider,
      providerRevokeStatus: revokeResult,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Disconnected financing provider",
    tenantId: scope.tenantId,
  });
  return connection ? redactFinancingConnection(connection) : null;
}

async function revokeProviderToken(
  token: { accessToken: string } | null | undefined,
  ports: FinancingServicePorts,
): Promise<"failed" | "not_attempted" | "succeeded"> {
  if (!token?.accessToken || !ports.gateway) return "not_attempted";
  try {
    await ports.gateway.revokeToken(token.accessToken);
    return "succeeded";
  } catch {
    return "failed";
  }
}

export async function refreshFinancingConnectionToken(
  context: ServiceContext,
  ports: FinancingServicePorts,
) {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  context.logger.info(
    "financing.connection.token.refresh.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
    }),
  );
  const gateway = getFinancingGateway(ports);
  const connection = assertActiveConnection(
    await ports.repository.findConnection({
      provider,
      tenantId: scope.tenantId,
    }),
    provider,
  );
  if (!connection.token?.refreshToken) {
    throw new FinancingValidationError("Financing refresh token is missing.");
  }
  const previousRefreshToken = connection.token.refreshToken;
  const token = await gateway.refreshToken(previousRefreshToken);
  const rotated = await ports.repository.rotateConnectionToken({
    connectionId: connection.id,
    previousRefreshToken,
    provider,
    providerAccountId: token.providerAccountId,
    status: "connected",
    tenantId: scope.tenantId,
    token,
  });
  const settled =
    rotated ??
    assertActiveConnection(
      await ports.repository.findConnection({
        provider,
        tenantId: scope.tenantId,
      }),
      provider,
    );
  if (
    !rotated &&
    settled.token?.accessToken === connection.token.accessToken &&
    settled.token?.refreshToken === previousRefreshToken
  ) {
    throw new FinancingValidationError(
      "Financing token refresh conflicted with another request.",
    );
  }
  await context.audit.record({
    action: "financing.connection.token.refresh",
    actor: context.actor,
    category: "authorization",
    entityId: settled.id,
    entityType: "financing_connection",
    metadata: {
      hasRefreshToken: Boolean(settled.token?.refreshToken),
      permission: financingConnectionManagePermission,
      provider,
      providerAccountId: settled.providerAccountId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Refreshed financing provider token",
    tenantId: scope.tenantId,
  });
  return redactFinancingConnection(settled);
}
