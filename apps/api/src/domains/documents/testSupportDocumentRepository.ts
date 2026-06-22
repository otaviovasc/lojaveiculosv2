import type {
  CreateLinkedDocumentInput,
  CreateDocumentVersionInput,
  DocumentKind,
  DocumentRepository,
  DocumentTemplate,
  DocumentVersion,
  LinkedDocument,
  ListDocumentsInput,
  ListLinkedDocumentsInput,
  UpdateLinkedDocumentInput,
  UpsertDocumentTemplateInput,
} from "./ports/documentRepository.js";
import {
  defaultTemplate,
  listDefaultDocumentTemplates,
  mergeDocumentTemplate,
} from "./templates/documentTemplateDefaults.js";

export type TestDocumentRepository = DocumentRepository & {
  documents: LinkedDocument[];
};

export function createTestDocumentRepository(): TestDocumentRepository {
  const documents: LinkedDocument[] = [];
  const versions: DocumentVersion[] = [];
  const templates = new Map<string, DocumentTemplate>();

  return {
    documents,
    async create(input: CreateLinkedDocumentInput) {
      const now = new Date();
      const document: LinkedDocument = {
        ...input,
        createdAt: now,
        id: `document_${documents.length + 1}`,
        metadata: input.metadata ?? {},
        updatedAt: now,
        uploadedAt: now,
      };
      documents.push(document);
      versions.push(
        createVersionRecord(input, document.id, 1, versions.length),
      );
      return document;
    },
    async createVersion(input: CreateDocumentVersionInput) {
      const existing = versions.filter(
        (version) =>
          version.documentId === input.documentId &&
          version.storeId === input.storeId &&
          version.tenantId === input.tenantId,
      );
      const version = createVersionRecord(
        input,
        input.documentId,
        existing.length + 1,
        versions.length,
      );
      versions.push(version);
      const document = findDocument(documents, input);
      if (document) {
        document.fileName = input.fileName;
        document.fileSizeBytes = input.fileSizeBytes;
        document.mimeType = input.mimeType;
        document.storageKey = input.storageKey;
        document.updatedAt = version.createdAt;
        document.uploadedAt = version.createdAt;
      }
      return version;
    },
    async findById(input) {
      return findDocument(documents, input) ?? null;
    },
    async list(input: ListDocumentsInput) {
      const search = input.search?.trim().toLowerCase();
      return documents
        .filter(
          (document) =>
            document.storeId === input.storeId &&
            document.tenantId === input.tenantId &&
            (!input.kind || document.kind === input.kind) &&
            (!input.status || document.status === input.status) &&
            (!input.targetId || document.targetId === input.targetId) &&
            (!input.targetType || document.targetType === input.targetType) &&
            (!search ||
              document.title.toLowerCase().includes(search) ||
              document.fileName.toLowerCase().includes(search)),
        )
        .sort(
          (left, right) =>
            right.uploadedAt.getTime() - left.uploadedAt.getTime(),
        )
        .slice(0, input.limit ?? 100);
    },
    async listByTarget(input: ListLinkedDocumentsInput) {
      return documents.filter(
        (document) =>
          document.storeId === input.storeId &&
          document.targetId === input.targetId &&
          document.targetType === input.targetType &&
          document.tenantId === input.tenantId,
      );
    },
    async listVersions(input) {
      return versions
        .filter(
          (version) =>
            version.documentId === input.documentId &&
            (!input.versionId || version.id === input.versionId) &&
            version.storeId === input.storeId &&
            version.tenantId === input.tenantId,
        )
        .sort((left, right) => right.versionNumber - left.versionNumber);
    },
    async findTemplate(input) {
      return templates.get(templateKey(input)) ?? defaultTemplate(input.kind);
    },
    async listTemplates(input) {
      return listDefaultDocumentTemplates().map(
        (template) =>
          templates.get(templateKey({ ...input, kind: template.kind })) ??
          template,
      );
    },
    async upsertTemplate(input: UpsertDocumentTemplateInput) {
      const template = mergeDocumentTemplate(input.kind, {
        clauses: input.clauses,
        title: input.title,
        updatedAt: new Date(),
      });
      if (!template) {
        throw new Error(`Unsupported document template: ${input.kind}`);
      }
      templates.set(templateKey(input), template);
      return template;
    },
    async update(input: UpdateLinkedDocumentInput) {
      const document = findDocument(documents, input);
      if (!document) throw new Error(`Document not found: ${input.documentId}`);
      if (input.kind) document.kind = input.kind;
      if (input.metadata) document.metadata = input.metadata;
      if (input.status) document.status = input.status;
      if (input.title) document.title = input.title;
      document.updatedAt = new Date();
      if (input.status === "issued") document.uploadedAt = document.updatedAt;
      return document;
    },
  };
}

function createVersionRecord(
  input: CreateDocumentVersionInput | CreateLinkedDocumentInput,
  documentId: string,
  versionNumber: number,
  index: number,
): DocumentVersion {
  const now = new Date();
  return {
    createdAt: now,
    createdByUserId: input.createdByUserId,
    documentId,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    id: `document_version_${index + 1}`,
    metadata: input.metadata ?? {},
    mimeType: input.mimeType,
    storageKey: input.storageKey,
    storeId: input.storeId,
    tenantId: input.tenantId,
    versionNumber,
  };
}

function findDocument(
  documents: LinkedDocument[],
  input: { documentId: string; storeId: string; tenantId: string },
) {
  return documents.find(
    (document) =>
      document.id === input.documentId &&
      document.storeId === input.storeId &&
      document.tenantId === input.tenantId,
  );
}

function templateKey(input: {
  kind: DocumentKind;
  storeId: string;
  tenantId: string;
}) {
  return `${input.tenantId}:${input.storeId}:${input.kind}`;
}
