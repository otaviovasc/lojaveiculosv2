import type {
  InventoryDocumentKind,
  InventoryDocumentTargetType,
  InventoryMediaKind,
} from "./catalogTypes";

export type InventoryMediaUpload = {
  expiresAt: string;
  publicUrl: string;
  storageKey: string;
  uploadHeaders: Record<string, string>;
  uploadMethod: "PUT";
  uploadUrl: string;
};

export type InventoryMediaRecord = {
  mediaId: string;
  status: "created";
  storageKey?: string;
  unitId: string;
  url: string;
};

export type InventoryMedia = {
  altText: string | null;
  createdAt: string;
  displayOrder: number;
  id: string;
  isPublic: boolean;
  kind: InventoryMediaKind;
  storageKey: string;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: string;
  url: string;
};

export type InventoryDocument = {
  createdAt: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: InventoryDocumentKind;
  linkRole: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  status:
    "archived" | "draft" | "issued" | "pending_signature" | "signed" | "voided";
  storageKey: string;
  storeId: string | null;
  targetId: string;
  targetType: InventoryDocumentTargetType;
  tenantId: string | null;
  title: string;
  updatedAt: string;
  uploadedAt: string;
};

export type InventoryDocumentAccess = {
  downloadUrl: string;
  expiresAt: string;
  fileName: string;
  mimeType: string | null;
};
