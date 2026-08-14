import type {
  MarketplaceStockPlan,
  MarketplaceStockPlanDecision,
  MarketplaceStockPlanItem,
} from "./marketplaceStockPlanTypes.js";

export function summarizeMarketplaceStockPlan(
  items: readonly MarketplaceStockPlanItem[],
): MarketplaceStockPlan {
  const relevantItems = items.filter((item) => item.decision !== "no_op");
  return {
    blocked: count(relevantItems, "blocked"),
    items: relevantItems,
    noOp: 0,
    pending: count(relevantItems, "pending"),
    publish: count(relevantItems, "publish"),
    total: relevantItems.length,
    unpublish: count(relevantItems, "unpublish"),
    update: count(relevantItems, "update"),
  };
}

function count(
  items: readonly MarketplaceStockPlanItem[],
  decision: MarketplaceStockPlanDecision,
) {
  return items.filter((item) => item.decision === decision).length;
}
