export type SettingsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type StoreSettingsSnapshot = {
  identity: {
    legalName: string | null;
    primaryDomain: string | null;
    publicSlug: string;
    tradingName: string;
  };
  profile: {
    addressCity: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressState: string | null;
    addressZipCode: string | null;
    businessHours: Record<string, unknown>;
    contactEmail: string | null;
    contactPhone: string | null;
    documentNumber: string | null;
    logoImageUrl: string | null;
    whatsappPhone: string | null;
  };
  publicSite: {
    customDomain: string | null;
    customDomainStatus: "failed" | "not_configured" | "pending" | "verified";
    heroImageUrl: string | null;
    isPublished: boolean;
    layoutKey: string;
    seoDescription: string | null;
    seoTitle: string | null;
    theme: Record<string, unknown>;
    verificationToken: string | null;
  };
  storeId: string;
  tenantId: string;
};

export type UpdateStoreSettingsInput = {
  identity?: Partial<StoreSettingsSnapshot["identity"]>;
  profile?: Partial<StoreSettingsSnapshot["profile"]>;
  publicSite?: Partial<StoreSettingsSnapshot["publicSite"]>;
};

export type RoleKey = "agency" | "owner" | "salesman" | "supervisor";

export type PermissionDescriptor = {
  description: string;
  key: string;
  label: string;
  risk: "high" | "low" | "medium";
};

export type PermissionGroup = {
  key: string;
  label: string;
  permissions: readonly PermissionDescriptor[];
};

export type RoleTemplateView = {
  defaultPermissions: readonly string[];
  label: string;
  role: RoleKey;
};

export type RoleMemberView = {
  basePermissions: readonly string[];
  effectivePermissions: readonly string[];
  manageable: boolean;
  membershipId: string;
  overrides: readonly {
    allowed: boolean;
    permission: string;
    reason: string | null;
  }[];
  role: RoleKey;
  status: "active" | "invited" | "suspended";
  user: {
    email: string;
    id: string;
    name: string | null;
  };
};

export type RoleManagementView = {
  actor: {
    canManageRoles: boolean;
    membershipId: string | null;
    role: RoleKey | null;
  };
  memberships: readonly RoleMemberView[];
  permissionGroups: readonly PermissionGroup[];
  roles: readonly RoleTemplateView[];
};

export type UpdateMembershipAccessInput = {
  overrides: readonly {
    allowed: boolean;
    permission: string;
    reason?: string | null;
  }[];
  role: RoleKey;
};
