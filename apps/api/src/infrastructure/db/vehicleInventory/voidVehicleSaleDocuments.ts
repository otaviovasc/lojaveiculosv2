import { and, eq, inArray } from "drizzle-orm";
import { documentLinks, documents } from "@lojaveiculosv2/db";
import { appendVehicleDocumentVoidHistory } from "../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import type { VoidVehicleDocumentsBySaleInput } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import type { DrizzleVehicleDocumentClient } from "./drizzleVehicleDocumentRepository.js";
import type {
  InsertDocumentLinkRow,
  InsertDocumentRow,
  VehicleDocumentLinkRow,
  VehicleDocumentRow,
} from "./drizzleVehicleInventoryMappers.js";
import { VehicleInventoryDrizzleScopeError } from "./drizzleVehicleInventoryScope.js";

export async function voidVehicleSaleDocuments(
  db: DrizzleVehicleDocumentClient,
  input: VoidVehicleDocumentsBySaleInput,
): Promise<{
  linkRows: readonly VehicleDocumentLinkRow[];
  rows: readonly VehicleDocumentRow[];
}> {
  const scope = requireScope(input);
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
  const linkRows = await linkDb
    .select()
    .from(documentLinks)
    .where(
      and(
        eq(documentLinks.targetId, input.unitId),
        eq(documentLinks.targetType, "vehicle_unit"),
        eq(documentLinks.storeId, scope.storeId),
        eq(documentLinks.tenantId, scope.tenantId),
      ),
    );
  if (!linkRows.length) return { linkRows, rows: [] };
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
  const ownedRows = rows.filter(
    (row) => isRecord(row.metadata) && row.metadata.saleId === input.saleId,
  );
  const updatedRows: VehicleDocumentRow[] = [];
  for (const row of ownedRows) {
    if (row.status === "voided") {
      updatedRows.push(row);
      continue;
    }
    const [updatedRow] = await documentDb
      .update(documents)
      .set({
        metadata: appendVehicleDocumentVoidHistory(
          isRecord(row.metadata) ? row.metadata : {},
          input,
        ),
        status: "voided",
        updatedAt: input.at,
      })
      .where(
        and(
          eq(documents.id, row.id),
          eq(documents.storeId, scope.storeId),
          eq(documents.tenantId, scope.tenantId),
          eq(documents.isDeleted, false),
        ),
      )
      .returning();
    if (updatedRow) updatedRows.push(updatedRow);
  }
  return { linkRows, rows: updatedRows };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireScope(input: {
  storeId: string | null;
  tenantId: string | null;
}) {
  if (!input.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!input.tenantId) {
    throw new VehicleInventoryDrizzleScopeError("tenantId");
  }
  return { storeId: input.storeId, tenantId: input.tenantId };
}
