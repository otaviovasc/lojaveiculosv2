import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type CrmConversationCycleCommandResult =
  "applied" | "already_applied" | "superseded";

export type CrmConversationCycleCommandType =
  "assign" | "close" | "intervention" | "mark_read" | "mark_unread";

export type CrmConversationCycleCommandReceipt = {
  commandId: string;
  commandType: CrmConversationCycleCommandType;
  requestFingerprint: string;
  result: CrmConversationCycleCommandResult | null;
  cycleId: string;
  cycleRevision: number | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmConversationCycleCommandScope = {
  commandId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmConversationCycleCommandRepository = {
  claim: (
    input: CrmConversationCycleCommandScope & {
      commandType: CrmConversationCycleCommandType;
      requestFingerprint: string;
      cycleId: string;
    },
  ) => Promise<
    | { receipt: CrmConversationCycleCommandReceipt; status: "existing" }
    | { status: "claimed" }
  >;
  complete: (
    input: CrmConversationCycleCommandScope & {
      result: CrmConversationCycleCommandResult;
      cycleRevision: number;
    },
  ) => Promise<CrmConversationCycleCommandReceipt>;
};
