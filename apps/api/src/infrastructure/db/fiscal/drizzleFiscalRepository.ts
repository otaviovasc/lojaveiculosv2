import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { fiscalDocuments, fiscalEvents } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CreateFiscalDocumentInput,
  FiscalDocument,
  FiscalOverview,
  FiscalRepository,
  UpdateFiscalDocumentStatusInput,
} from "../../../domains/fiscal/ports/fiscalRepository.js";

export type DrizzleFiscalClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleFiscalRepository(
  db: DrizzleFiscalClient,
): FiscalRepository {
  return {
    async createDocument(input) {
      const [row] = await db
        .insert(fiscalDocuments)
        .values(toInsert(input))
        .returning();
      if (!row) throw new Error("Fiscal document was not created.");
      await insertEvent(db, row.id, input.storeId, input.tenantId, "created", {
        status: input.status,
      });
      return toDocument(row);
    },
    async getOverview(input) {
      const [documents, events] = await Promise.all([
        db
          .select()
          .from(fiscalDocuments)
          .where(scoped(input))
          .orderBy(desc(fiscalDocuments.createdAt))
          .limit(50),
        db
          .select()
          .from(fiscalEvents)
          .where(scoped(input))
          .orderBy(desc(fiscalEvents.occurredAt))
          .limit(50),
      ]);
      return toOverview(input, documents.map(toDocument), events);
    },
    async updateDocumentStatus(input) {
      const [row] = await db
        .update(fiscalDocuments)
        .set({
          ...(input.accessKey !== undefined
            ? { accessKey: input.accessKey }
            : {}),
          metadata: input.metadata ?? {},
          ...(input.providerDocumentId !== undefined
            ? { providerDocumentId: input.providerDocumentId }
            : {}),
          status: input.status,
        })
        .where(
          and(
            eq(fiscalDocuments.id, input.documentId),
            eq(fiscalDocuments.storeId, input.storeId),
            eq(fiscalDocuments.tenantId, input.tenantId),
          ),
        )
        .returning();
      if (!row)
        throw new Error(`Fiscal document not found: ${input.documentId}`);
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
    },
  };
}

function toInsert(input: CreateFiscalDocumentInput) {
  return {
    accessKey: input.accessKey ?? null,
    documentType: input.documentType,
    metadata: input.metadata ?? {},
    provider: "spedy",
    providerDocumentId: input.providerDocumentId ?? null,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
}

function scoped(input: { storeId: string; tenantId: string }) {
  return and(
    eq(fiscalDocuments.storeId, input.storeId),
    eq(fiscalDocuments.tenantId, input.tenantId),
  );
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

function toDocument(row: typeof fiscalDocuments.$inferSelect): FiscalDocument {
  return {
    accessKey: row.accessKey,
    createdAt: row.createdAt,
    documentType: row.documentType,
    id: row.id,
    issuedAt: row.issuedAt,
    metadata: toRecord(row.metadata),
    provider: "spedy",
    providerDocumentId: row.providerDocumentId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
  };
}

function toOverview(
  input: { storeId: string; tenantId: string },
  documents: FiscalDocument[],
  events: (typeof fiscalEvents.$inferSelect)[],
): FiscalOverview {
  return {
    documents,
    events: events.map((event) => ({
      createdAt: event.createdAt,
      eventType: event.eventType,
      fiscalDocumentId: event.fiscalDocumentId,
      id: event.id,
      metadata: toRecord(event.metadata),
      occurredAt: event.occurredAt,
    })),
    provider: {
      configured: false,
      missingConfiguration: ["SPEDY_HTTP_GATEWAY"],
      provider: "spedy",
      webhookConfigured: false,
    },
    storeId: input.storeId,
    summary: {
      cancelled: documents.filter((document) => document.status === "cancelled")
        .length,
      failed: documents.filter((document) => document.status === "failed")
        .length,
      issued: documents.filter((document) => document.status === "issued")
        .length,
      pending: documents.filter((document) => document.status === "draft")
        .length,
    },
    tenantId: input.tenantId,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
