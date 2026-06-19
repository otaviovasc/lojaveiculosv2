import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  StoreSettingsSnapshot,
  UpdateStoreSettingsInput,
} from "../../ports/storeSettingsRepository.js";
import {
  requireStoreSettingsScope,
  StoreSettingsNotFoundError,
  type StoreSettingsServicePorts,
} from "./serviceSupport.js";
import {
  normalizeCustomDomain,
  normalizePublicSlug,
} from "../../validation/settingsValidation.js";

export type UpdateStoreSettingsServiceInput = Omit<
  UpdateStoreSettingsInput,
  "storeId" | "tenantId"
>;

export async function updateStoreSettings(
  context: ServiceContext,
  input: UpdateStoreSettingsServiceInput,
  ports: StoreSettingsServicePorts,
): Promise<StoreSettingsSnapshot> {
  assertRequiredAccess(context, input);
  const scope = requireStoreSettingsScope(context);
  const repository = ports.storeSettingsRepository;
  const before = await repository.findByStore({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (!before) throw new StoreSettingsNotFoundError(scope.storeId);

  const update = normalizeUpdate(input, before);
  const changes = createChanges(before, update);

  context.logger.info(
    "store_settings.update.started",
    createServiceLogMetadata(context, {
      changedFields: changes.map((change) => change.path),
    }),
  );

  const after = await repository.update({
    ...update,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "store_settings.update",
    actor: context.actor,
    category: "data_change",
    changes,
    criticality: touchesPublicSite(input) ? "high" : "medium",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { changedFields: changes.map((change) => change.path) },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated store settings",
  });

  return after;
}

function assertRequiredAccess(
  context: ServiceContext,
  input: UpdateStoreSettingsServiceInput,
) {
  if (input.identity || input.profile) {
    assertPermission(context, "store_profile.manage");
  }

  if (touchesPublicSite(input)) {
    assertPermission(context, "store_public_site.manage");
  }

  if (input.identity?.publicSlug || input.publicSite?.isPublished === true) {
    assertEntitlement(context as StoreScopedServiceContext, "subdomain");
  }

  if (input.publicSite?.customDomain) {
    assertEntitlement(context as StoreScopedServiceContext, "custom_domain");
  }
}

function normalizeUpdate(
  input: UpdateStoreSettingsServiceInput,
  before: StoreSettingsSnapshot,
): UpdateStoreSettingsServiceInput {
  const customDomain = input.publicSite?.customDomain;
  const normalizedCustomDomain =
    customDomain === undefined
      ? undefined
      : normalizeCustomDomain(customDomain);
  const publicSlug = input.identity?.publicSlug;
  const normalizedPublicSlug =
    publicSlug === undefined ? undefined : normalizePublicSlug(publicSlug);
  const customDomainChanged =
    normalizedCustomDomain !== undefined &&
    normalizedCustomDomain !== before.publicSite.customDomain;

  return {
    ...(input.identity
      ? {
          identity: {
            ...input.identity,
            ...(normalizedPublicSlug
              ? { publicSlug: normalizedPublicSlug }
              : {}),
          },
        }
      : {}),
    ...(input.profile ? { profile: input.profile } : {}),
    ...(input.publicSite
      ? {
          publicSite: {
            ...input.publicSite,
            ...(normalizedCustomDomain !== undefined
              ? { customDomain: normalizedCustomDomain }
              : {}),
            ...(customDomainChanged
              ? {
                  customDomainStatus: normalizedCustomDomain
                    ? "pending"
                    : "not_configured",
                  lastDnsCheckAt: null,
                  verificationToken: normalizedCustomDomain
                    ? crypto.randomUUID()
                    : null,
                  verifiedAt: null,
                }
              : {}),
          },
        }
      : {}),
  };
}

function touchesPublicSite(input: UpdateStoreSettingsServiceInput) {
  return Boolean(input.publicSite || input.identity?.publicSlug);
}

function createChanges(
  before: StoreSettingsSnapshot,
  update: UpdateStoreSettingsServiceInput,
): AuditFieldChange[] {
  return [
    ...changesFor("identity", before.identity, update.identity),
    ...changesFor("profile", before.profile, update.profile),
    ...changesFor("publicSite", before.publicSite, update.publicSite),
  ];
}

function changesFor(
  prefix: string,
  before: Record<string, unknown>,
  after?: Record<string, unknown>,
): AuditFieldChange[] {
  return Object.entries(after ?? {})
    .filter(([, value]) => value !== undefined)
    .filter(
      ([key, value]) => JSON.stringify(before[key]) !== JSON.stringify(value),
    )
    .map(([key, value]) => ({
      after: toAuditValue(value),
      before: toAuditValue(before[key]),
      path: `${prefix}.${key}`,
    }));
}

function toAuditValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as string | number | boolean | null;
}
