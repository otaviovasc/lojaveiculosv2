import type {
  CrmWhatsappSessionCommandReceipt,
  CrmWhatsappSessionCommandRepository,
} from "../../../../domains/crm/ports/crmWhatsappSessionCommandRepository.js";

export function createMemoryCrmWhatsappSessionCommandRepository(): CrmWhatsappSessionCommandRepository {
  const receipts = new Map<string, CrmWhatsappSessionCommandReceipt>();
  return {
    async claim(input) {
      const key = receiptKey(input);
      const receipt = receipts.get(key);
      if (receipt) return { receipt: { ...receipt }, status: "existing" };
      receipts.set(key, { ...input, result: null, sessionRevision: null });
      return { status: "claimed" };
    },
    async complete(input) {
      const key = receiptKey(input);
      const receipt = receipts.get(key);
      if (!receipt) {
        throw new Error("CRM WhatsApp session command receipt disappeared.");
      }
      const completed = {
        ...receipt,
        result: input.result,
        sessionRevision: input.sessionRevision,
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
