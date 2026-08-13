import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type CrmWhatsappSessionCommandResult =
  "applied" | "already_applied" | "superseded";

export type CrmWhatsappSessionCommandType =
  "assign" | "close" | "intervention" | "mark_read" | "mark_unread";

export type CrmWhatsappSessionCommandReceipt = {
  commandId: string;
  commandType: CrmWhatsappSessionCommandType;
  requestFingerprint: string;
  result: CrmWhatsappSessionCommandResult | null;
  sessionId: string;
  sessionRevision: number | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmWhatsappSessionCommandScope = {
  commandId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmWhatsappSessionCommandRepository = {
  claim: (
    input: CrmWhatsappSessionCommandScope & {
      commandType: CrmWhatsappSessionCommandType;
      requestFingerprint: string;
      sessionId: string;
    },
  ) => Promise<
    | { receipt: CrmWhatsappSessionCommandReceipt; status: "existing" }
    | { status: "claimed" }
  >;
  complete: (
    input: CrmWhatsappSessionCommandScope & {
      result: CrmWhatsappSessionCommandResult;
      sessionRevision: number;
    },
  ) => Promise<CrmWhatsappSessionCommandReceipt>;
};
