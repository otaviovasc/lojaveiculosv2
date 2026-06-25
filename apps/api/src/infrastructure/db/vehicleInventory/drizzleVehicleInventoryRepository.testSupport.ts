import {
  documentLinks,
  documents,
  documentVersions,
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { DrizzleVehicleInventoryClient } from "./drizzleVehicleInventoryRepository.js";
import type {
  UpdateVehicleListingRow,
  UpdateVehicleUnitRow,
  VehicleDocumentLinkRow,
  VehicleDocumentRow,
  VehicleListingRow,
  VehicleMediaRow,
  VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";
import {
  createRows,
  type DocumentVersionRow,
  type InsertRecord,
  type StoredRows,
  type UpdateRecord,
} from "./drizzleVehicleInventoryRepository.testRows.js";

export { createRows } from "./drizzleVehicleInventoryRepository.testRows.js";

export function createFakeDb(initialRows: Partial<StoredRows> = {}) {
  const rows: StoredRows = {
    documentLinks: initialRows.documentLinks ?? [],
    documentVersions: initialRows.documentVersions ?? [],
    documents: initialRows.documents ?? [],
    listings: initialRows.listings ?? [],
    media: initialRows.media ?? [],
    units: initialRows.units ?? [],
  };
  const inserted: InsertRecord[] = [];
  const updated: UpdateRecord[] = [];
  const rowFactory = createRows();

  const db = {
    inserted,
    updated,
    insert(table: unknown) {
      return {
        values(record: InsertRecord) {
          inserted.push(record);
          return {
            async returning() {
              if (table === vehicleListings) {
                const row = {
                  ...rowFactory.listing(),
                  ...(record as Partial<VehicleListingRow>),
                  id: `listing_${rows.listings.length + 1}`,
                };
                rows.listings.push(row);
                return [row];
              }

              if (table === vehicleMedia) {
                const row = {
                  ...rowFactory.media(),
                  ...(record as Partial<VehicleMediaRow>),
                  id: `media_${rows.media.length + 1}`,
                };
                rows.media.push(row);
                return [row];
              }

              if (table === documents) {
                const row = {
                  ...rowFactory.document(),
                  ...(record as Partial<VehicleDocumentRow>),
                  id: `document_${rows.documents.length + 1}`,
                };
                rows.documents.push(row);
                return [row];
              }

              if (table === documentLinks) {
                const row = {
                  ...rowFactory.documentLink(),
                  ...(record as Partial<VehicleDocumentLinkRow>),
                  id: `document_link_${rows.documentLinks.length + 1}`,
                };
                rows.documentLinks.push(row);
                return [row];
              }

              if (table === documentVersions) {
                const row = {
                  ...rowFactory.documentVersion(),
                  ...(record as Partial<DocumentVersionRow>),
                  id: `document_version_${rows.documentVersions.length + 1}`,
                };
                rows.documentVersions.push(row);
                return [row];
              }

              const row = {
                ...rowFactory.unit(),
                ...(record as Partial<VehicleUnitRow>),
                id: `unit_${rows.units.length + 1}`,
              };
              rows.units.push(row);
              return [row];
            },
          };
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          return {
            async where() {
              if (table === vehicleListings) return rows.listings;
              if (table === vehicleMedia) return rows.media;
              if (table === documents) return rows.documents;
              if (table === documentLinks) return rows.documentLinks;
              if (table === documentVersions) return rows.documentVersions;
              return rows.units;
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(record: UpdateRecord) {
          updated.push(record);
          return {
            where() {
              return {
                async returning() {
                  if (table === vehicleListings) {
                    return updateFirst(
                      rows.listings,
                      record as UpdateVehicleListingRow,
                    );
                  }

                  return updateFirst(
                    rows.units,
                    record as UpdateVehicleUnitRow,
                  );
                },
              };
            },
          };
        },
      };
    },
  };

  return db as typeof db & DrizzleVehicleInventoryClient;
}

function updateFirst<Row>(rows: Row[], record: Partial<Row>): readonly Row[] {
  const current = rows[0];
  if (!current) return [];

  const row = {
    ...current,
    ...record,
  };
  rows[0] = row;
  return [row];
}
