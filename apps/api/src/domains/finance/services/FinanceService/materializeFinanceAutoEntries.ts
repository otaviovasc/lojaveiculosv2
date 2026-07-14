import type {
  FinanceAutoEntryEvent,
  FinanceAutoEntryEventAttributes,
  FinanceAutoEntryPercentageBasis,
} from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceAutoEntryExecution,
  FinanceAutoEntryRule,
} from "../../ports/financeAutoEntryRepository.js";
import type { FinanceEntryBundle } from "../../ports/financeRepository.js";
import type { FinanceLinkTarget } from "../../ports/financeRepository.js";
import {
  calculateFinanceAutoEntryAmount,
  calculateFinanceAutoEntryDueAt,
  FinanceAutoEntryEvaluationError,
  resolveApplicableFinanceAutoEntryRules,
} from "./financeAutoEntryEvaluator.js";
import {
  financeAutoEntryRuleCategory,
  financeAutoEntryRuleName,
} from "./financeAutoEntryLabels.js";
import { ensureV1FinanceAutoEntryDefaultRules } from "../../financeAutoEntryDefaults.js";
import { assertMaterializationUsersBelongToStore } from "../../financeAutoEntryStoreUsers.js";
import {
  auditFinanceServiceEvent,
  getFinanceAutoEntryRepository,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

export type MaterializeFinanceAutoEntriesInput = {
  attributes?: FinanceAutoEntryEventAttributes;
  basisCents: Partial<Record<FinanceAutoEntryPercentageBasis, number | null>>;
  event: FinanceAutoEntryEvent;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  saleId?: string | null;
  sellerUserId?: string | null;
  sourceId: string;
  sourceRevision: number;
  unitId?: string | null;
};

export type MaterializedFinanceAutoEntry = {
  created: boolean;
  entry: FinanceEntryBundle;
  execution: FinanceAutoEntryExecution;
  rule: FinanceAutoEntryRule;
};

export type MaterializeFinanceAutoEntryPorts = Pick<
  FinanceServicePorts,
  "financeAutoEntryRepository" | "financeRepository"
>;

export async function materializeFinanceAutoEntries(
  context: ServiceContext,
  input: MaterializeFinanceAutoEntriesInput,
  ports?: MaterializeFinanceAutoEntryPorts,
): Promise<readonly MaterializedFinanceAutoEntry[]> {
  assertMaterializationInput(input);
  const scope = requireFinanceScope(context);
  const autoEntryRepository = getFinanceAutoEntryRepository(ports);
  const financeRepository = getFinanceRepository(ports);
  await assertMaterializationUsersBelongToStore(
    autoEntryRepository,
    { sellerUserId: input.sellerUserId ?? null },
    scope,
  );
  await ensureV1FinanceAutoEntryDefaultRules(autoEntryRepository, scope);
  const candidates = await autoEntryRepository.listRules({
    event: input.event,
    limit: 500,
    status: "active",
    ...scope,
  });
  const rules = resolveApplicableFinanceAutoEntryRules(
    candidates,
    input.sellerUserId ?? null,
    { attributes: input.attributes ?? {}, basisCents: input.basisCents },
  );
  await assertMaterializationUsersBelongToStore(
    autoEntryRepository,
    { rules, sellerUserId: input.sellerUserId ?? null },
    scope,
  );

  const results: MaterializedFinanceAutoEntry[] = [];
  for (const rule of rules) {
    const key = {
      ruleId: rule.id,
      sourceId: input.sourceId,
      sourceRevision: input.sourceRevision,
      sourceType: input.event,
      ...scope,
    };
    const existing = await autoEntryRepository.findExecution(key);
    if (existing) {
      const entry = await financeRepository.findById({
        entryId: existing.financeEntryId,
        ...scope,
      });
      if (!entry) {
        throw new FinanceAutoEntryExecutionInvariantError(existing.id);
      }
      results.push({ created: false, entry, execution: existing, rule });
      continue;
    }

    const calculation = calculateFinanceAutoEntryAmount(rule, input.basisCents);
    const dueAt = calculateFinanceAutoEntryDueAt(input.occurredAt, rule.timing);
    const entry = await financeRepository.createEntry({
      amountCents: calculation.amountCents,
      category: financeAutoEntryRuleCategory(rule),
      dueAt,
      links: createSourceLinks(input),
      metadata: {
        ...(input.metadata ?? {}),
        automaticFinanceEntry: {
          event: input.event,
          family: rule.family,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          sourceId: input.sourceId,
          sourceRevision: input.sourceRevision,
        },
      },
      name: financeAutoEntryRuleName(rule),
      paidAt: null,
      sellerUserId: resolveRecipientUserId(rule, input.sellerUserId ?? null),
      status: "pending",
      type: rule.outputType,
      ...scope,
    });
    const execution = await autoEntryRepository.createExecution({
      calculationSnapshot: {
        ...calculation,
        calculation: rule.calculation,
        dueAt: dueAt.toISOString(),
        event: input.event,
        occurredAt: input.occurredAt.toISOString(),
        outputType: rule.outputType,
        timing: rule.timing,
      },
      financeEntryId: entry.entry.id,
      metadata: {
        ...(input.metadata ?? {}),
        attributes: input.attributes ?? {},
        leadId: input.leadId ?? null,
        saleId: input.saleId ?? null,
        sellerUserId: input.sellerUserId ?? null,
        unitId: input.unitId ?? null,
      },
      ...key,
    });

    logFinanceServiceEvent(context, "finance_auto_entry.materialized", {
      amountCents: calculation.amountCents,
      entryId: entry.entry.id,
      executionId: execution.id,
      ruleId: rule.id,
    });
    await auditFinanceServiceEvent(context, {
      action: "finance_auto_entry.materialize",
      category: "data_change",
      entityId: execution.id,
      entityType: "finance_auto_entry_execution",
      metadata: {
        amountCents: calculation.amountCents,
        event: input.event,
        sourceId: input.sourceId,
        sourceRevision: input.sourceRevision,
        trigger: "authorized_domain_event",
      },
      relatedEntities: [
        { id: rule.id, type: "finance_auto_entry_rule" },
        { id: entry.entry.id, type: "finance_entry" },
      ],
      summary: "Materialized automatic finance entry",
    });
    results.push({ created: true, entry, execution, rule });
  }
  return results;
}

function createSourceLinks(
  input: MaterializeFinanceAutoEntriesInput,
): { targetId: string; targetType: FinanceLinkTarget }[] {
  return [
    ...(input.leadId
      ? [{ targetId: input.leadId, targetType: "lead" as const }]
      : []),
    ...(input.saleId
      ? [{ targetId: input.saleId, targetType: "sale" as const }]
      : []),
    ...(input.unitId
      ? [{ targetId: input.unitId, targetType: "vehicle_unit" as const }]
      : []),
  ];
}

function resolveRecipientUserId(
  rule: FinanceAutoEntryRule,
  eventSellerUserId: string | null,
): string | null {
  if (rule.recipient.kind === "none") return null;
  if (rule.recipient.kind === "fixed_user") return rule.recipient.userId;
  return eventSellerUserId;
}

function assertMaterializationInput(
  input: MaterializeFinanceAutoEntriesInput,
): void {
  if (!input.sourceId.trim()) {
    throw new FinanceAutoEntryEvaluationError("sourceId is invalid.");
  }
  if (!Number.isInteger(input.sourceRevision) || input.sourceRevision < 1) {
    throw new FinanceAutoEntryEvaluationError("sourceRevision is invalid.");
  }
  if (Number.isNaN(input.occurredAt.getTime())) {
    throw new FinanceAutoEntryEvaluationError("occurredAt is invalid.");
  }
}

export class FinanceAutoEntryExecutionInvariantError extends Error {
  constructor(executionId: string) {
    super(
      `Finance auto-entry execution ${executionId} references a missing entry.`,
    );
    this.name = "FinanceAutoEntryExecutionInvariantError";
  }
}
