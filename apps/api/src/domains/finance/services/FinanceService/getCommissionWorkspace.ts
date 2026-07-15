import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CommissionWorkspaceSaleRecord,
  CommissionWorkspaceSource,
} from "../../ports/commissionWorkspaceRepository.js";
import type {
  FinanceEntry,
  FinanceEntryLink,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getCommissionWorkspaceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";
import { isStandardSaleCommission } from "../../commissionSettlementPolicy.js";
import { assertCommissionWorkspaceRange } from "../../commissionWorkspaceValidation.js";

const permission = "finance.read";

export type GetCommissionWorkspaceInput = {
  from: Date;
  to: Date;
};

export type CommissionWorkspaceEntry = FinanceEntry & {
  links: readonly FinanceEntryLink[];
};

export type CommissionWorkspaceSale = CommissionWorkspaceSaleRecord & {
  entries: readonly CommissionWorkspaceEntry[];
};

export type CommissionReconciliationIssue = {
  code:
    | "cancelled_sale"
    | "missing_commission"
    | "missing_sale"
    | "missing_vehicle"
    | "reverted_sale"
    | "seller_mismatch";
  entryId: string | null;
  saleId: string | null;
  severity: "critical" | "warning";
};

export type CommissionWorkspace = {
  adjustments: readonly CommissionWorkspaceEntry[];
  generatedAt: Date;
  reconciliation: readonly CommissionReconciliationIssue[];
  sales: readonly CommissionWorkspaceSale[];
  sellerNames: Readonly<Record<string, string>>;
};

export async function getCommissionWorkspace(
  context: ServiceContext,
  input: GetCommissionWorkspaceInput,
  ports?: FinanceServicePorts,
): Promise<CommissionWorkspace> {
  assertPermission(context, permission);
  assertCommissionWorkspaceRange(input);
  const scope = requireFinanceScope(context);
  const source = await getCommissionWorkspaceRepository(ports).read({
    ...input,
    ...scope,
  });
  const workspace = buildWorkspace(source, input);

  logFinanceServiceEvent(context, "commission_workspace.read", {
    adjustmentCount: workspace.adjustments.length,
    reconciliationCount: workspace.reconciliation.length,
    saleCount: workspace.sales.length,
  });
  await auditFinanceServiceEvent(context, {
    action: "commission_workspace.read",
    category: "data_access",
    entityId: `commission_workspace:${scope.storeId}`,
    metadata: {
      adjustmentCount: workspace.adjustments.length,
      from: input.from.toISOString(),
      reconciliationCount: workspace.reconciliation.length,
      saleCount: workspace.sales.length,
      to: input.to.toISOString(),
    },
    permission,
    summary: "Read sale-first commission workspace",
  });
  return workspace;
}

function buildWorkspace(
  source: CommissionWorkspaceSource,
  range: GetCommissionWorkspaceInput,
): CommissionWorkspace {
  const entries = source.entries.map(({ entry, links }) => ({
    ...entry,
    links,
  }));
  const salesById = new Map(source.sales.map((sale) => [sale.id, sale]));
  const linkedEntries = new Map<string, CommissionWorkspaceEntry[]>();
  for (const entry of entries) {
    const saleId = entrySaleId(entry);
    if (saleId) {
      linkedEntries.set(saleId, [...(linkedEntries.get(saleId) ?? []), entry]);
    }
  }
  const periodSales = source.sales.filter((sale) => saleInRange(sale, range));
  const reconciliationSales = source.sales.filter(
    (sale) =>
      saleInRange(sale, range) ||
      (linkedEntries.get(sale.id) ?? []).some((entry) =>
        entryInRange(entry, range),
      ),
  );
  const sales = periodSales
    .filter((sale) => sale.status === "closed" && sale.isCurrentRevision)
    .map((sale) => ({ ...sale, entries: linkedEntries.get(sale.id) ?? [] }));
  const reconciliation = buildReconciliation(
    entries,
    reconciliationSales,
    salesById,
    linkedEntries,
    range,
  );
  const displayedSaleIds = new Set(sales.map((sale) => sale.id));
  const adjustments = entries.filter((entry) => {
    const saleId = entrySaleId(entry);
    return (
      entryInRange(entry, range) && (!saleId || !displayedSaleIds.has(saleId))
    );
  });
  return {
    adjustments,
    generatedAt: new Date(),
    reconciliation,
    sales,
    sellerNames: source.sellerNames,
  };
}

function buildReconciliation(
  entries: readonly CommissionWorkspaceEntry[],
  reconciliationSales: readonly CommissionWorkspaceSaleRecord[],
  salesById: ReadonlyMap<string, CommissionWorkspaceSaleRecord>,
  linkedEntries: ReadonlyMap<string, CommissionWorkspaceEntry[]>,
  range: GetCommissionWorkspaceInput,
): CommissionReconciliationIssue[] {
  const issues: CommissionReconciliationIssue[] = [];
  for (const sale of reconciliationSales) {
    const saleEntries = linkedEntries.get(sale.id) ?? [];
    if (
      sale.status === "closed" &&
      sale.isCurrentRevision &&
      sale.standardCommissionEnabled &&
      saleInRange(sale, range) &&
      !saleEntries.some(
        (entry) =>
          isActiveEntry(entry) && isStandardSaleCommission(entry.metadata),
      )
    ) {
      issues.push(issue("missing_commission", null, sale.id, "critical"));
    }
    if (sale.status === "cancelled" && saleEntries.some(isActiveEntry)) {
      issues.push(issue("cancelled_sale", null, sale.id, "critical"));
    }
    if (!sale.isCurrentRevision && saleEntries.some(isActiveEntry)) {
      issues.push(issue("reverted_sale", null, sale.id, "critical"));
    }
    for (const entry of saleEntries.filter(isActiveEntry)) {
      if (
        isStandardSaleCommission(entry.metadata) &&
        entry.sellerUserId !== sale.sellerUserId
      ) {
        issues.push(issue("seller_mismatch", entry.id, sale.id, "critical"));
      }
      if (
        !sale.unitId &&
        !Object.keys(sale.listingSnapshot).length &&
        !hasVehicleLink(entry)
      ) {
        issues.push(issue("missing_vehicle", entry.id, sale.id, "warning"));
      }
    }
  }
  for (const entry of entries) {
    const saleId = entrySaleId(entry);
    if (
      saleId &&
      isActiveEntry(entry) &&
      entryInRange(entry, range) &&
      !salesById.has(saleId)
    ) {
      issues.push(issue("missing_sale", entry.id, saleId, "critical"));
    }
  }
  return issues;
}

function issue(
  code: CommissionReconciliationIssue["code"],
  entryId: string | null,
  saleId: string | null,
  severity: CommissionReconciliationIssue["severity"],
) {
  return { code, entryId, saleId, severity };
}

function entrySaleId(entry: CommissionWorkspaceEntry) {
  return entry.links.find((link) => link.targetType === "sale")?.targetId;
}

function hasVehicleLink(entry: CommissionWorkspaceEntry) {
  return entry.links.some(
    (link) =>
      link.targetType === "vehicle_listing" ||
      link.targetType === "vehicle_unit",
  );
}

function isActiveEntry(entry: CommissionWorkspaceEntry) {
  return entry.status !== "cancelled";
}

function saleInRange(
  sale: CommissionWorkspaceSaleRecord,
  range: GetCommissionWorkspaceInput,
) {
  return Boolean(
    sale.closedAt && sale.closedAt >= range.from && sale.closedAt <= range.to,
  );
}

function entryInRange(
  entry: CommissionWorkspaceEntry,
  range: GetCommissionWorkspaceInput,
) {
  return entry.createdAt >= range.from && entry.createdAt <= range.to;
}
