import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type RawCrmConversationScope = {
  connectionId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type RawCrmConversationFixture = {
  assigneeId: UserId;
  foreign: RawCrmConversationScope;
  otherAssigneeId: UserId;
  primary: RawCrmConversationScope;
  sibling: RawCrmConversationScope;
};
