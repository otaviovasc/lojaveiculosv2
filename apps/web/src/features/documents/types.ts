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

export type WorkspaceDocument = {
  context: {
    linkRole: string;
    targetId: string;
    targetType: DocumentLinkTarget;
  };
  createdAt: string;
  file: {
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
  };
  id: string;
  kind: DocumentKind;
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  title: string;
  updatedAt: string;
  uploadedAt: string;
};

export type DocumentTemplate = {
  availableVariables: readonly string[];
  clauses: readonly string[];
  defaultClauses: readonly string[];
  defaultTitle: string;
  isCustomized: boolean;
  kind: DocumentKind;
  title: string;
  updatedAt: string | null;
};

export type DocumentPreview = {
  document: WorkspaceDocument;
  generatedAt: string;
  sections: readonly {
    heading: string;
    lines: readonly string[];
  }[];
};

export type DocumentDownload = {
  document: WorkspaceDocument;
  downloadMethod: "GET";
  downloadUrl: string;
  expiresAt: string;
  fileName: string;
  mimeType: string | null;
  versionId: string;
  versionNumber: number;
};

export type DocumentUpload = {
  expiresAt: string;
  publicUrl: string;
  storageKey: string;
  uploadHeaders: Record<string, string>;
  uploadMethod: "PUT";
  uploadUrl: string;
};

export type DocumentVersion = {
  createdAt: string;
  file: {
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
  };
  id: string;
  metadata: Record<string, unknown>;
  versionNumber: number;
};

export type RequestDocumentUploadInput = {
  contentType: string;
  fileName: string;
  sizeBytes: number;
  targetId?: string;
  targetType?: DocumentLinkTarget;
};

export type VehicleDocumentTargetType = Extract<
  DocumentLinkTarget,
  "vehicle_unit"
>;

export type RequestVehicleDocumentUploadInput = {
  contentType: string;
  fileName: string;
  kind: DocumentKind;
  sizeBytes: number;
  targetId: string;
  targetType: VehicleDocumentTargetType;
};

export type CreateUploadedDocumentInput = {
  fileName: string;
  fileSizeBytes: number | null;
  kind: DocumentKind;
  mimeType: string | null;
  storageKey: string;
  targetId?: string;
  targetType?: DocumentLinkTarget;
  title: string;
};

export type CreateVehicleUploadedDocumentInput = CreateUploadedDocumentInput & {
  targetId: string;
  targetType: VehicleDocumentTargetType;
};

export type UpdateDocumentInput = {
  kind?: DocumentKind;
  linkRole?: string;
  targetId?: string;
  targetType?: DocumentLinkTarget;
  title?: string;
};

export type UpdateDocumentTemplateInput = {
  clauses: readonly string[];
  title: string;
};

export type VoidDocumentInput = {
  reason?: string;
};

export type DocumentsAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type ListDocumentsFilters = {
  kind?: DocumentKind | "";
  limit?: number;
  search?: string;
  status?: DocumentStatus | "";
  targetId?: string;
  targetType?: DocumentLinkTarget | "";
};
