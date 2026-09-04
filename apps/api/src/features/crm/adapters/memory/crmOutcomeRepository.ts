import type {
  CrmLeadOutcome,
  CrmOutcomeRepository,
} from "../../../../domains/crm/ports/crmOutcomeRepository.js";

export function createMemoryCrmOutcomeRepository(): CrmOutcomeRepository {
  const outcomes: CrmLeadOutcome[] = [];
  return {
    async create(input) {
      const duplicate = outcomes.find(
        (item) =>
          item.tenantId === input.tenantId &&
          item.storeId === input.storeId &&
          item.commandId === input.commandId,
      );
      if (duplicate) return duplicate;
      const outcome = {
        ...input,
        createdAt: new Date(),
        id: crypto.randomUUID(),
      };
      outcomes.push(outcome);
      return outcome;
    },
    async findByCommandId(input) {
      return (
        outcomes.find(
          (item) =>
            item.tenantId === input.tenantId &&
            item.storeId === input.storeId &&
            item.commandId === input.commandId,
        ) ?? null
      );
    },
    async lockLead() {},
  };
}
