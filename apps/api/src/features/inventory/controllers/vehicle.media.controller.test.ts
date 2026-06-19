import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory media routes", () => {
  it("wires media upload requests to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/media/uploads",
      {
        body: JSON.stringify({
          contentType: "image/jpeg",
          fileName: "front.jpg",
          kind: "photo",
          sizeBytes: 2048,
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
        uploadMethod: "PUT",
      }),
    );
    expect(services.requestMediaUpload).toHaveBeenCalledWith(
      expect.any(Object),
      {
        contentType: "image/jpeg",
        fileName: "front.jpg",
        kind: "photo",
        listingId: "listing_1",
        sizeBytes: 2048,
      },
    );
  });

  it("wires confirmed media records to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/media",
      {
        body: JSON.stringify({
          altText: "Front photo",
          kind: "photo",
          storageKey:
            "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      listingId: "listing_1",
      mediaId: "media_1",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
      status: "created",
      url: "https://cdn.local/front.jpg",
    });
    expect(services.createMedia).toHaveBeenCalledWith(expect.any(Object), {
      altText: "Front photo",
      kind: "photo",
      listingId: "listing_1",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
    });
  });

  it("wires media edits to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/media/media_1",
      {
        body: JSON.stringify({
          altText: "Updated front photo",
          displayOrder: 2,
          isPublic: false,
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateMedia).toHaveBeenCalledWith(expect.any(Object), {
      altText: "Updated front photo",
      displayOrder: 2,
      isPublic: false,
      listingId: "listing_1",
      mediaId: "media_1",
    });
  });

  it("wires media deletion to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/media/media_1",
      { method: "DELETE" },
    );

    expect(response.status).toBe(200);
    expect(services.deleteMedia).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
      mediaId: "media_1",
    });
  });

  it("wires media reorder requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/media/reorder",
      {
        body: JSON.stringify({
          items: [
            { displayOrder: 0, mediaId: "media_2" },
            { displayOrder: 1, mediaId: "media_1" },
          ],
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.reorderMedia).toHaveBeenCalledWith(expect.any(Object), {
      items: [
        { displayOrder: 0, mediaId: "media_2" },
        { displayOrder: 1, mediaId: "media_1" },
      ],
      listingId: "listing_1",
    });
  });

  it("wires document upload requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/documents/uploads",
      {
        body: JSON.stringify({
          contentType: "application/pdf",
          fileName: "registration.pdf",
          kind: "vehicle_registration",
          sizeBytes: 4096,
          targetId: "unit_1",
          targetType: "vehicle_unit",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.requestDocumentUpload).toHaveBeenCalledWith(
      expect.any(Object),
      {
        contentType: "application/pdf",
        fileName: "registration.pdf",
        kind: "vehicle_registration",
        listingId: "listing_1",
        sizeBytes: 4096,
        targetId: "unit_1",
        targetType: "vehicle_unit",
      },
    );
  });

  it("wires document attachments to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/documents",
      {
        body: JSON.stringify({
          fileName: "registration.pdf",
          fileSizeBytes: 4096,
          kind: "vehicle_registration",
          mimeType: "application/pdf",
          storageKey:
            "tenants/tenant_1/stores/store_1/listings/listing_1/registration.pdf",
          title: "Registration",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.attachVehicleDocument).toHaveBeenCalledWith(
      expect.any(Object),
      {
        fileName: "registration.pdf",
        fileSizeBytes: 4096,
        kind: "vehicle_registration",
        listingId: "listing_1",
        mimeType: "application/pdf",
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/registration.pdf",
        title: "Registration",
      },
    );
  });
});
