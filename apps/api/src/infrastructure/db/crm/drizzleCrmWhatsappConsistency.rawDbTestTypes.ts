import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type RawWhatsappScope = {
  connectionId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type RawWhatsappFixture = {
  assigneeId: UserId;
  foreign: RawWhatsappScope;
  otherAssigneeId: UserId;
  primary: RawWhatsappScope;
  sibling: RawWhatsappScope;
};
