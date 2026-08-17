import type {
  MarketplaceStockPlan,
  MarketplaceStockPlanDecision,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";

export function summarizeMarketplaceStockPlan(
  items: readonly MarketplaceStockPlanItem[],
): MarketplaceStockPlan {
  const stockItems = items.filter((item) => item.origin === "stock");
  return {
    accounting: {
      excluded: countAccounting(stockItems, "excluded"),
      found: stockItems.length,
      needsCorrection: countAccounting(stockItems, "needs_correction"),
      processing: countAccounting(stockItems, "processing"),
      ready: countAccounting(stockItems, "ready"),
    },
    blocked: count(items, "blocked"),
    items: [...items],
    noOp: count(items, "no_op"),
    pending: count(items, "pending"),
    publish: count(items, "publish"),
    total: items.length,
    unpublish: count(items, "unpublish"),
    update: count(items, "update"),
  };
}

function countAccounting(
  items: readonly MarketplaceStockPlanItem[],
  status: MarketplaceStockPlanItem["accountingStatus"],
) {
  return items.filter((item) => item.accountingStatus === status).length;
}

function count(
  items: readonly MarketplaceStockPlanItem[],
  decision: MarketplaceStockPlanDecision,
) {
  return items.filter((item) => item.decision === decision).length;
}
