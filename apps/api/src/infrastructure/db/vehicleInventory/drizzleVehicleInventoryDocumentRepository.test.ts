import { describe, expect, it } from "vitest";
import { createDrizzleVehicleInventoryRepositories } from "./drizzleVehicleInventoryRepository.js";
import { createFakeDb } from "./drizzleVehicleInventoryRepository.testSupport.js";

describe("Drizzle vehicle document repository", () => {
  it("creates vehicle document records with an initial downloadable version", async () => {
    const db = createFakeDb();
    const { documentRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    const document = await documentRepository.create({
      createdByUserId: "user_1",
      fileName: "registration.pdf",
      fileSizeBytes: 4096,
      kind: "vehicle_registration",
      linkRole: "primary",
      metadata: { manualUpload: true },
      mimeType: "application/pdf",
      status: "draft",
      storageKey:
        "tenants/tenant_1/stores/store_1/units/unit_1/documents/registration.pdf",
      storeId: "store_1",
      targetId: "unit_1",
      targetType: "vehicle_unit",
      tenantId: "tenant_1",
      title: "Documento da unidade",
    });

    expect(document).toMatchObject({
      fileName: "registration.pdf",
      id: "document_1",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    expect(db.inserted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "registration.pdf",
          kind: "vehicle_registration",
          title: "Documento da unidade",
        }),
        expect.objectContaining({
          documentId: "document_1",
          targetId: "unit_1",
          targetType: "vehicle_unit",
        }),
        expect.objectContaining({
          documentId: "document_1",
          fileName: "registration.pdf",
          storageKey:
            "tenants/tenant_1/stores/store_1/units/unit_1/documents/registration.pdf",
          versionNumber: 1,
        }),
      ]),
    );
  });
});
