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

export type WorkspaceDocument = {
  capabilities: {
    canRegenerate: boolean;
    regenerateBlockReason:
      "document_state_unsupported" | "renderer_unavailable" | null;
  };
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
  blocks: readonly DocumentTemplateBlock[];
  category: string;
  clauses: readonly string[];
  context: string;
  defaultBlocks: readonly DocumentTemplateBlock[];
  defaultClauses: readonly string[];
  defaultTitle: string;
  description: string;
  isCustomized: boolean;
  kind: DocumentKind;
  mode: "editable" | "locked";
  source: "store" | "system";
  templateKey: string;
  title: string;
  updatedAt: string | null;
};

export type DocumentTemplateBlock =
  | {
      body: string;
      id: string;
      label?: string;
      type: "clause" | "paragraph";
    }
  | {
      id: string;
      text: string;
      type: "heading";
    }
  | {
      fields: readonly { label: string; token: string }[];
      id: string;
      title: string;
      type: "field_grid";
    }
  | {
      columns: readonly string[];
      id: string;
      preset?: string;
      title: string;
      type: "table";
    }
  | {
      id: string;
      roles: readonly string[];
      title?: string;
      type: "signature";
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
  contentHeaders?: Record<string, string> | undefined;
  contentUrl?: string | undefined;
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

export type RequestVehicleDocumentUploadInput = {
  contentType: string;
  fileName: string;
  kind: DocumentKind;
  sizeBytes: number;
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

export type CreateVehicleUploadedDocumentInput = Omit<
  CreateUploadedDocumentInput,
  "targetId" | "targetType"
>;

export type UpdateDocumentInput = {
  kind?: DocumentKind;
  linkRole?: string;
  targetId?: string;
  targetType?: DocumentLinkTarget;
  title?: string;
};

export type UpdateDocumentTemplateInput = {
  blocks?: readonly Record<string, unknown>[];
  clauses: readonly string[];
  title: string;
};

export type DocumentTemplateSuggestion = {
  appliedBlocks: readonly DocumentTemplateBlock[];
  appliedClauses: readonly string[];
  appliedTitle: string;
  diff: readonly {
    after: string;
    before: string;
    label: string;
    type: "added" | "changed" | "removed";
  }[];
  generatedAt: string;
  summary: string;
};

export type DocumentTemplateSuggestionOutcome = "accepted" | "rejected";

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
