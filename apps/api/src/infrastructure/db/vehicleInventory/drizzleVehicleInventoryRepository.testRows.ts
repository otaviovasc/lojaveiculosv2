import type { documentVersions, vehicleChecklists } from "@lojaveiculosv2/db";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  InsertDocumentLinkRow,
  InsertDocumentRow,
  InsertVehicleListingRow,
  InsertVehicleMediaRow,
  InsertVehicleUnitRow,
  UpdateVehicleListingRow,
  UpdateVehicleUnitRow,
  VehicleDocumentLinkRow,
  VehicleDocumentRow,
  VehicleListingRow,
  VehicleMediaRow,
  VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";

export type DocumentVersionRow = InferSelectModel<typeof documentVersions>;
export type InsertDocumentVersionRow = InferInsertModel<
  typeof documentVersions
>;
export type VehicleChecklistRow = InferSelectModel<typeof vehicleChecklists>;
export type InsertVehicleChecklistRow = InferInsertModel<
  typeof vehicleChecklists
>;

export type InsertRecord =
  | InsertDocumentLinkRow
  | InsertDocumentRow
  | InsertDocumentVersionRow
  | InsertVehicleChecklistRow
  | InsertVehicleListingRow
  | InsertVehicleMediaRow
  | InsertVehicleUnitRow;

export type UpdateRecord =
  | Partial<VehicleChecklistRow>
  | UpdateVehicleListingRow
  | UpdateVehicleUnitRow;

export type StoredRows = {
  checklists: VehicleChecklistRow[];
  documentLinks: VehicleDocumentLinkRow[];
  documentVersions: DocumentVersionRow[];
  documents: VehicleDocumentRow[];
  listings: VehicleListingRow[];
  media: VehicleMediaRow[];
  units: VehicleUnitRow[];
};

export function createRows() {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    checklist(
      overrides: Partial<VehicleChecklistRow> = {},
    ): VehicleChecklistRow {
      return {
        completedAt: null,
        completedByUserId: null,
        createdAt: now,
        id: "checklist_1",
        items: [
          { id: "item_1", label: "Manual", notes: null, status: "pending" },
        ],
        name: "Entrega",
        status: "pending",
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: now,
        ...overrides,
      };
    },
    document(overrides: Partial<VehicleDocumentRow> = {}): VehicleDocumentRow {
      return {
        createdAt: now,
        createdByUserId: null,
        deletedAt: null,
        fileName: "registration.pdf",
        fileSizeBytes: 4096,
        id: "document_1",
        isDeleted: false,
        kind: "vehicle_registration",
        metadata: {},
        mimeType: "application/pdf",
        status: "draft",
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/documents/registration.pdf",
        storeId: "store_1",
        tenantId: "tenant_1",
        title: "Registro",
        updatedAt: now,
        uploadedAt: now,
        ...overrides,
      };
    },
    documentLink(
      overrides: Partial<VehicleDocumentLinkRow> = {},
    ): VehicleDocumentLinkRow {
      return {
        createdAt: now,
        documentId: "document_1",
        id: "document_link_1",
        linkRole: "primary",
        storeId: "store_1",
        targetId: "unit_1",
        targetType: "vehicle_unit",
        tenantId: "tenant_1",
        updatedAt: now,
        ...overrides,
      };
    },
    documentVersion(
      overrides: Partial<DocumentVersionRow> = {},
    ): DocumentVersionRow {
      return {
        createdAt: now,
        createdByUserId: null,
        documentId: "document_1",
        fileName: "registration.pdf",
        fileSizeBytes: 4096,
        id: "document_version_1",
        metadata: {},
        mimeType: "application/pdf",
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/documents/registration.pdf",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: now,
        versionNumber: 1,
        ...overrides,
      };
    },
    listing(overrides: Partial<VehicleListingRow> = {}): VehicleListingRow {
      return {
        askingPriceCents: null,
        condition: "used",
        createdAt: now,
        deletedAt: null,
        description: null,
        doors: null,
        engineAspiration: null,
        engineDisplacement: null,
        featuredUntil: null,
        fuelType: null,
        id: "listing_1",
        internalNotes: null,
        isDeleted: false,
        isVisibleOnPublicSite: false,
        manufactureYear: null,
        metadata: {},
        mileageKm: null,
        modelYear: null,
        publicSlug: null,
        status: "draft",
        storeId: "store_1",
        tenantId: "tenant_1",
        title: "Civic",
        transmission: null,
        trimName: null,
        updatedAt: now,
        ...overrides,
      };
    },
    media(overrides: Partial<VehicleMediaRow> = {}): VehicleMediaRow {
      return {
        altText: null,
        createdAt: now,
        deletedAt: null,
        displayOrder: 0,
        id: "media_1",
        isDeleted: false,
        isPublic: true,
        kind: "photo",
        metadata: {},
        storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: now,
        url: "https://cdn.local/front.jpg",
        ...overrides,
      };
    },
    unit(overrides: Partial<VehicleUnitRow> = {}): VehicleUnitRow {
      return {
        acquisitionDate: null,
        acquisitionPriceCents: null,
        colorName: null,
        createdAt: now,
        deletedAt: null,
        id: "unit_1",
        isDeleted: false,
        listingId: "listing_1",
        plate: null,
        status: "available",
        stockNumber: null,
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: now,
        vin: null,
        ...overrides,
      };
    },
  };
}
