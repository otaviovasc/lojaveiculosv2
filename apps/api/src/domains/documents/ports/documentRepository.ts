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
  "archived" | "draft" | "issued" | "pending_signature" | "signed" | "voided";

export type DocumentLinkTarget =
  | "finance_entry"
  | "financing_inquiry"
  | "fiscal_document"
  | "lead"
  | "sale"
  | "sale_payment"
  | "store"
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

export type DocumentVersion = {
  createdAt: Date;
  createdByUserId: string | null;
  documentId: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  storageKey: string;
  storeId: string;
  tenantId: string;
  versionNumber: number;
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

export type ListDocumentsInput = {
  kind?: DocumentKind | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: DocumentStatus | undefined;
  storeId: string;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
  tenantId: string;
};

export type DocumentTemplate = {
  availableVariables: readonly string[];
  blocks: readonly Record<string, unknown>[];
  category: string;
  clauses: readonly string[];
  context: string;
  defaultBlocks: readonly Record<string, unknown>[];
  defaultClauses: readonly string[];
  defaultTitle: string;
  description: string;
  isCustomized: boolean;
  kind: DocumentKind;
  mode: "editable" | "locked";
  source: "store" | "system";
  templateKey: string;
  title: string;
  updatedAt: Date | null;
};

export type ListDocumentTemplatesInput = {
  storeId: string;
  tenantId: string;
};

export type UpsertDocumentTemplateInput = {
  blocks?: readonly Record<string, unknown>[] | undefined;
  clauses: readonly string[];
  kind: DocumentKind;
  storeId: string;
  templateKey: string;
  tenantId: string;
  title: string;
  updatedByUserId: string | null;
};

export type UpdateLinkedDocumentInput = {
  documentId: string;
  kind?: DocumentKind | undefined;
  linkRole?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  status?: DocumentStatus | undefined;
  storeId: string;
  targetId?: string | undefined;
  targetType?: DocumentLinkTarget | undefined;
  tenantId: string;
  title?: string | undefined;
};

export type CreateDocumentVersionInput = {
  createdByUserId: string | null;
  documentId: string;
  fileName: string;
  fileSizeBytes: number | null;
  metadata?: Record<string, unknown> | undefined;
  mimeType: string | null;
  storageKey: string;
  storeId: string;
  tenantId: string;
};

export type DocumentRepository = {
  create: (input: CreateLinkedDocumentInput) => Promise<LinkedDocument>;
  createVersion: (
    input: CreateDocumentVersionInput,
  ) => Promise<DocumentVersion>;
  findById: (input: {
    documentId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<LinkedDocument | null>;
  findTemplate: (input: {
    kind: DocumentKind;
    storeId: string;
    templateKey?: string | undefined;
    tenantId: string;
  }) => Promise<DocumentTemplate | null>;
  list: (input: ListDocumentsInput) => Promise<readonly LinkedDocument[]>;
  listVersions: (input: {
    documentId: string;
    versionId?: string | undefined;
    storeId: string;
    tenantId: string;
  }) => Promise<readonly DocumentVersion[]>;
  listByTarget: (
    input: ListLinkedDocumentsInput,
  ) => Promise<readonly LinkedDocument[]>;
  listTemplates: (
    input: ListDocumentTemplatesInput,
  ) => Promise<readonly DocumentTemplate[]>;
  upsertTemplate: (
    input: UpsertDocumentTemplateInput,
  ) => Promise<DocumentTemplate>;
  update: (input: UpdateLinkedDocumentInput) => Promise<LinkedDocument>;
};
