import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import type { DrizzleDocumentClient } from "../../../infrastructure/db/documents/drizzleDocumentRepository.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentTemplate } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentDownloadDescriptor } from "../../../domains/documents/services/DocumentOperationService/downloadDocument.js";
import type { DocumentVersion } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentPreview } from "../../../domains/documents/preview/documentPreview.js";
import type { DocumentWorkspaceServicePorts } from "../../../domains/documents/services/DocumentWorkspaceService/serviceSupport.js";
import type { ListDocumentWorkspaceInput } from "../../../domains/documents/services/DocumentWorkspaceService/listDocumentWorkspace.js";
import { listDocumentWorkspace } from "../../../domains/documents/services/DocumentWorkspaceService/listDocumentWorkspace.js";
import { listDocumentTemplates } from "../../../domains/documents/services/DocumentTemplateService/listDocumentTemplates.js";
import {
  updateDocumentTemplate,
  type UpdateDocumentTemplateInput,
} from "../../../domains/documents/services/DocumentTemplateService/updateDocumentTemplate.js";
import { previewDocument } from "../../../domains/documents/services/DocumentOperationService/previewDocument.js";
import { downloadDocument } from "../../../domains/documents/services/DocumentOperationService/downloadDocument.js";
import { listDocumentVersions } from "../../../domains/documents/services/DocumentOperationService/listDocumentVersions.js";
import { regenerateDocument } from "../../../domains/documents/services/DocumentOperationService/regenerateDocument.js";
import { voidDocument } from "../../../domains/documents/services/DocumentOperationService/voidDocument.js";
import {
  createUploadedDocument,
  type CreateUploadedDocumentInput,
} from "../../../domains/documents/services/DocumentOperationService/createUploadedDocument.js";
import {
  requestDocumentUpload,
  type RequestDocumentUploadInput,
} from "../../../domains/documents/services/DocumentOperationService/requestDocumentUpload.js";
import {
  updateDocumentMetadata,
  type UpdateDocumentMetadataInput,
} from "../../../domains/documents/services/DocumentOperationService/updateDocumentMetadata.js";
import { createDrizzleDocumentLinkTargetValidator } from "../../../infrastructure/db/documents/drizzleDocumentLinkTargets.js";
import { createDrizzleDocumentRepository } from "../../../infrastructure/db/documents/drizzleDocumentRepository.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import { createMemoryDocumentRepository } from "../adapters/memoryDocumentRepository.js";
import type { ObjectUpload } from "../../../shared/storage/objectStorage.js";

export type DocumentServices = {
  createUploaded: (
    context: ServiceContext,
    input: CreateUploadedDocumentInput,
  ) => Promise<LinkedDocument>;
  download: (
    context: ServiceContext,
    input: { documentId: string; versionId?: string | undefined },
  ) => Promise<DocumentDownloadDescriptor>;
  listVersions: (
    context: ServiceContext,
    input: { documentId: string },
  ) => Promise<readonly DocumentVersion[]>;
  listWorkspace: (
    context: ServiceContext,
    input: ListDocumentWorkspaceInput,
  ) => Promise<readonly LinkedDocument[]>;
  listTemplates: (
    context: ServiceContext,
  ) => Promise<readonly DocumentTemplate[]>;
  preview: (
    context: ServiceContext,
    input: { documentId: string },
  ) => Promise<DocumentPreview>;
  regenerate: (
    context: ServiceContext,
    input: { documentId: string },
  ) => Promise<LinkedDocument>;
  requestUpload: (
    context: ServiceContext,
    input: RequestDocumentUploadInput,
  ) => Promise<ObjectUpload>;
  updateDocument: (
    context: ServiceContext,
    input: UpdateDocumentMetadataInput,
  ) => Promise<LinkedDocument>;
  updateTemplate: (
    context: ServiceContext,
    input: UpdateDocumentTemplateInput,
  ) => Promise<DocumentTemplate>;
  void: (
    context: ServiceContext,
    input: { documentId: string; reason?: string | undefined },
  ) => Promise<LinkedDocument>;
};

export type CreateDocumentServicesOptions =
  | {
      drizzleClient?: never;
      objectStorage?: never;
      ports?: DocumentWorkspaceServicePorts;
    }
  | {
      drizzleClient: DrizzleDocumentClient;
      objectStorage?: ObjectStorage;
      ports?: never;
    };

export function createDocumentServices(
  options: CreateDocumentServicesOptions = {},
): DocumentServices {
  const ports = resolveDocumentPorts(options);

  return {
    createUploaded: (context, input) =>
      createUploadedDocument(context, input, ports),
    download: (context, input) => downloadDocument(context, input, ports),
    listVersions: (context, input) =>
      listDocumentVersions(context, input, ports),
    listWorkspace: (context, input) =>
      listDocumentWorkspace(context, input, ports),
    listTemplates: (context) => listDocumentTemplates(context, ports),
    preview: (context, input) => previewDocument(context, input, ports),
    regenerate: (context, input) => regenerateDocument(context, input, ports),
    requestUpload: (context, input) =>
      requestDocumentUpload(context, input, ports),
    updateDocument: (context, input) =>
      updateDocumentMetadata(context, input, ports),
    updateTemplate: (context, input) =>
      updateDocumentTemplate(context, input, ports),
    void: (context, input) => voidDocument(context, input, ports),
  };
}

function resolveDocumentPorts(
  options: CreateDocumentServicesOptions,
): DocumentWorkspaceServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    return {
      documentRepository: createDrizzleDocumentRepository(
        options.drizzleClient,
      ),
      linkTargetValidator: createDrizzleDocumentLinkTargetValidator(
        options.drizzleClient,
      ),
      ...(options.objectStorage
        ? { objectStorage: options.objectStorage }
        : {}),
    };
  }

  return {
    documentRepository: createMemoryDocumentRepository(),
    objectStorage: createMemoryObjectStorage(),
  };
}

export const documentServices = createDocumentServices();
