import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "./apiClient";
import {
  hasActiveAgencyMembership,
  resolveSessionDestination,
} from "./sessionRedirect";

const baseBootstrap: SessionBootstrap = {
  defaultStore: null,
  needsOnboarding: false,
  platformAdmin: false,
  stores: [],
  tenantMemberships: [],
  user: {
    clerkUserId: "user_123",
    email: "owner@example.com",
    id: "user-id",
    name: "Owner",
  },
};

describe("resolveSessionDestination", () => {
  it("sends first-time users to owner onboarding", () => {
    expect(
      resolveSessionDestination({
        ...baseBootstrap,
        needsOnboarding: true,
      }),
    ).toBe("/onboarding");
  });

  it("sends platform admins to the internal admin area", () => {
    expect(
      resolveSessionDestination({
        ...baseBootstrap,
        platformAdmin: true,
      }),
    ).toBe("/platform/admin");
  });

  it("sends store users to the store app", () => {
    expect(
      resolveSessionDestination({
        ...baseBootstrap,
        defaultStore: {
          role: "owner",
          status: "active",
          storeId: "store-id",
          storeName: "Auto Prime",
          storeSlug: "auto-prime",
          tenantId: "tenant-id",
          tenantName: "Auto Prime",
        },
      }),
    ).toBe("/dashboard");
  });

  it("sends agency-only users to the agency console", () => {
    expect(
      resolveSessionDestination({
        ...baseBootstrap,
        tenantMemberships: [
          {
            role: "agency",
            status: "active",
            tenantId: "tenant-id",
            tenantName: "Agency",
            tenantSlug: "agency",
          },
        ],
      }),
    ).toBe("/agency/admin");
  });

  it("does not treat owner tenant memberships as agency access", () => {
    const bootstrap = {
      ...baseBootstrap,
      tenantMemberships: [
        {
          role: "owner",
          status: "active" as const,
          tenantId: "tenant-id",
          tenantName: "Owner Tenant",
          tenantSlug: "owner-tenant",
        },
      ],
    };

    expect(hasActiveAgencyMembership(bootstrap)).toBe(false);
    expect(resolveSessionDestination(bootstrap)).toBe("/onboarding");
  });
});
