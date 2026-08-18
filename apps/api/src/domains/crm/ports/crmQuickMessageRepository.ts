import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type CrmQuickMessageKind = "AUDIO" | "IMAGE" | "TEXT";

export type CrmQuickMessage = {
  content: string;
  createdAt: Date;
  createdByUserId: UserId | null;
  id: string;
  isActive: boolean;
  kind: CrmQuickMessageKind;
  mediaType: string | null;
  mediaUrl: string | null;
  shortcut: string;
  sortOrder: number;
  storageKey: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  title: string;
  updatedAt: Date;
};

export type ListCrmQuickMessagesInput = {
  includeInactive?: boolean;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmQuickMessageInput = {
  quickMessageId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmQuickMessageInput = {
  content: string;
  createdByUserId: UserId | null;
  kind: CrmQuickMessageKind;
  mediaType?: string | null;
  mediaUrl?: string | null;
  shortcut: string;
  sortOrder?: number;
  storageKey?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  title: string;
};

export type UpdateCrmQuickMessageInput = {
  content?: string;
  isActive?: boolean;
  kind?: CrmQuickMessageKind;
  mediaType?: string | null;
  mediaUrl?: string | null;
  quickMessageId: string;
  shortcut?: string;
  sortOrder?: number;
  storageKey?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  title?: string;
};
