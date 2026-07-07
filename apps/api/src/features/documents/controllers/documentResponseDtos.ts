import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentTemplate } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentVersion } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentDownloadDescriptor } from "../../../domains/documents/services/DocumentOperationService/downloadDocument.js";
import type { DocumentPreview } from "../../../domains/documents/preview/documentPreview.js";
import type { ObjectUpload } from "../../../shared/storage/objectStorage.js";

export function toDocumentWorkspaceDto(document: LinkedDocument) {
  return {
    context: {
      linkRole: document.linkRole,
      targetId: document.targetId,
      targetType: document.targetType,
    },
    createdAt: document.createdAt.toISOString(),
    file: {
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      mimeType: document.mimeType,
    },
    id: document.id,
    kind: document.kind,
    metadata: document.metadata,
    status: document.status,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

export function toDocumentTemplateDto(template: DocumentTemplate) {
  return {
    availableVariables: template.availableVariables,
    blocks: template.blocks,
    category: template.category,
    clauses: template.clauses,
    context: template.context,
    defaultBlocks: template.defaultBlocks,
    defaultClauses: template.defaultClauses,
    defaultTitle: template.defaultTitle,
    description: template.description,
    isCustomized: template.isCustomized,
    kind: template.kind,
    mode: template.mode,
    source: template.source,
    templateKey: template.templateKey,
    title: template.title,
    updatedAt: template.updatedAt?.toISOString() ?? null,
  };
}

export function toDocumentPreviewDto(preview: DocumentPreview) {
  return {
    document: toDocumentWorkspaceDto(preview.document),
    generatedAt: preview.generatedAt.toISOString(),
    sections: preview.sections,
  };
}

export function toDocumentDownloadDto(download: DocumentDownloadDescriptor) {
  return {
    document: toDocumentWorkspaceDto(download.document),
    downloadMethod: download.downloadMethod,
    downloadUrl: download.downloadUrl,
    expiresAt: download.expiresAt.toISOString(),
    fileName: download.fileName,
    mimeType: download.mimeType,
    versionId: download.versionId,
    versionNumber: download.versionNumber,
  };
}

export function toDocumentVersionDto(version: DocumentVersion) {
  return {
    createdAt: version.createdAt.toISOString(),
    file: {
      fileName: version.fileName,
      fileSizeBytes: version.fileSizeBytes,
      mimeType: version.mimeType,
    },
    id: version.id,
    metadata: version.metadata,
    versionNumber: version.versionNumber,
  };
}

export function toDocumentUploadDto(upload: ObjectUpload) {
  return {
    expiresAt: upload.expiresAt.toISOString(),
    publicUrl: upload.publicUrl,
    storageKey: upload.storageKey,
    uploadHeaders: upload.uploadHeaders,
    uploadMethod: upload.uploadMethod,
    uploadUrl: upload.uploadUrl,
  };
}
