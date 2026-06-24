import type {
  DocumentKind,
  DocumentLinkTarget,
  DocumentStatus,
  DocumentTemplate,
  DocumentVersion,
  LinkedDocument,
} from "../ports/documentRepository.js";

export type DocumentOperationHistoryEntry = {
  action: string;
  actorId: string;
  at: Date;
  reason?: string | undefined;
};

export type DocumentSummary = {
  createdAt: Date;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: DocumentKind;
  linkRole: string;
  mimeType: string | null;
  status: DocumentStatus;
  targetId: string;
  targetLabel: string;
  targetType: DocumentLinkTarget;
  title: string;
  updatedAt: Date;
};

export type DocumentDetail = {
  createdAt: Date;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: DocumentKind;
  linkRole: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  operationHistory: readonly DocumentOperationHistoryEntry[];
  status: DocumentStatus;
  storageKey: string;
  targetId: string;
  targetLabel: string;
  targetType: DocumentLinkTarget;
  title: string;
  updatedAt: Date;
  uploadedAt: Date;
  versionsCount: number;
};

export type DocumentTemplateView = {
  availableVariables: readonly string[];
  clauses: readonly string[];
  defaultClauses: readonly string[];
  defaultTitle: string;
  isCustomized: boolean;
  kind: DocumentKind;
  title: string;
  updatedAt: Date | null;
};

export type DocumentVersionView = {
  createdAt: Date;
  createdByUserId: string | null;
  documentId: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  mimeType: string | null;
  versionNumber: number;
};

export type DocumentWorkspaceResult = {
  documents: readonly DocumentSummary[];
  limit: number;
  offset: number;
  total: number;
};

export function createDocumentSummary(input: {
  document: LinkedDocument;
  targetLabel: string;
}): DocumentSummary {
  return {
    createdAt: input.document.createdAt,
    fileName: input.document.fileName,
    fileSizeBytes: input.document.fileSizeBytes,
    id: input.document.id,
    kind: input.document.kind,
    linkRole: input.document.linkRole,
    mimeType: input.document.mimeType,
    status: input.document.status,
    targetId: input.document.targetId,
    targetLabel: input.targetLabel,
    targetType: input.document.targetType,
    title: input.document.title,
    updatedAt: input.document.updatedAt,
  };
}

export function createDocumentDetail(input: {
  document: LinkedDocument;
  operationHistory: readonly DocumentOperationHistoryEntry[];
  targetLabel: string;
  versionsCount: number;
}): DocumentDetail {
  return {
    createdAt: input.document.createdAt,
    fileName: input.document.fileName,
    fileSizeBytes: input.document.fileSizeBytes,
    id: input.document.id,
    kind: input.document.kind,
    linkRole: input.document.linkRole,
    metadata: input.document.metadata,
    mimeType: input.document.mimeType,
    operationHistory: input.operationHistory,
    status: input.document.status,
    storageKey: input.document.storageKey,
    targetId: input.document.targetId,
    targetLabel: input.targetLabel,
    targetType: input.document.targetType,
    title: input.document.title,
    updatedAt: input.document.updatedAt,
    uploadedAt: input.document.uploadedAt,
    versionsCount: input.versionsCount,
  };
}

export function createDocumentTemplateView(
  template: DocumentTemplate,
): DocumentTemplateView {
  return {
    availableVariables: template.availableVariables,
    clauses: template.clauses,
    defaultClauses: template.defaultClauses,
    defaultTitle: template.defaultTitle,
    isCustomized: template.isCustomized,
    kind: template.kind,
    title: template.title,
    updatedAt: template.updatedAt,
  };
}

export function createDocumentVersionView(
  version: DocumentVersion,
): DocumentVersionView {
  return {
    createdAt: version.createdAt,
    createdByUserId: version.createdByUserId,
    documentId: version.documentId,
    fileName: version.fileName,
    fileSizeBytes: version.fileSizeBytes,
    id: version.id,
    mimeType: version.mimeType,
    versionNumber: version.versionNumber,
  };
}

export function createDocumentWorkspaceResult(input: {
  documents: readonly DocumentSummary[];
  limit: number;
  offset: number;
  total: number;
}): DocumentWorkspaceResult {
  return {
    documents: input.documents,
    limit: input.limit,
    offset: input.offset,
    total: input.total,
  };
}
