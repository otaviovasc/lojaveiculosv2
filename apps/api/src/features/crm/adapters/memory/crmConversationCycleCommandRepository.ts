import type {
  CrmConversationCycleCommandReceipt,
  CrmConversationCycleCommandRepository,
} from "../../../../domains/crm/ports/crmConversationCycleCommandRepository.js";

export function createMemoryCrmConversationCycleCommandRepository(): CrmConversationCycleCommandRepository {
  const receipts = new Map<string, CrmConversationCycleCommandReceipt>();
  return {
    async claim(input) {
      const key = receiptKey(input);
      const receipt = receipts.get(key);
      if (receipt) return { receipt: { ...receipt }, status: "existing" };
      receipts.set(key, { ...input, result: null, cycleRevision: null });
      return { status: "claimed" };
    },
    async complete(input) {
      const key = receiptKey(input);
      const receipt = receipts.get(key);
      if (!receipt) {
        throw new Error("CRM WhatsApp cycle command receipt disappeared.");
      }
      const completed = {
        ...receipt,
        result: input.result,
        cycleRevision: input.cycleRevision,
      };
      receipts.set(key, completed);
      return { ...completed };
    },
  };
}

function receiptKey(input: {
  commandId: string;
  storeId: string;
  tenantId: string;
}) {
  return `${input.tenantId}:${input.storeId}:${input.commandId}`;
}
