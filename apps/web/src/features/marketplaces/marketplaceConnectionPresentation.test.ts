import { describe, expect, it } from "vitest";
import { resolveMarketplaceConnectionPresentation } from "./marketplaceConnectionPresentation";

describe("marketplace connection presentation", () => {
  it("offers only activation for a paused connected account", () => {
    expect(
      resolveMarketplaceConnectionPresentation(
        {
          accountId: "account_1",
          connectionStatus: "paused",
          lastSyncSummary: null,
          provider: "mercado_livre",
          requirements: [],
        },
        undefined,
      ),
    ).toMatchObject({
      canSync: false,
      connectLabel: null,
      statusAction: { label: "Ativar", status: "active" },
      tone: "warning",
    });
  });

  it("offers only activation for an inactive account fallback", () => {
    expect(
      resolveMarketplaceConnectionPresentation(undefined, {
        config: {},
        createdAt: "2026-07-11T12:00:00.000Z",
        id: "account_1",
        provider: "mercado_livre",
        status: "inactive",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-07-11T12:00:00.000Z",
      }),
    ).toMatchObject({
      canSync: false,
      connectLabel: null,
      statusAction: { label: "Ativar", status: "active" },
      tone: "warning",
    });
  });
});
