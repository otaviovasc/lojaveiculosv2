export type DocumentKind =
  | "buyer_document"
  | "delivery_term"
  | "finance_receipt"
  | "inspection"
  | "internal"
  | "invoice"
  | "other"
  | "power_of_attorney"
  | "reservation_receipt"
  | "sale_receipt"
  | "sale_contract"
  | "test_drive"
  | "vehicle_registration";

export type DocumentStatus =
  | "archived"
  | "draft"
  | "issued"
  | "pending_signature"
  | "signed"
  | "voided";

export type DocumentLinkTarget =
  | "finance_entry"
  | "financing_inquiry"
  | "fiscal_document"
  | "lead"
  | "sale"
  | "sale_payment"
  | "store"
  | "vehicle_listing"
  | "vehicle_unit";

export type LinkedDocument = {
  createdAt: Date;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: DocumentKind;
  linkRole: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  status: DocumentStatus;
  storageKey: string;
  storeId: string;
  targetId: string;
  targetType: DocumentLinkTarget;
  tenantId: string;
  title: string;
  updatedAt: Date;
  uploadedAt: Date;
};

export type CreateLinkedDocumentInput = {
  createdByUserId: string | null;
  fileName: string;
  fileSizeBytes: number | null;
  kind: DocumentKind;
  linkRole: string;
  metadata?: Record<string, unknown> | undefined;
  mimeType: string | null;
  status: DocumentStatus;
  storageKey: string;
  storeId: string;
  targetId: string;
  targetType: DocumentLinkTarget;
  tenantId: string;
  title: string;
};

export type ListLinkedDocumentsInput = {
  storeId: string;
  targetId: string;
  targetType: DocumentLinkTarget;
  tenantId: string;
};

export type DocumentRepository = {
  create: (input: CreateLinkedDocumentInput) => Promise<LinkedDocument>;
  listByTarget: (
    input: ListLinkedDocumentsInput,
  ) => Promise<readonly LinkedDocument[]>;
};
