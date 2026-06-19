import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type StoreIdentitySettings = {
  legalName: string | null;
  primaryDomain: string | null;
  publicSlug: string;
  tradingName: string;
};

export type StoreProfileSettings = {
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

export type StorePublicSiteSettings = {
  customDomain: string | null;
  customDomainStatus: "failed" | "not_configured" | "pending" | "verified";
  heroImageUrl: string | null;
  isPublished: boolean;
  lastDnsCheckAt: Date | null;
  layoutKey: string;
  seoDescription: string | null;
  seoTitle: string | null;
  theme: Record<string, unknown>;
  verificationToken: string | null;
  verifiedAt: Date | null;
};

export type StoreSettingsSnapshot = {
  identity: StoreIdentitySettings;
  profile: StoreProfileSettings;
  publicSite: StorePublicSiteSettings;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateStoreSettingsInput = {
  identity?: Partial<StoreIdentitySettings>;
  profile?: Partial<StoreProfileSettings>;
  publicSite?: Partial<StorePublicSiteSettings>;
  storeId: StoreId;
  tenantId: TenantId;
};

export type StoreSettingsRepository = {
  findByStore: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<StoreSettingsSnapshot | null>;
  update: (input: UpdateStoreSettingsInput) => Promise<StoreSettingsSnapshot>;
};
