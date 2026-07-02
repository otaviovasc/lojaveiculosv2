import type {
  EntitlementKey,
  PermissionKey,
  RoleKey,
  StoreId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";

export type ClerkUserProfile = {
  clerkUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export type IdentityUserSummary = {
  clerkUserId: string;
  email: string;
  id: UserId;
  name: string | null;
};

export type StoreAccessSummary = {
  effectivePermissions: readonly PermissionKey[];
  entitlements: readonly EntitlementKey[];
  role: RoleKey;
  status: "active" | "invited" | "suspended";
  storeId: StoreId;
  storeName: string;
  storeSlug: string;
  tenantId: TenantId;
  tenantName: string;
};

export type TenantAccessSummary = {
  role: RoleKey;
  status: "active" | "invited" | "suspended";
  tenantId: TenantId;
  tenantName: string;
  tenantSlug: string;
};

export type SessionBootstrapRecord = {
  acceptedInvitations: readonly IdentityInvitationRecord[];
  defaultStore: StoreAccessSummary | null;
  needsOnboarding: boolean;
  platformAdmin: boolean;
  stores: readonly StoreAccessSummary[];
  tenantMemberships: readonly TenantAccessSummary[];
  user: IdentityUserSummary;
};

export type StoreProfileDraft = {
  contactEmail?: string | null;
  contactPhone?: string | null;
  documentNumber?: string | null;
  whatsappPhone?: string | null;
};

export type ProvisionedStoreRecord = {
  role: RoleKey;
  storeId: StoreId;
  storeName: string;
  storeSlug: string;
  tenantId: TenantId;
  tenantName: string;
};

export type ProvisionedAgencyRecord = {
  invitationId: string | null;
  invitationStatus: IdentityInvitationRecord["status"] | null;
  tenantId: TenantId;
  tenantName: string;
  tenantSlug: string;
};

export type IdentityInvitationRecord = {
  email: string;
  id: string;
  role: RoleKey;
  status:
    "accepted" | "expired" | "pending" | "revoked" | "send_failed" | "sent";
  storeId: StoreId | null;
  tenantId: TenantId;
};

export type IdentityInvitationTransitionStatus =
  IdentityInvitationRecord["status"];

export type CreateOwnerStoreRecordInput = {
  entitlements: readonly EntitlementKey[];
  profile?: StoreProfileDraft;
  publicSlug: string;
  storeLegalName?: string | null;
  storeTradingName: string;
  tenantLegalName?: string | null;
  tenantSlug: string;
  tenantTradingName: string;
  user: ClerkUserProfile;
};

export type CreateAgencyRecordInput = {
  firstUser?: {
    email: string;
    name?: string | null;
  };
  invitedByUserId: UserId;
  tenantLegalName?: string | null;
  tenantSlug: string;
  tenantTradingName: string;
};

export type CreateAgencyStoreRecordInput = {
  actorUserId: UserId;
  entitlements: readonly EntitlementKey[];
  profile?: StoreProfileDraft;
  publicSlug: string;
  storeLegalName?: string | null;
  storeTradingName: string;
  tenantId: TenantId;
};

export type CreateStoreInvitationRecordInput = {
  email: string;
  invitedByUserId: UserId;
  name?: string | null;
  role: Exclude<RoleKey, "admin" | "agency">;
  storeId: StoreId;
  tenantId: TenantId;
};

export type AccountProvisioningRepository = {
  createAgency: (
    input: CreateAgencyRecordInput,
  ) => Promise<ProvisionedAgencyRecord>;
  createAgencyStore: (
    input: CreateAgencyStoreRecordInput,
  ) => Promise<ProvisionedStoreRecord>;
  createOwnerStore: (
    input: CreateOwnerStoreRecordInput,
  ) => Promise<ProvisionedStoreRecord>;
  createStoreInvitation: (
    input: CreateStoreInvitationRecordInput,
  ) => Promise<IdentityInvitationRecord>;
  ensureUser: (profile: ClerkUserProfile) => Promise<IdentityUserSummary>;
  findInvitationById: (
    invitationId: string,
  ) => Promise<IdentityInvitationRecord | null>;
  findSessionBootstrap: (
    profile: ClerkUserProfile,
  ) => Promise<SessionBootstrapRecord>;
  findActiveStoreRole: (input: {
    storeId: StoreId;
    userId: UserId;
  }) => Promise<RoleKey | null>;
  canCreateOwnerStore: (userId: UserId) => Promise<boolean>;
  hasActivePlatformAdmin: (userId: UserId) => Promise<boolean>;
  hasStorePermission: (input: {
    permission: "users.manage";
    storeId: StoreId;
    userId: UserId;
  }) => Promise<boolean>;
  hasActiveTenantRole: (input: {
    role: RoleKey;
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<boolean>;
  markInvitationSent: (input: {
    allowedStatuses?: readonly IdentityInvitationTransitionStatus[];
    clerkInvitationId?: string | null;
    invitationId: string;
  }) => Promise<boolean>;
  markInvitationSendFailed: (input: {
    invitationId: string;
  }) => Promise<boolean>;
};

export type InvitationSender = {
  send: (input: {
    email: string;
    invitationId: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ clerkInvitationId?: string | null }>;
};

export class AccountProvisioningConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountProvisioningConflictError";
  }
}
