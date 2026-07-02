import { and, desc, eq } from "drizzle-orm";
import {
  fiscalDocumentSnapshots,
  fiscalDocuments,
  fiscalEvents,
} from "@lojaveiculosv2/db";
import { FiscalDocumentNotFoundError } from "../../../domains/fiscal/domain/fiscalErrors.js";
import type {
  CreateFiscalDocumentInput,
  CreateFiscalSnapshotInput,
  UpdateFiscalDocumentStatusInput,
} from "../../../domains/fiscal/ports/fiscalRepository.js";
import type { DrizzleFiscalClient } from "./drizzleFiscalRepository.js";
import {
  isIssuedStatus,
  toDocument,
  toOverview,
  toRecord,
} from "./drizzleFiscalRepositoryMappers.js";

export async function createDocument(
  db: DrizzleFiscalClient,
  input: CreateFiscalDocumentInput,
) {
  const [row] = await db
    .insert(fiscalDocuments)
    .values(toInsert(input))
    .returning();
  if (!row) throw new Error("Fiscal document was not created.");
  await insertEvent(db, row.id, input.storeId, input.tenantId, "created", {
    status: input.status,
  });
  return toDocument(row);
}

export async function createDocumentSnapshot(
  db: DrizzleFiscalClient,
  input: CreateFiscalSnapshotInput,
) {
  await db.insert(fiscalDocumentSnapshots).values({
    actorId: input.actorId ?? null,
    fiscalDocumentId: input.fiscalDocumentId,
    providerPayload: input.providerPayload ?? {},
    providerResponse: input.providerResponse ?? {},
    renderedDescription: input.renderedDescription ?? null,
    snapshotType: input.snapshotType,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

export async function getOverview(
  db: DrizzleFiscalClient,
  input: { storeId: string; tenantId: string },
) {
  const [documents, events] = await Promise.all([
    db
      .select()
      .from(fiscalDocuments)
      .where(scopedDocuments(input))
      .orderBy(desc(fiscalDocuments.createdAt))
      .limit(50),
    db
      .select()
      .from(fiscalEvents)
      .where(scopedEvents(input))
      .orderBy(desc(fiscalEvents.occurredAt))
      .limit(50),
  ]);
  return toOverview(input, documents.map(toDocument), events);
}

export async function getDocument(
  db: DrizzleFiscalClient,
  input: { documentId: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(fiscalDocuments)
    .where(scopedDocument(input.documentId, input))
    .limit(1);
  return row ? toDocument(row) : null;
}

export async function updateDocumentStatus(
  db: DrizzleFiscalClient,
  input: UpdateFiscalDocumentStatusInput,
) {
  const [current] = await db
    .select()
    .from(fiscalDocuments)
    .where(scopedDocument(input.documentId, input))
    .limit(1);
  if (!current) throw new FiscalDocumentNotFoundError(input.documentId);

  const [row] = await db
    .update(fiscalDocuments)
    .set({
      ...(input.accessKey !== undefined ? { accessKey: input.accessKey } : {}),
      issuedAt: isIssuedStatus(input.status) ? new Date() : current.issuedAt,
      metadata: { ...toRecord(current.metadata), ...(input.metadata ?? {}) },
      ...(input.providerDocumentId !== undefined
        ? { providerDocumentId: input.providerDocumentId }
        : {}),
      status: input.status,
    })
    .where(scopedDocument(input.documentId, input))
    .returning();
  if (!row) throw new FiscalDocumentNotFoundError(input.documentId);
  await insertEvent(
    db,
    row.id,
    input.storeId,
    input.tenantId,
    "status_changed",
    {
      status: input.status,
    },
  );
  return toDocument(row);
}

function toInsert(input: CreateFiscalDocumentInput) {
  return {
    accessKey: input.accessKey ?? null,
    documentKind: input.documentKind ?? "nfe",
    documentType: input.documentType,
    metadata: input.metadata ?? {},
    provider: "spedy",
    providerDocumentId: input.providerDocumentId ?? null,
    recipientId: input.recipientId ?? null,
    status: input.status,
    storeId: input.storeId,
    templateId: input.templateId ?? null,
    templateVersion: input.templateVersion ?? null,
    tenantId: input.tenantId,
  };
}

function scopedDocuments(input: { storeId: string; tenantId: string }) {
  return and(
    eq(fiscalDocuments.storeId, input.storeId),
    eq(fiscalDocuments.tenantId, input.tenantId),
  );
}

function scopedEvents(input: { storeId: string; tenantId: string }) {
  return and(
    eq(fiscalEvents.storeId, input.storeId),
    eq(fiscalEvents.tenantId, input.tenantId),
  );
}

function scopedDocument(
  documentId: string,
  input: { storeId: string; tenantId: string },
) {
  return and(eq(fiscalDocuments.id, documentId), scopedDocuments(input));
}

async function insertEvent(
  db: DrizzleFiscalClient,
  fiscalDocumentId: string,
  storeId: string,
  tenantId: string,
  eventType: string,
  metadata: Record<string, unknown>,
) {
  await db.insert(fiscalEvents).values({
    eventType,
    fiscalDocumentId,
    metadata,
    occurredAt: new Date(),
    storeId,
    tenantId,
  });
}
