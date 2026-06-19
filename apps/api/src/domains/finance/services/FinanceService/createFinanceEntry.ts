import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryStatus,
  FinanceEntryType,
  FinanceLinkTarget,
  FinanceEntryBundle,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.create";

export type CreateFinanceEntryInput = {
  amountCents: number;
  category: string;
  dueAt?: Date | null;
  links?: readonly {
    targetId: string;
    targetType: FinanceLinkTarget;
  }[];
  metadata?: Record<string, unknown>;
  name: string;
  paidAt?: Date | null;
  sellerUserId?: string | null;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
};

export async function createFinanceEntry(
  context: ServiceContext,
  input: CreateFinanceEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryBundle> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);

  logFinanceServiceEvent(context, "finance_entry.create.started", {
    amountCents: input.amountCents,
    category: input.category,
    status: input.status,
    type: input.type,
  });

  const bundle = await getFinanceRepository(ports).createEntry({
    amountCents: input.amountCents,
    category: input.category,
    dueAt: input.dueAt ?? null,
    links: input.links ?? [],
    metadata: input.metadata ?? {},
    name: input.name,
    paidAt: input.paidAt ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    type: input.type,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.create",
    category: "data_change",
    entityId: bundle.entry.id,
    metadata: {
      amountCents: bundle.entry.amountCents,
      category: bundle.entry.category,
      linkCount: bundle.links.length,
      status: bundle.entry.status,
      type: bundle.entry.type,
    },
    permission,
    relatedEntities: bundle.links.map((link) => ({
      id: link.targetId,
      type: link.targetType,
    })),
    summary: "Created finance entry",
  });

  return bundle;
}
