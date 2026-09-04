import { describe, expect, it, vi } from "vitest";
import { createAgencyTeamAccessApi } from "./teamAccessApiClient";

describe("createAgencyTeamAccessApi", () => {
  it("uses explicit tenant, store, membership, and invitation route scopes", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    ) as typeof fetch;
    const api = createAgencyTeamAccessApi({ fetch: fetchMock });

    await api.getDirectory("tenant 1");
    await api.getStoreAccess("tenant 1", "store 1");
    await api.updateMembershipAccess("tenant 1", "store 1", "member 1", {
      overrides: [],
      role: "supervisor",
    });
    await api.resendInvitation("tenant 1", "store 1", "invitation 1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/agency/tenants/tenant%201/team-access",
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/agency/tenants/tenant%201/stores/store%201/team-access",
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/agency/tenants/tenant%201/stores/store%201/team-access/memberships/member%201",
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/agency/tenants/tenant%201/stores/store%201/team-access/invitations/invitation%201/resend",
      expect.anything(),
    );
  });

  it("sends role-scoped invitations without credential fields", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "invitation_1" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
    ) as typeof fetch;
    const api = createAgencyTeamAccessApi({ fetch: fetchMock });

    await api.inviteStoreMember("tenant_1", "store_1", {
      email: "seller@example.com",
      name: "Seller",
      role: "salesman",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/stores/store_1/team-access/invitations",
      expect.objectContaining({
        body: JSON.stringify({
          email: "seller@example.com",
          name: "Seller",
          role: "salesman",
        }),
        method: "POST",
      }),
    );
  });
});
