import { and, eq } from "drizzle-orm";
import { documentLinks, documents } from "@lojaveiculosv2/db";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CreateLinkedDocumentInput,
  DocumentRepository,
  LinkedDocument,
} from "../../../domains/documents/ports/documentRepository.js";

type DocumentRow = InferSelectModel<typeof documents>;
type InsertDocumentRow = InferInsertModel<typeof documents>;
type DocumentLinkRow = InferSelectModel<typeof documentLinks>;
type InsertDocumentLinkRow = InferInsertModel<typeof documentLinks>;

export type DrizzleDocumentClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleDocumentRepository(
  db: DrizzleDocumentClient,
): DocumentRepository {
  return {
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

      return toLinkedDocument(documentRow, linkRow);
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
  };
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
