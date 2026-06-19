import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { getStoreSettings } from "./getStoreSettings.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("getStoreSettings", () => {
  it("requires both profile and public-site management permissions", async () => {
    await expect(
      getStoreSettings(
        createServiceContext({
          permissions: ["store_profile.manage"],
          request: { requestId: "req_1" },
          storeId,
          tenantId,
        }),
        { storeSettingsRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("reads settings and audits when both permissions are present", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const result = await getStoreSettings(
      createServiceContext({
        audit,
        permissions: ["store_profile.manage", "store_public_site.manage"],
        request: { requestId: "req_1" },
        storeId,
        tenantId,
      }),
      { storeSettingsRepository: createRepository() },
    );

    expect(result.storeId).toBe(storeId);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "store_settings.read" }),
    );
  });
});

function createRepository() {
  return {
    findByStore: vi.fn(async () => ({
      identity: {
        legalName: null,
        primaryDomain: null,
        publicSlug: "demo",
        tradingName: "Loja Demo",
      },
      profile: {
        addressCity: null,
        addressLine1: null,
        addressLine2: null,
        addressState: null,
        addressZipCode: null,
        businessHours: {},
        contactEmail: null,
        contactPhone: null,
        documentNumber: null,
        logoImageUrl: null,
        whatsappPhone: null,
      },
      publicSite: {
        customDomain: null,
        customDomainStatus: "not_configured" as const,
        heroImageUrl: null,
        isPublished: false,
        lastDnsCheckAt: null,
        layoutKey: "default",
        seoDescription: null,
        seoTitle: null,
        theme: {},
        verificationToken: null,
        verifiedAt: null,
      },
      storeId,
      tenantId,
    })),
    update: vi.fn(),
  };
}
