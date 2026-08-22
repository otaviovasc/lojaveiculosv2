import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { listAgencyTeamAccessStores } from "./listAgencyTeamAccessStores.js";
import { AgencyTeamAccessScopeError } from "./serviceSupport.js";

const tenantId = "tenant_1" as TenantId;
const userId = "user_agency" as UserId;

describe("listAgencyTeamAccessStores", () => {
  it("returns only stores exposed by the agency-scoped directory and audits the read", async () => {
    const listStores = vi.fn(async () => [
      {
        storeId: "store_1" as StoreId,
        storeName: "Loja Centro",
        storeSlug: "loja-centro",
      },
    ]);
    const context = createServiceContext({
      actor: { id: userId, kind: "user" },
      permissions: ["users.manage"],
      request: { requestId: "req_team_access" },
      tenantId,
    });
    const audit = vi.spyOn(context.audit, "record");

    const result = await listAgencyTeamAccessStores(context, {
      storeDirectory: { listStores },
    });

    expect(listStores).toHaveBeenCalledWith({ tenantId, userId });
    expect(result.stores).toHaveLength(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "agency.team_access.stores.list",
        storeId: null,
        tenantId,
      }),
    );
  });

  it("requires the explicit users.manage permission", async () => {
    const context = createServiceContext({
      actor: { id: userId, kind: "user" },
      request: { requestId: "req_team_access" },
      tenantId,
    });

    await expect(
      listAgencyTeamAccessStores(context, {
        storeDirectory: { listStores: vi.fn() },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects store-scoped contexts at the cross-store boundary", async () => {
    const context = createServiceContext({
      actor: { id: userId, kind: "user" },
      permissions: ["users.manage"],
      request: { requestId: "req_team_access" },
      storeId: "store_1",
      tenantId,
    });

    await expect(
      listAgencyTeamAccessStores(context, {
        storeDirectory: { listStores: vi.fn() },
      }),
    ).rejects.toBeInstanceOf(AgencyTeamAccessScopeError);
  });
});
