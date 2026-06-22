import type {
  CreateFinanceEntryInput,
  CommissionRule,
  FinanceEntry,
  FinanceEntryLink,
  FinanceRecurringEntry,
  FinanceRepository,
} from "../../../../domains/finance/ports/financeRepository.js";

export function createMemoryFinanceRepository(): FinanceRepository {
  const commissionRules: CommissionRule[] = [];
  const entries: FinanceEntry[] = [];
  const links: FinanceEntryLink[] = [];
  const recurringEntries: FinanceRecurringEntry[] = [];
  let commissionRuleSequence = 1;
  let entrySequence = 1;
  let linkSequence = 1;
  let recurringSequence = 1;

  return {
    async createCommissionRule(input) {
      const now = new Date();
      const rule: CommissionRule = {
        ...input,
        createdAt: now,
        id: `commission_rule_${commissionRuleSequence}`,
        updatedAt: now,
      };
      commissionRuleSequence += 1;
      commissionRules.push(rule);
      return rule;
    },
    async createEntry(input: CreateFinanceEntryInput) {
      const now = new Date();
      const entry: FinanceEntry = {
        ...input,
        createdAt: now,
        id: `finance_entry_${entrySequence}`,
        updatedAt: now,
      };
      entrySequence += 1;
      const entryLinks: FinanceEntryLink[] = input.links.map((link) => {
        const item = {
          ...link,
          createdAt: now,
          entryId: entry.id,
          id: `finance_entry_link_${linkSequence}`,
          storeId: input.storeId,
          tenantId: input.tenantId,
          updatedAt: now,
        };
        linkSequence += 1;
        return item;
      });
      entries.push(entry);
      links.push(...entryLinks);
      return { entry, links: entryLinks };
    },
    async createRecurringEntry(input) {
      const now = new Date();
      const recurring: FinanceRecurringEntry = {
        ...input,
        createdAt: now,
        id: `finance_recurring_entry_${recurringSequence}`,
        lastGeneratedAt: null,
        updatedAt: now,
      };
      recurringSequence += 1;
      recurringEntries.push(recurring);
      return recurring;
    },
    async findById(input) {
      const entry = entries.find(
        (item) =>
          item.id === input.entryId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!entry) return null;
      return {
        entry,
        links: links.filter((link) => link.entryId === entry.id),
      };
    },
    async list(input) {
      return entries
        .filter((entry) => entry.storeId === input.storeId)
        .filter((entry) => entry.tenantId === input.tenantId)
        .filter((entry) => !input.type || entry.type === input.type)
        .filter((entry) => !input.status || entry.status === input.status)
        .filter(
          (entry) =>
            !input.targetId ||
            links.some(
              (link) =>
                link.entryId === entry.id &&
                link.targetId === input.targetId &&
                link.targetType === input.targetType,
            ),
        )
        .slice(input.offset, input.offset + input.limit)
        .map((entry) => ({
          entry,
          links: links.filter((link) => link.entryId === entry.id),
        }));
    },
    async listCommissionRules(input) {
      return commissionRules
        .filter((rule) => rule.storeId === input.storeId)
        .filter((rule) => rule.tenantId === input.tenantId)
        .filter((rule) => !input.status || rule.status === input.status)
        .filter(
          (rule) =>
            !input.sellerUserId || rule.sellerUserId === input.sellerUserId,
        )
        .slice(0, input.limit);
    },
    async listRecurringEntries(input) {
      return recurringEntries
        .filter((entry) => entry.storeId === input.storeId)
        .filter((entry) => entry.tenantId === input.tenantId)
        .filter((entry) => !input.type || entry.type === input.type)
        .slice(0, input.limit);
    },
    async updateEntry(input) {
      const current = entries.find(
        (entry) =>
          entry.id === input.entryId &&
          entry.storeId === input.storeId &&
          entry.tenantId === input.tenantId,
      );
      if (!current)
        throw new Error(`Finance entry not found: ${input.entryId}`);
      const updated: FinanceEntry = {
        ...current,
        ...(input.amountCents !== undefined
          ? { amountCents: input.amountCents }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
        ...(input.sellerUserId !== undefined
          ? { sellerUserId: input.sellerUserId }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      };
      entries.splice(entries.indexOf(current), 1, updated);
      return {
        entry: updated,
        links: links.filter((link) => link.entryId === updated.id),
      };
    },
  };
}
