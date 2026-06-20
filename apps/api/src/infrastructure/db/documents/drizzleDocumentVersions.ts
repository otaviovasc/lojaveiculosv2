import { and, desc, eq } from "drizzle-orm";
import { documentVersions, documents } from "@lojaveiculosv2/db";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  CreateDocumentVersionInput,
  DocumentVersion,
} from "../../../domains/documents/ports/documentRepository.js";
import type { DrizzleDocumentClient } from "./drizzleDocumentRepository.js";

type VersionRow = InferSelectModel<typeof documentVersions>;
type InsertVersionRow = InferInsertModel<typeof documentVersions>;

export function createDrizzleDocumentVersionMethods(db: DrizzleDocumentClient) {
  return {
    async createVersion(input: CreateDocumentVersionInput) {
      const versionNumber = await nextVersionNumber(db, input);
      const [row] = await db
        .insert(documentVersions)
        .values(toInsertVersion(input, versionNumber))
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return version.");
      await db
        .update(documents)
        .set({
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
          mimeType: input.mimeType,
          storageKey: input.storageKey,
          updatedAt: row.createdAt,
          uploadedAt: row.createdAt,
        })
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.storeId, input.storeId),
            eq(documents.tenantId, input.tenantId),
          ),
        );
      return toDocumentVersion(row);
    },
    async listVersions(input: {
      documentId: string;
      versionId?: string | undefined;
      storeId: string;
      tenantId: string;
    }) {
      const rows = await db
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(documentVersions.documentId, input.documentId),
            ...(input.versionId
              ? [eq(documentVersions.id, input.versionId)]
              : []),
            eq(documentVersions.storeId, input.storeId),
            eq(documentVersions.tenantId, input.tenantId),
          ),
        )
        .orderBy(desc(documentVersions.versionNumber));
      return rows.map(toDocumentVersion);
    },
  };
}

async function nextVersionNumber(
  db: DrizzleDocumentClient,
  input: Pick<
    CreateDocumentVersionInput,
    "documentId" | "storeId" | "tenantId"
  >,
) {
  const [latest] = await db
    .select({ versionNumber: documentVersions.versionNumber })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, input.documentId),
        eq(documentVersions.storeId, input.storeId),
        eq(documentVersions.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(documentVersions.versionNumber))
    .limit(1);
  return (latest?.versionNumber ?? 0) + 1;
}

export function toInsertVersion(
  input: CreateDocumentVersionInput,
  versionNumber: number,
): InsertVersionRow {
  return {
    createdByUserId: input.createdByUserId,
    documentId: input.documentId,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    metadata: input.metadata ?? {},
    mimeType: input.mimeType,
    storageKey: input.storageKey,
    storeId: input.storeId,
    tenantId: input.tenantId,
    versionNumber,
  };
}

function toDocumentVersion(row: VersionRow): DocumentVersion {
  return {
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId,
    documentId: row.documentId,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    mimeType: row.mimeType,
    storageKey: row.storageKey,
    storeId: row.storeId,
    tenantId: row.tenantId,
    versionNumber: row.versionNumber,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
