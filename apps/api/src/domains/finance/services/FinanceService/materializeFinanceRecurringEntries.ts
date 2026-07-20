import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntry,
  FinanceRecurrenceFrequency,
  FinanceRepository,
  FinanceRecurringEntry,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.create";

export type MaterializeFinanceRecurringEntriesInput = {
  asOf?: Date;
};

export type MaterializeFinanceRecurringEntriesResult = {
  generatedEntries: FinanceEntry[];
};

export async function materializeFinanceRecurringEntries(
  context: ServiceContext,
  input: MaterializeFinanceRecurringEntriesInput,
  ports?: FinanceServicePorts,
): Promise<MaterializeFinanceRecurringEntriesResult> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const repository = getFinanceRepository(ports);
  const asOf = input.asOf ?? new Date();
  const templates = await repository.listRecurringEntries({
    limit: 500,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  logFinanceServiceEvent(
    context,
    "finance_recurring_entry.materialize.started",
    {
      asOf: asOf.toISOString(),
      templateCount: templates.length,
    },
  );

  const generatedEntries: FinanceEntry[] = [];
  for (const template of templates) {
    if (template.status !== "pending") continue;
    generatedEntries.push(
      ...(await materializeTemplate(
        context,
        repository,
        template,
        asOf,
        scope,
      )),
    );
  }

  return { generatedEntries };
}

async function materializeTemplate(
  context: ServiceContext,
  repository: FinanceRepository,
  template: FinanceRecurringEntry,
  asOf: Date,
  scope: { storeId: string; tenantId: string },
): Promise<FinanceEntry[]> {
  const cap = occurrenceCap(template.metadata);
  let generatedCount = generatedCountOf(template.metadata);
  let dueAt = template.nextDueAt;
  const entries: FinanceEntry[] = [];

  while (dueAt <= asOf && (cap === null || generatedCount < cap)) {
    const bundle = await repository.createEntry({
      amountCents: template.amountCents,
      category: template.category,
      dueAt,
      links: [],
      metadata: {
        recurringEntryId: template.id,
        source: "finance_recurring",
      },
      name: template.name,
      paidAt: null,
      sellerUserId: template.sellerUserId,
      status: "pending",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      type: template.type,
    });
    generatedCount += 1;
    entries.push(bundle.entry);
    dueAt = advanceRecurringDueAt(dueAt, template.frequency);
  }

  if (!entries.length) return [];

  const exhausted = cap !== null && generatedCount >= cap;
  await repository.updateRecurringEntry({
    lastGeneratedAt: asOf,
    metadata: {
      ...template.metadata,
      generatedCount,
      ...(exhausted ? { exhaustedAt: asOf.toISOString() } : {}),
    },
    nextDueAt: dueAt,
    recurringEntryId: template.id,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  logFinanceServiceEvent(context, "finance_recurring_entry.materialized", {
    generatedCount: entries.length,
    recurringEntryId: template.id,
  });
  await auditFinanceServiceEvent(context, {
    action: "finance_recurring_entry.materialize",
    category: "data_change",
    entityId: template.id,
    entityType: "finance_recurring_entry",
    metadata: {
      entryIds: entries.map((entry) => entry.id),
      generatedCount: entries.length,
    },
    permission,
    summary: "Materialized recurring finance entry",
  });

  return entries;
}

function advanceRecurringDueAt(
  dueAt: Date,
  frequency: FinanceRecurrenceFrequency,
): Date {
  if (frequency === "weekly") {
    return new Date(dueAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return addCalendarMonths(dueAt, frequency === "monthly" ? 1 : 12);
}

function addCalendarMonths(date: Date, months: number): Date {
  const dayOfMonth = date.getUTCDate();
  const firstOfTargetMonth = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  firstOfTargetMonth.setUTCDate(Math.min(dayOfMonth, daysInTargetMonth));
  return firstOfTargetMonth;
}

function occurrenceCap(metadata: Record<string, unknown>): number | null {
  const value = metadata.occurrences;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

function generatedCountOf(metadata: Record<string, unknown>): number {
  const value = metadata.generatedCount;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}
