import type {
  CreateFinanceAutoEntryExecutionInput,
  CreateFinanceAutoEntryRuleInput,
  FinanceAutoEntryExecution,
  FinanceAutoEntryRepository,
  FinanceAutoEntryRule,
} from "./ports/financeAutoEntryRepository.js";

export type TestFinanceAutoEntryRepository = FinanceAutoEntryRepository & {
  executions: FinanceAutoEntryExecution[];
  inactiveStoreMemberUserIds: Set<string>;
  rules: FinanceAutoEntryRule[];
};

export function createTestFinanceAutoEntryRepository(): TestFinanceAutoEntryRepository {
  const executions: FinanceAutoEntryExecution[] = [];
  const inactiveStoreMemberUserIds = new Set<string>();
  const rules: FinanceAutoEntryRule[] = [];

  return {
    executions,
    inactiveStoreMemberUserIds,
    rules,
    async createExecution(input: CreateFinanceAutoEntryExecutionInput) {
      const duplicate = executions.find((item) =>
        isSameExecutionKey(item, input),
      );
      if (duplicate) {
        throw new Error("Finance auto-entry execution already exists.");
      }
      const now = new Date();
      const execution: FinanceAutoEntryExecution = {
        ...input,
        createdAt: now,
        id: `finance_auto_entry_execution_${executions.length + 1}`,
        updatedAt: now,
      };
      executions.push(execution);
      return execution;
    },
    async createRule(input: CreateFinanceAutoEntryRuleInput) {
      const now = new Date();
      const rule: FinanceAutoEntryRule = {
        ...input,
        createdAt: now,
        id: `finance_auto_entry_rule_${rules.length + 1}`,
        updatedAt: now,
      };
      rules.push(rule);
      return rule;
    },
    async ensureRules(input) {
      const ensured: FinanceAutoEntryRule[] = [];
      for (const definition of input.rules) {
        const existing = rules.find(
          (rule) =>
            rule.ruleKey === definition.ruleKey &&
            rule.sellerUserId === definition.sellerUserId &&
            rule.storeId === input.storeId &&
            rule.tenantId === input.tenantId,
        );
        if (existing) {
          ensured.push(existing);
          continue;
        }
        const now = new Date();
        const rule: FinanceAutoEntryRule = {
          ...definition,
          createdAt: now,
          id: `finance_auto_entry_rule_${rules.length + 1}`,
          storeId: requireTestScope(input.storeId, "storeId"),
          tenantId: requireTestScope(input.tenantId, "tenantId"),
          updatedAt: now,
        };
        rules.push(rule);
        ensured.push(rule);
      }
      return ensured;
    },
    async findExecution(input) {
      return (
        executions.find(
          (item) =>
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId &&
            isSameExecutionKey(item, input),
        ) ?? null
      );
    },
    async findRuleById(input) {
      return (
        rules.find(
          (rule) =>
            rule.id === input.ruleId &&
            rule.storeId === input.storeId &&
            rule.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async isActiveStoreMember(input) {
      return !inactiveStoreMemberUserIds.has(input.userId);
    },
    async listRules(input) {
      return rules
        .filter((rule) => rule.storeId === input.storeId)
        .filter((rule) => rule.tenantId === input.tenantId)
        .filter((rule) => !input.event || rule.event === input.event)
        .filter((rule) => !input.status || rule.status === input.status)
        .filter(
          (rule) => input.includeArchived || !isArchivedRule(rule.metadata),
        )
        .filter(
          (rule) =>
            input.sellerUserId === undefined ||
            rule.sellerUserId === input.sellerUserId,
        )
        .sort(compareRules)
        .slice(0, input.limit);
    },
    async updateRule(input) {
      const current = rules.find(
        (rule) =>
          rule.id === input.ruleId &&
          rule.storeId === input.storeId &&
          rule.tenantId === input.tenantId,
      );
      if (!current)
        throw new Error(`Finance auto-entry rule not found: ${input.ruleId}`);
      const updated: FinanceAutoEntryRule = {
        ...current,
        ...withoutScope(input),
        updatedAt: new Date(),
      };
      rules.splice(rules.indexOf(current), 1, updated);
      return updated;
    },
  };
}

function requireTestScope(value: string | null, field: string): string {
  if (!value)
    throw new Error(`Test finance auto-entry repository requires ${field}.`);
  return value;
}

function isArchivedRule(metadata: Record<string, unknown>): boolean {
  return (
    typeof metadata.archivedAt === "string" && Boolean(metadata.archivedAt)
  );
}

function isSameExecutionKey(
  left: Pick<
    FinanceAutoEntryExecution,
    "ruleId" | "sourceId" | "sourceRevision" | "sourceType" | "storeId"
  >,
  right: Pick<
    FinanceAutoEntryExecution,
    "ruleId" | "sourceId" | "sourceRevision" | "sourceType"
  > & { storeId: string | null },
): boolean {
  return (
    left.storeId === right.storeId &&
    left.ruleId === right.ruleId &&
    left.sourceType === right.sourceType &&
    left.sourceId === right.sourceId &&
    left.sourceRevision === right.sourceRevision
  );
}

function compareRules(
  left: FinanceAutoEntryRule,
  right: FinanceAutoEntryRule,
): number {
  return (
    right.priority - left.priority ||
    right.updatedAt.getTime() - left.updatedAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function withoutScope(
  input: Parameters<FinanceAutoEntryRepository["updateRule"]>[0],
) {
  const {
    ruleId: _ruleId,
    storeId: _storeId,
    tenantId: _tenantId,
    ...update
  } = input;
  return update;
}
