import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  FinancingProviderStore,
  FinancingStoreMapping,
} from "../../ports/financingRepository.js";
import type { MapFinancingStoreInput } from "./types.js";
import {
  financingConnectionManagePermission,
  FinancingValidationError,
  getFinancingGateway,
  requireAgencyFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import {
  credereFinancingProvider as provider,
  toProviderStores,
} from "../../support/connectionSupport.js";

export async function discoverCredereProviderStores(
  context: ServiceContext,
  ports: FinancingServicePorts,
): Promise<FinancingProviderStore[]> {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  context.logger.info(
    "financing.provider_stores.discover.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
    }),
  );
  const gateway = getFinancingGateway(ports);
  const connection = await getUsableProviderConnection(
    {
      provider,
      tenantId: scope.tenantId,
    },
    ports,
  );
  const stores = toProviderStores(
    await gateway.listStores({ token: connection.token! }),
  );
  await context.audit.record({
    action: "financing.provider_stores.discover",
    actor: context.actor,
    category: "data_access",
    entityId: connection.id,
    entityType: "financing_connection",
    metadata: {
      permission: financingConnectionManagePermission,
      provider,
      providerStoreCount: stores.length,
    },
    outcome: "succeeded",
    provider: { name: provider },
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Discovered financing provider stores",
    tenantId: scope.tenantId,
  });
  return stores;
}

export async function mapCredereStore(
  context: ServiceContext,
  input: MapFinancingStoreInput,
  ports: FinancingServicePorts,
): Promise<FinancingStoreMapping> {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  const requestedStoreId = input.storeId as StoreId;
  context.logger.info(
    "financing.store_mapping.upsert.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
      storeId: requestedStoreId,
    }),
  );
  await assertTenantStore(requestedStoreId, scope.tenantId, ports);
  const gateway = getFinancingGateway(ports);
  const connection = await getUsableProviderConnection(
    {
      provider,
      tenantId: scope.tenantId,
    },
    ports,
  );
  const providerStore = toProviderStores(
    await gateway.listStores({ token: connection.token! }),
  ).find(
    (item) => item.id === input.providerStoreId && item.status === "active",
  );
  if (!providerStore) {
    throw new FinancingValidationError("Provider store is not available.");
  }
  const conflictingMapping = await ports.repository
    .listStoreMappings({ provider, tenantId: scope.tenantId })
    .then((mappings) =>
      mappings.find(
        (mapping) =>
          mapping.providerStoreId === providerStore.id &&
          mapping.storeId !== requestedStoreId,
      ),
    );
  if (conflictingMapping) {
    throw new FinancingValidationError(
      "Provider store is already mapped to another local store.",
    );
  }
  const mapping = await ports.repository.upsertStoreMapping({
    provider,
    providerStoreId: providerStore.id,
    providerStoreName: providerStore.name,
    storeId: requestedStoreId,
    tenantId: scope.tenantId,
  });
  await recordMappingAudit(
    context,
    requestedStoreId,
    providerStore.id,
    mapping,
  );
  return mapping;
}

export async function unmapCredereStore(
  context: ServiceContext,
  input: { storeId: string },
  ports: FinancingServicePorts,
): Promise<boolean> {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  const storeId = input.storeId as StoreId;
  context.logger.info(
    "financing.store_mapping.delete.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
      storeId,
    }),
  );
  await assertTenantStore(storeId, scope.tenantId, ports);
  const deleted = await ports.repository.deleteStoreMapping({
    provider,
    storeId,
    tenantId: scope.tenantId,
  });
  await context.audit.record({
    action: "financing.store_mapping.delete",
    actor: context.actor,
    category: "data_change",
    entityId: storeId,
    entityType: "financing_store_mapping",
    metadata: { permission: financingConnectionManagePermission, provider },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId,
    summary: "Unmapped local store from financing provider store",
    tenantId: scope.tenantId,
  });
  return deleted;
}

async function assertTenantStore(
  storeId: StoreId,
  tenantId: TenantId,
  ports: FinancingServicePorts,
): Promise<void> {
  const tenantStore = await ports.repository.findTenantStore({
    storeId,
    tenantId,
  });
  if (!tenantStore) {
    throw new FinancingValidationError(
      "Store does not belong to financing tenant.",
    );
  }
}

async function recordMappingAudit(
  context: ServiceContext,
  storeId: StoreId,
  providerStoreId: string,
  mapping: FinancingStoreMapping,
): Promise<void> {
  await context.audit.record({
    action: "financing.store_mapping.upsert",
    actor: context.actor,
    category: "data_change",
    entityId: mapping.id,
    entityType: "financing_store_mapping",
    metadata: {
      localStoreId: storeId,
      permission: financingConnectionManagePermission,
      provider,
      providerStoreId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId,
    summary: "Mapped local store to financing provider store",
    tenantId: mapping.tenantId,
  });
}
