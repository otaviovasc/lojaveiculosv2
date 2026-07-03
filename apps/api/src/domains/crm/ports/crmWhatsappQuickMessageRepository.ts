import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type CrmWhatsappQuickMessageKind = "AUDIO" | "IMAGE" | "TEXT";

export type CrmWhatsappQuickMessage = {
  content: string;
  createdAt: Date;
  createdByUserId: UserId | null;
  id: string;
  isActive: boolean;
  kind: CrmWhatsappQuickMessageKind;
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

export type ListCrmWhatsappQuickMessagesInput = {
  includeInactive?: boolean;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmWhatsappQuickMessageInput = {
  quickMessageId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmWhatsappQuickMessageInput = {
  content: string;
  createdByUserId: UserId | null;
  kind: CrmWhatsappQuickMessageKind;
  mediaType?: string | null;
  mediaUrl?: string | null;
  shortcut: string;
  sortOrder?: number;
  storageKey?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  title: string;
};

export type UpdateCrmWhatsappQuickMessageInput = {
  content?: string;
  isActive?: boolean;
  kind?: CrmWhatsappQuickMessageKind;
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
