import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreSettingsSnapshot } from "../../ports/storeSettingsRepository.js";
import {
  requireStoreSettingsScope,
  StoreSettingsNotFoundError,
  type StoreSettingsServicePorts,
} from "./serviceSupport.js";

const permissions = [
  "store_profile.manage",
  "store_public_site.manage",
] as const;

export async function getStoreSettings(
  context: ServiceContext,
  ports: StoreSettingsServicePorts,
): Promise<StoreSettingsSnapshot> {
  for (const permission of permissions) assertPermission(context, permission);
  const scope = requireStoreSettingsScope(context);

  context.logger.info(
    "store_settings.read.started",
    createServiceLogMetadata(context),
  );

  const settings = await ports.storeSettingsRepository.findByStore({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!settings) throw new StoreSettingsNotFoundError(scope.storeId);

  await context.audit.record({
    action: "store_settings.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { permissions: [...permissions] },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read store settings",
  });

  return settings;
}
