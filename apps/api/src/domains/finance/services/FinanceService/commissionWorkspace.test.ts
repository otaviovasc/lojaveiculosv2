import { describe, expect, it, vi } from "vitest";
import { getCommissionWorkspace } from "./getCommissionWorkspace.js";
import { settleCommissionEntries } from "./settleCommissionEntries.js";
import { hasUnsafeCommissionSettlementSaleLink } from "../../commissionSettlementPolicy.js";
import type { FinanceServicePorts } from "./serviceSupport.js";
import {
  bundle,
  commissionRepository,
  context,
  period,
  sale,
  settlementEntry,
} from "../../testSupportCommissionWorkspace.js";

describe("commission workspace", () => {
  it("blocks commission settlement for unsafe linked sale state", () => {
    const links = [{ entryId: "entry_1", targetId: "sale_1" }];
    const validSale = {
      deletedAt: null,
      id: "sale_1",
      isCurrentRevision: true,
      isDeleted: false,
      sellerUserId: "seller_a",
      status: "closed" as const,
    };

    expect(
      hasUnsafeCommissionSettlementSaleLink(
        links,
        [validSale],
        [settlementEntry("seller_a")],
      ),
    ).toBe(false);
    expect(
      hasUnsafeCommissionSettlementSaleLink(
        links,
        [{ ...validSale, status: "cancelled" as const }],
        [settlementEntry("seller_a")],
      ),
    ).toBe(true);
    expect(
      hasUnsafeCommissionSettlementSaleLink(
        links,
        [validSale],
        [settlementEntry("seller_b")],
      ),
    ).toBe(true);
    expect(
      hasUnsafeCommissionSettlementSaleLink(
        links,
        [validSale],
        [settlementEntry("seller_b", "sale.extra_commission")],
      ),
    ).toBe(false);
  });

  it("starts from closed sales and reports reconciliation gaps", async () => {
    const repository = commissionRepository({
      entries: [
        bundle("entry_mismatch", "seller_b", "sale_1"),
        bundle("entry_orphan", "seller_a", "sale_missing"),
      ],
      sales: [
        sale("sale_1", "seller_a", 9_000_000),
        sale("sale_without_commission", "seller_b", 7_500_000),
      ],
      sellerNames: { seller_a: "Seller A", seller_b: "Seller B" },
    });

    const workspace = await getCommissionWorkspace(
      context(["finance.read"]),
      period(),
      { commissionWorkspaceRepository: repository } as FinanceServicePorts,
    );

    expect(workspace.sales).toHaveLength(2);
    expect(workspace.sales.map((item) => item.id)).toEqual([
      "sale_1",
      "sale_without_commission",
    ]);
    expect(workspace.adjustments.map((item) => item.id)).toEqual([
      "entry_orphan",
    ]);
    expect(workspace.reconciliation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "seller_mismatch",
          entryId: "entry_mismatch",
          saleId: "sale_1",
        }),
        expect.objectContaining({
          code: "missing_commission",
          saleId: "sale_without_commission",
        }),
        expect.objectContaining({
          code: "missing_sale",
          entryId: "entry_orphan",
        }),
      ]),
    );
  });

  it("does not treat extra recipients as the sale standard commission", async () => {
    const extra = bundle("entry_extra", "manager_a", "sale_1");
    extra.entry.metadata = {
      automaticFinanceEntry: { family: "sale.extra_commission" },
    };
    const disabledSale = {
      ...sale("sale_disabled", "seller_b", 7_500_000),
      standardCommissionEnabled: false,
    };
    const repository = commissionRepository({
      entries: [extra],
      sales: [sale("sale_1", "seller_a", 9_000_000), disabledSale],
      sellerNames: {},
    });

    const workspace = await getCommissionWorkspace(
      context(["finance.read"]),
      period(),
      { commissionWorkspaceRepository: repository } as FinanceServicePorts,
    );

    expect(workspace.reconciliation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_commission",
          saleId: "sale_1",
        }),
      ]),
    );
    expect(workspace.reconciliation).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_commission",
          saleId: "sale_disabled",
        }),
      ]),
    );
  });

  it("settles the selected seller entries through one repository call", async () => {
    const repository = commissionRepository({
      entries: [],
      sales: [],
      sellerNames: {},
    });
    vi.mocked(repository.settleEntries).mockResolvedValue({
      changed: true,
      entries: [
        bundle("entry_1", "seller_a", "sale_1").entry,
        bundle("entry_2", "seller_a", "sale_2").entry,
      ],
    });

    const result = await settleCommissionEntries(
      context(["finance.update"]),
      {
        entryIds: ["entry_1", "entry_2"],
        paidAt: new Date("2026-07-14T12:00:00.000Z"),
        sellerUserId: "seller_a",
      },
      { commissionWorkspaceRepository: repository } as FinanceServicePorts,
    );

    expect(repository.settleEntries).toHaveBeenCalledOnce();
    expect(repository.settleEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        entryIds: ["entry_1", "entry_2"],
        sellerUserId: "seller_a",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(result).toMatchObject({
      totalCents: 20000,
      updatedCount: 2,
    });
  });

  it("reports an idempotent replay without claiming another update", async () => {
    const repository = commissionRepository({
      entries: [],
      sales: [],
      sellerNames: {},
    });
    const paidAt = new Date("2026-07-14T12:00:00.000Z");
    vi.mocked(repository.settleEntries).mockResolvedValue({
      changed: false,
      entries: [
        {
          ...bundle("entry_1", "seller_a", "sale_1").entry,
          paidAt,
          status: "paid",
        },
      ],
    });

    const result = await settleCommissionEntries(
      context(["finance.update"]),
      {
        entryIds: ["entry_1"],
        paidAt,
        sellerUserId: "seller_a",
      },
      { commissionWorkspaceRepository: repository } as FinanceServicePorts,
    );

    expect(result).toMatchObject({
      totalCents: 10000,
      updatedCount: 0,
    });
  });
});
