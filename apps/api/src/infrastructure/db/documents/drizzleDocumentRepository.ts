import { and, desc, eq } from "drizzle-orm";
import { documentLinks, documents, documentVersions } from "@lojaveiculosv2/db";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  CreateLinkedDocumentInput,
  DocumentRepository,
  LinkedDocument,
  ListDocumentsInput,
} from "../../../domains/documents/ports/documentRepository.js";
import { DocumentLinkUniquenessConflictError } from "../../../domains/documents/ports/documentRepository.js";
import { isPostgresConstraintError } from "../postgresConstraintError.js";
import { toInsertLink, updateDocumentLink } from "./drizzleDocumentLinks.js";
import { createDrizzleDocumentTemplateMethods } from "./drizzleDocumentTemplates.js";
import {
  createDrizzleDocumentVersionMethods,
  toInsertVersion,
} from "./drizzleDocumentVersions.js";
import {
  createDrizzleDocumentListFilters,
  listDrizzleDocumentWorkspace,
  type DrizzleDocumentClient,
} from "./drizzleDocumentWorkspaceList.js";

type DocumentRow = InferSelectModel<typeof documents>;
type InsertDocumentRow = InferInsertModel<typeof documents>;
type DocumentLinkRow = InferSelectModel<typeof documentLinks>;

export type { DrizzleDocumentClient } from "./drizzleDocumentWorkspaceList.js";

export function createDrizzleDocumentRepository(
  db: DrizzleDocumentClient,
): DocumentRepository {
  return {
    ...createDrizzleDocumentTemplateMethods(db),
    ...createDrizzleDocumentVersionMethods(db),
    async create(input) {
      try {
        const [documentRow] = await db
          .insert(documents)
          .values(toInsertDocument(input))
          .returning();

        if (!documentRow) {
          throw new Error("Drizzle adapter did not return inserted document.");
        }

        const [linkRow] = await db
          .insert(documentLinks)
          .values(toInsertLink(input, documentRow.id))
          .returning();

        if (!linkRow) {
          throw new Error(
            "Drizzle adapter did not return inserted document link.",
          );
        }
        await db
          .insert(documentVersions)
          .values(toInsertVersion({ ...input, documentId: documentRow.id }, 1));

        return toLinkedDocument(documentRow, linkRow);
      } catch (error) {
        if (
          isPostgresConstraintError(error, {
            code: "23505",
            constraintName: "document_links_finance_entry_receipt_unique",
          })
        ) {
          throw new DocumentLinkUniquenessConflictError();
        }
        throw error;
      }
    },
    async findById(input) {
      return findScopedDocument(db, input);
    },
    async list(input) {
      const page = await listDrizzleDocumentWorkspace(db, input);

      return {
        documents: page.rows.map((row) =>
          toLinkedDocument(row.document, row.link),
        ),
        total: page.total,
      };
    },
    async listByTarget(input) {
      const rows = await db
        .select({ document: documents, link: documentLinks })
        .from(documentLinks)
        .innerJoin(documents, eq(documents.id, documentLinks.documentId))
        .where(and(...createDrizzleDocumentListFilters(db, input)))
        .orderBy(desc(documents.uploadedAt));

      return rows.map((row) => toLinkedDocument(row.document, row.link));
    },
    async update(input) {
      await db
        .update(documents)
        .set({
          ...(input.kind ? { kind: input.kind } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.title ? { title: input.title } : {}),
          updatedAt: new Date(),
          ...(input.status === "issued" ? { uploadedAt: new Date() } : {}),
        })
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.storeId, input.storeId),
            eq(documents.tenantId, input.tenantId),
            eq(documents.isDeleted, false),
          ),
        );
      await updateDocumentLink(db, input);
      const document = await findScopedDocument(db, input);
      if (!document) throw new Error(`Document not found: ${input.documentId}`);
      return document;
    },
  };
}

async function findScopedDocument(
  db: DrizzleDocumentClient,
  input: { documentId: string; storeId: string; tenantId: string },
): Promise<LinkedDocument | null> {
  const [row] = await db
    .select({ document: documents, link: documentLinks })
    .from(documentLinks)
    .innerJoin(documents, eq(documents.id, documentLinks.documentId))
    .where(
      and(
        eq(documentLinks.documentId, input.documentId),
        eq(documentLinks.storeId, input.storeId),
        eq(documentLinks.tenantId, input.tenantId),
        eq(documents.id, input.documentId),
        eq(documents.storeId, input.storeId),
        eq(documents.tenantId, input.tenantId),
        eq(documents.isDeleted, false),
      ),
    )
    .limit(1);

  return row ? toLinkedDocument(row.document, row.link) : null;
}

function toInsertDocument(input: CreateLinkedDocumentInput): InsertDocumentRow {
  return {
    createdByUserId: input.createdByUserId,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    kind: input.kind,
    metadata: input.metadata ?? {},
    mimeType: input.mimeType,
    status: input.status,
    storageKey: input.storageKey,
    storeId: input.storeId,
    tenantId: input.tenantId,
    title: input.title,
  };
}

function toLinkedDocument(
  document: DocumentRow,
  link: DocumentLinkRow,
): LinkedDocument {
  return {
    createdAt: document.createdAt,
    fileName: document.fileName,
    fileSizeBytes: document.fileSizeBytes,
    id: document.id,
    kind: document.kind,
    linkRole: link.linkRole,
    metadata: isRecord(document.metadata) ? document.metadata : {},
    mimeType: document.mimeType,
    status: document.status,
    storageKey: document.storageKey,
    storeId: document.storeId,
    targetId: link.targetId,
    targetType: link.targetType,
    tenantId: document.tenantId,
    title: document.title,
    updatedAt: document.updatedAt,
    uploadedAt: document.uploadedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
