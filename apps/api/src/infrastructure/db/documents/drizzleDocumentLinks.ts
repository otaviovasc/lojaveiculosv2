import { and, eq } from "drizzle-orm";
import { documentLinks } from "@lojaveiculosv2/db";
import type { InferInsertModel } from "drizzle-orm";
import type {
  CreateLinkedDocumentInput,
  UpdateLinkedDocumentInput,
} from "../../../domains/documents/ports/documentRepository.js";
import type { DrizzleDocumentClient } from "./drizzleDocumentRepository.js";

type InsertDocumentLinkRow = InferInsertModel<typeof documentLinks>;

export function toInsertLink(
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

export async function updateDocumentLink(
  db: DrizzleDocumentClient,
  input: UpdateLinkedDocumentInput,
) {
  if (!input.linkRole && !input.targetId && !input.targetType) return;
  await db
    .update(documentLinks)
    .set({
      ...(input.linkRole ? { linkRole: input.linkRole } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.targetType ? { targetType: input.targetType } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentLinks.documentId, input.documentId),
        eq(documentLinks.storeId, input.storeId),
        eq(documentLinks.tenantId, input.tenantId),
      ),
    );
}
