import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { AgencyTeamAccessServices } from "./agencyTeamAccessServices.js";
import { createAgencyTeamAccessFeature } from "./agencyTeamAccess.controller.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";
const membershipId = "33333333-3333-4333-8333-333333333333";

describe("agency team access controller", () => {
  it("lists the agency store directory in tenant scope", async () => {
    const services = createServices();
    const response = await createTestApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/team-access`,
    );

    expect(response.status).toBe(200);
    expect(services.listStores).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: null, tenantId }),
      services,
    );
    expect(await response.json()).toMatchObject({
      stores: [{ storeId, storeName: "Loja Centro" }],
      tenantId,
    });
  });

  it("resolves a selected agency store before listing its roster", async () => {
    const services = createServices();
    const response = await createTestApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/team-access`,
    );

    expect(response.status).toBe(200);
    expect(services.roleServices.listRoleManagement).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipRole: "agency",
        storeId,
        tenantId,
      }),
      services.roleServices,
    );
  });

  it("does not expose a roster for a store outside the agency directory", async () => {
    const services = createServices({ stores: [] });
    const response = await createTestApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/team-access`,
    );

    expect(response.status).toBe(404);
    expect(services.roleServices.listRoleManagement).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      code: "AGENCY_TEAM_ACCESS_STORE_NOT_FOUND",
    });
  });

  it("invites with the selected store scope and never accepts credentials", async () => {
    const services = createServices();
    const response = await createTestApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/team-access/invitations`,
      {
        body: JSON.stringify({
          email: "vendedor@example.com",
          name: "Novo vendedor",
          role: "salesman",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.accountServices.inviteStoreMember).toHaveBeenCalledWith(
      expect.objectContaining({ membershipRole: "agency", storeId, tenantId }),
      {
        email: "vendedor@example.com",
        name: "Novo vendedor",
        role: "salesman",
      },
      services.accountServices,
    );
  });

  it("updates only the selected membership through the existing role service", async () => {
    const services = createServices();
    const response = await createTestApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/team-access/memberships/${membershipId}`,
      {
        body: JSON.stringify({ overrides: [], role: "supervisor" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.roleServices.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ membershipRole: "agency", storeId, tenantId }),
      { membershipId, overrides: [], role: "supervisor" },
      services.roleServices,
    );
  });
});

function createTestApp(services: AgencyTeamAccessServices) {
  const app = new Hono();
  app.route(
    "/api/v1/agency",
    createAgencyTeamAccessFeature({
      accountContextFactory: async (_context, scope) => ({
        profile: {
          clerkUserId: "clerk_agency",
          email: "agency@example.com",
          emailVerified: true,
          name: "Agência",
        },
        serviceContext: createServiceContext({
          actor: { id: "user_agency", kind: "user" },
          permissions: ["identity.session.bootstrap", "users.manage"],
          request: { requestId: "req_team_access" },
          tenantId: scope.tenantId,
        }),
      }),
      services,
    }),
  );
  return app;
}

function createServices(input: { stores?: readonly unknown[] } = {}) {
  const stores = input.stores ?? [
    {
      storeId,
      storeName: "Loja Centro",
      storeSlug: "loja-centro",
    },
  ];
  const roleView = { memberships: [], pendingInvitations: [], roles: [] };
  const accountServices = {
    inviteStoreMember: vi.fn(async () => ({
      acceptUrl: "https://example.test/invitation",
      email: "vendedor@example.com",
      id: "44444444-4444-4444-8444-444444444444",
      role: "salesman",
      status: "sent",
      storeId,
      tenantId,
    })),
    resendInvitation: vi.fn(),
  };
  const roleServices = {
    listRoleManagement: vi.fn(async () => roleView),
    updateMembershipAccess: vi.fn(async () => roleView),
  };
  return {
    accountServices,
    listStores: vi.fn(async () => ({ stores, tenantId })),
    roleServices,
    storeDirectory: { listStores: vi.fn() },
  } as unknown as AgencyTeamAccessServices;
}
