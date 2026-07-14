import type { FinanceAutoEntryRepository } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import type { FinanceRepository } from "../../../domains/finance/ports/financeRepository.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import { materializeFinanceAutoEntries } from "../../../domains/finance/services/FinanceService/materializeFinanceAutoEntries.js";
import type { MaterializeFinanceAutoEntriesInput } from "../../../domains/finance/services/FinanceService/materializeFinanceAutoEntries.js";
import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";
import { requireSaleAccountingFacts } from "../../../domains/sales/saleAccountingFacts.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";

type SaleAutoEntryPorts = {
  crmRepository?: Pick<CrmRepository, "listActivities">;
  financeAutoEntryRepository: FinanceAutoEntryRepository;
  financeRepository: FinanceRepository;
};

export async function materializeSaleAutoEntryEvents(
  context: ServiceContext,
  events: readonly MaterializeFinanceAutoEntriesInput[],
  ports: SaleAutoEntryPorts,
): Promise<void> {
  for (const event of events) {
    const resolvedEvent = await resolveCrmInsuranceSource(
      context,
      event,
      ports,
    );
    await materializeFinanceAutoEntries(context, resolvedEvent, ports);
  }
}

export function buildSaleAutoEntryEvents(
  sale: SaleRecord,
): readonly MaterializeFinanceAutoEntriesInput[] {
  const facts = requireSaleAccountingFacts(sale);
  const occurredAt = sale.closedAt ?? sale.updatedAt;
  const common = {
    metadata: { origin: "sales_workflow" },
    occurredAt,
    leadId: sale.leadId,
    saleId: sale.id,
    sellerUserId: sale.sellerUserId,
    sourceId: sale.id,
    sourceRevision: sale.revision,
    unitId: sale.unitId,
  } as const;
  const standardCommission = facts.standardCommission;
  const events: MaterializeFinanceAutoEntriesInput[] = [
    {
      ...common,
      attributes: {
        standardCommissionEnabled: facts.standardCommissionEnabled,
      },
      basisCents: {
        sale: sale.salePriceCents,
        ...(standardCommission
          ? { commission: standardCommission.calculatedAmountCents }
          : {}),
      },
      event: "vehicle_sale_closed",
      metadata: {
        origin: "sales_workflow",
        ...(standardCommission ? { standardCommission } : {}),
      },
    },
  ];

  for (const financing of facts.financing) {
    events.push({
      ...common,
      attributes: { financingRank: financing.rank },
      basisCents: { financing: financing.amountCents },
      event: "financing_approved",
      metadata: {
        origin: "sales_workflow",
        paymentLineId: financing.paymentId,
      },
      sourceId: financing.paymentId,
    });
  }

  if (facts.documentation) {
    events.push({
      ...common,
      attributes: { transferHasLien: facts.documentation.hasLien },
      basisCents: { documentation: facts.documentation.amountCents },
      event: "transfer_documentation_charged",
    });
  }

  if (facts.insurance) {
    events.push({
      ...common,
      basisCents: {
        insurance_commission: facts.insurance.commissionAmountCents,
        premium: facts.insurance.premiumCents,
      },
      event: "insurance_issued",
      metadata: {
        appliedCommissionBasisPoints: Math.round(
          facts.insurance.appliedCommissionPercentage * 100,
        ),
        appliedCommissionPercentage:
          facts.insurance.appliedCommissionPercentage,
        ...(facts.insurance.financialProductId
          ? { financialProductId: facts.insurance.financialProductId }
          : {}),
        origin: "sales_workflow",
      },
    });
  }

  return events;
}

async function resolveCrmInsuranceSource(
  context: ServiceContext,
  event: MaterializeFinanceAutoEntriesInput,
  ports: SaleAutoEntryPorts,
): Promise<MaterializeFinanceAutoEntriesInput> {
  if (
    event.event !== "insurance_issued" ||
    !event.leadId ||
    !ports.crmRepository ||
    !context.storeId ||
    !context.tenantId
  ) {
    return event;
  }
  const activities = await ports.crmRepository.listActivities({
    leadId: event.leadId,
    limit: 500,
    storeId: context.storeId as never,
    tenantId: context.tenantId as never,
  });
  const activity = activities.find((candidate) =>
    matchesInsuranceProduct(candidate.metadata, event),
  );
  if (!activity) return event;

  const financialProduct = asRecord(activity.metadata.financialProduct);
  return {
    ...event,
    metadata: {
      ...(event.metadata ?? {}),
      crmFinancialProductActivityId: activity.id,
      financialProductId:
        readString(financialProduct?.financialProductId) ??
        readString(financialProduct?.idempotencyKey),
      reusedCrmFinancialProduct: true,
    },
    sourceId: activity.id,
    sourceRevision: 1,
  };
}

function matchesInsuranceProduct(
  activityMetadata: Record<string, unknown>,
  event: MaterializeFinanceAutoEntriesInput,
): boolean {
  const product = asRecord(activityMetadata.financialProduct);
  if (product?.type !== "insurance") return false;

  const expectedProductId = readString(event.metadata?.financialProductId);
  const productId =
    readString(product.financialProductId) ??
    readString(product.idempotencyKey);
  if (expectedProductId) return productId === expectedProductId;

  return (
    product.premiumCents === event.basisCents.premium &&
    product.appliedCommissionBasisPoints ===
      event.metadata?.appliedCommissionBasisPoints &&
    product.sellerUserId === event.sellerUserId
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
