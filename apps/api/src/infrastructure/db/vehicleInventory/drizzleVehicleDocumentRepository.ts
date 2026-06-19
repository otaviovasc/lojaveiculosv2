import { and, eq, inArray } from "drizzle-orm";
import { documentLinks, documents } from "@lojaveiculosv2/db";
import type {
  CreateVehicleDocumentRecord,
  ListVehicleDocumentsInput,
  VehicleDocument,
  VehicleDocumentRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  VehicleInventoryDrizzleScopeError,
  type InsertDocumentLinkRow,
  type InsertDocumentRow,
  type VehicleDocumentLinkRow,
  type VehicleDocumentRow,
} from "./drizzleVehicleInventoryMappers.js";

export type DrizzleVehicleDocumentClient = DrizzleRepositoryClient<
  VehicleDocumentRow,
  InsertDocumentRow,
  Partial<InsertDocumentRow>
> &
  DrizzleRepositoryClient<
    VehicleDocumentLinkRow,
    InsertDocumentLinkRow,
    Partial<InsertDocumentLinkRow>
  >;

export function createDrizzleVehicleDocumentRepository(
  db: DrizzleVehicleDocumentClient,
): VehicleDocumentRepository {
  const documentDb = db as DrizzleRepositoryClient<
    VehicleDocumentRow,
    InsertDocumentRow,
    Partial<InsertDocumentRow>
  >;
  const linkDb = db as DrizzleRepositoryClient<
    VehicleDocumentLinkRow,
    InsertDocumentLinkRow,
    Partial<InsertDocumentLinkRow>
  >;

  return {
    async create(record) {
      const scope = requireWriteScope(record);
      const [documentRow] = await documentDb
        .insert(documents)
        .values({
          createdByUserId: record.createdByUserId,
          fileName: record.fileName,
          fileSizeBytes: record.fileSizeBytes,
          kind: record.kind,
          metadata: record.metadata ?? {},
          mimeType: record.mimeType,
          status: record.status,
          storageKey: record.storageKey,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          title: record.title,
        })
        .returning();

      if (!documentRow) {
        throw new Error("Drizzle adapter did not return inserted document.");
      }

      const [linkRow] = await linkDb
        .insert(documentLinks)
        .values({
          documentId: documentRow.id,
          linkRole: record.linkRole,
          storeId: scope.storeId,
          targetId: record.targetId,
          targetType: record.targetType,
          tenantId: scope.tenantId,
        })
        .returning();

      if (!linkRow) {
        throw new Error(
          "Drizzle adapter did not return inserted document link.",
        );
      }

      return toVehicleDocument(documentRow, linkRow);
    },
    async listByListing(input) {
      const scope = requireWriteScope(input);
      const targetIds = [input.listingId, ...input.unitIds];
      if (targetIds.length === 0) return [];
      const linkRows = await linkDb
        .select()
        .from(documentLinks)
        .where(
          and(
            inArray(documentLinks.targetId, targetIds),
            eq(documentLinks.storeId, scope.storeId),
            eq(documentLinks.tenantId, scope.tenantId),
          ),
        );
      if (linkRows.length === 0) return [];
      const rows = await documentDb
        .select()
        .from(documents)
        .where(
          and(
            inArray(
              documents.id,
              linkRows.map((link) => link.documentId),
            ),
            eq(documents.storeId, scope.storeId),
            eq(documents.tenantId, scope.tenantId),
            eq(documents.isDeleted, false),
          ),
        );

      return rows.flatMap((row) => {
        const link = linkRows.find((item) => item.documentId === row.id);
        return link ? [toVehicleDocument(row, link)] : [];
      });
    },
  };
}

function toVehicleDocument(
  document: VehicleDocumentRow,
  link: VehicleDocumentLinkRow,
): VehicleDocument {
  if (
    link.targetType !== "vehicle_listing" &&
    link.targetType !== "vehicle_unit"
  ) {
    throw new Error(
      `Unsupported vehicle document target type: ${link.targetType}`,
    );
  }

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

function requireWriteScope(record: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!record.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!record.tenantId) throw new VehicleInventoryDrizzleScopeError("tenantId");

  return { storeId: record.storeId, tenantId: record.tenantId };
}
