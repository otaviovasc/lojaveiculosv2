import { and, desc, eq, ilike, or } from "drizzle-orm";
import { documentLinks, documents, documentVersions } from "@lojaveiculosv2/db";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CreateLinkedDocumentInput,
  DocumentRepository,
  LinkedDocument,
  ListDocumentsInput,
} from "../../../domains/documents/ports/documentRepository.js";
import { createDrizzleDocumentTemplateMethods } from "./drizzleDocumentTemplates.js";
import {
  createDrizzleDocumentVersionMethods,
  toInsertVersion,
} from "./drizzleDocumentVersions.js";

type DocumentRow = InferSelectModel<typeof documents>;
type InsertDocumentRow = InferInsertModel<typeof documents>;
type DocumentLinkRow = InferSelectModel<typeof documentLinks>;
type InsertDocumentLinkRow = InferInsertModel<typeof documentLinks>;

export type DrizzleDocumentClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleDocumentRepository(
  db: DrizzleDocumentClient,
): DocumentRepository {
  return {
    ...createDrizzleDocumentTemplateMethods(db),
    ...createDrizzleDocumentVersionMethods(db),
    async create(input) {
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
    },
    async findById(input) {
      return findScopedDocument(db, input);
    },
    async list(input) {
      const rows = await db
        .select({ document: documents, link: documentLinks })
        .from(documentLinks)
        .innerJoin(documents, eq(documents.id, documentLinks.documentId))
        .where(and(...listDocumentFilters(input)))
        .orderBy(desc(documents.uploadedAt))
        .limit(input.limit ?? 100);

      return rows.map((row) => toLinkedDocument(row.document, row.link));
    },
    async listByTarget(input) {
      const linkRows = await db
        .select()
        .from(documentLinks)
        .where(
          and(
            eq(documentLinks.storeId, input.storeId),
            eq(documentLinks.targetId, input.targetId),
            eq(documentLinks.targetType, input.targetType),
            eq(documentLinks.tenantId, input.tenantId),
          ),
        );

      if (!linkRows.length) return [];

      const rows = await Promise.all(
        linkRows.map(async (link) => {
          const [documentRow] = await db
            .select()
            .from(documents)
            .where(
              and(
                eq(documents.id, link.documentId),
                eq(documents.storeId, input.storeId),
                eq(documents.tenantId, input.tenantId),
                eq(documents.isDeleted, false),
              ),
            );
          return documentRow ? toLinkedDocument(documentRow, link) : null;
        }),
      );

      return rows.filter((row): row is LinkedDocument => Boolean(row));
    },
    async update(input) {
      await db
        .update(documents)
        .set({
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

function listDocumentFilters(input: ListDocumentsInput) {
  return [
    eq(documentLinks.storeId, input.storeId),
    eq(documentLinks.tenantId, input.tenantId),
    eq(documents.storeId, input.storeId),
    eq(documents.tenantId, input.tenantId),
    eq(documents.isDeleted, false),
    ...(input.targetId ? [eq(documentLinks.targetId, input.targetId)] : []),
    ...(input.targetType
      ? [eq(documentLinks.targetType, input.targetType)]
      : []),
    ...(input.kind ? [eq(documents.kind, input.kind)] : []),
    ...(input.status ? [eq(documents.status, input.status)] : []),
    ...(input.search
      ? [
          or(
            ilike(documents.title, `%${input.search}%`),
            ilike(documents.fileName, `%${input.search}%`),
          ),
        ]
      : []),
  ];
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

function toInsertLink(
  input: CreateLinkedDocumentInput,
  documentId: string,
): InsertDocumentLinkRow {
  return {
    documentId,
    linkRole: input.linkRole,
    storeId: input.storeId,
    targetId: input.targetId,
    targetType: input.targetType,
    tenantId: input.tenantId,
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
