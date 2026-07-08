import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";

export type DrizzleAccountProvisioningClient = PostgresJsDatabase<
  typeof schema
>;

export {
  claimInvitations,
  findInvitationById,
} from "./drizzleAccountProvisioningInvitationReads.js";
export {
  canCreateOwnerStore,
  findActiveStoreRole,
} from "./drizzleAccountProvisioningAccessReads.js";
export {
  ensureUser,
  hasActivePlatformAdmin,
  hasActiveTenantRole,
  hasStorePermission,
  listTenantMemberships,
} from "./drizzleAccountProvisioningReads.js";
export { listStores } from "./drizzleAccountProvisioningStoreReads.js";
export {
  assertSlugsAvailable,
  assertStoreSlugAvailable,
  assertTenantSlugAvailable,
  findRoleTemplateId,
  insertInvitation,
  insertStoreDefaults,
  insertStoreMembership,
  insertTenantMembership,
  toProvisionedStore,
} from "./drizzleAccountProvisioningWrites.js";
export {
  markInvitationSendFailed,
  markInvitationSent,
} from "./drizzleAccountProvisioningInvitationTransitions.js";
