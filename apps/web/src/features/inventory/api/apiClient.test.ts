import { describe, expect, it } from "vitest";
import {
  createInventoryApi,
  createInventoryHeaders,
  inventoryRoutes,
} from "./apiClient";
import {
  bodyOf,
  callAt,
  createFakeFetch,
  listingDetailPayload,
} from "./apiClientTestSupport";

describe("createInventoryApi", () => {
  it("creates listing and unit using the inventory routes", async () => {
    const fake = createFakeFetch([
      listingDetailPayload(),
      listingDetailPayload(),
    ]);
    const api = createInventoryApi({
      auth: {
        accessToken: "session-token",
        clerkUserId: "clerk_test_user",
        storeSlug: "test-store",
      },
      baseUrl: "https://api.local/api/v1/",
      fetch: fake.fetch,
    });

    await api.createFlow({
      listing: {
        plate: "ABC1D23",
        priceCents: 12000000,
        status: "draft",
        title: "Inventory title",
      },
      unit: { stockNumber: "stock_1", vin: "vin_1" },
    });

    const listingCall = callAt(fake.calls, 0);
    const unitCall = callAt(fake.calls, 1);

    expect(listingCall.input).toBe(
      "https://api.local/api/v1/inventory/listings",
    );
    expect(listingCall.init?.method).toBe("POST");
    expect(listingCall.init?.headers).toMatchObject({
      Authorization: "Bearer session-token",
      "x-clerk-user-id": "clerk_test_user",
      "x-store-slug": "test-store",
    });
    expect(bodyOf(listingCall)).toEqual({
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "draft",
      title: "Inventory title",
    });
    expect(unitCall.input).toBe(
      "https://api.local/api/v1/inventory/listings/listing_1/unit",
    );
    expect(unitCall.init?.method).toBe("PUT");
    expect(bodyOf(unitCall)).toEqual({
      stockNumber: "stock_1",
      vin: "vin_1",
    });
  });

  it("requests upload URL, uploads the file, and creates media", async () => {
    const file = new File(["image-bytes"], "front.jpg", {
      type: "image/jpeg",
    });
    const fake = createFakeFetch([
      listingDetailPayload(),
      listingDetailPayload(),
      {
        publicUrl: "https://cdn.local/front.jpg",
        storageKey: "tenants/t/stores/s/listings/listing_1/front.jpg",
        uploadHeaders: { "content-type": "image/jpeg" },
        uploadMethod: "PUT",
        uploadUrl: "https://upload.local/front.jpg",
      },
      {
        listingId: "listing_1",
        mediaId: "media_1",
        storageKey: "tenants/t/stores/s/listings/listing_1/front.jpg",
        status: "created",
        url: "https://cdn.local/front.jpg",
      },
    ]);
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.createFlow({
      listing: { plate: null, title: "Inventory title" },
      media: {
        altText: "Front view",
        displayOrder: 0,
        file,
        kind: "photo",
      },
      unit: {},
    });

    expect(callAt(fake.calls, 2).input).toBe(
      "/api/v1/inventory/listings/listing_1/media/uploads",
    );
    expect(bodyOf(callAt(fake.calls, 2))).toEqual({
      contentType: "image/jpeg",
      fileName: "front.jpg",
      kind: "photo",
      sizeBytes: file.size,
    });
    expect(callAt(fake.calls, 3)).toMatchObject({
      input: "https://upload.local/front.jpg",
      init: {
        body: file,
        headers: { "content-type": "image/jpeg" },
        method: "PUT",
      },
    });
    expect(callAt(fake.calls, 4).input).toBe(
      "/api/v1/inventory/listings/listing_1/media",
    );
    expect(bodyOf(callAt(fake.calls, 4))).toMatchObject({
      altText: "Front view",
      displayOrder: 0,
      kind: "photo",
      storageKey: "tenants/t/stores/s/listings/listing_1/front.jpg",
    });
  });

  it("keeps route helpers and headers explicit", () => {
    expect(inventoryRoutes.listings()).toBe("/api/v1/inventory/listings");
    expect(inventoryRoutes.detail("listing 1")).toBe(
      "/api/v1/inventory/listings/listing%201",
    );
    expect(
      inventoryRoutes.list({
        limit: 100,
        offset: 200,
        search: "toro",
        status: "available",
      }),
    ).toBe(
      "/api/v1/inventory/listings?limit=100&offset=200&search=toro&status=available",
    );
    expect(inventoryRoutes.unit("listing 1")).toBe(
      "/api/v1/inventory/listings/listing%201/unit",
    );
    expect(inventoryRoutes.unitDetail("listing 1", "unit 1")).toBe(
      "/api/v1/inventory/listings/listing%201/units/unit%201",
    );
    expect(inventoryRoutes.checklists("listing 1", "unit 1")).toBe(
      "/api/v1/inventory/listings/listing%201/units/unit%201/checklists",
    );
    expect(
      inventoryRoutes.checklistDetail("listing 1", "unit 1", "checklist 1"),
    ).toBe(
      "/api/v1/inventory/listings/listing%201/units/unit%201/checklists/checklist%201",
    );
    expect(createInventoryHeaders({ storeSlug: "test-store" })).toEqual({
      "Content-Type": "application/json",
      "x-store-slug": "test-store",
    });
  });

  it("updates listing details and units through canonical edit routes", async () => {
    const fake = createFakeFetch([
      listingDetailPayload(),
      listingDetailPayload(),
    ]);
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.updateListingDetails("listing_1", {
      description: "Updated",
      priceCents: 13000000,
      status: "available",
      title: "Updated title",
    });
    await api.updateUnit("listing_1", "unit_1", {
      plate: "DEF4G56",
      status: "reserved",
      stockNumber: "stock_2",
      vin: "vin_2",
    });

    expect(callAt(fake.calls, 0).input).toBe(
      "/api/v1/inventory/listings/listing_1",
    );
    expect(callAt(fake.calls, 0).init?.method).toBe("PATCH");
    expect(bodyOf(callAt(fake.calls, 0))).toEqual({
      description: "Updated",
      priceCents: 13000000,
      status: "available",
      title: "Updated title",
    });
    expect(callAt(fake.calls, 1).input).toBe(
      "/api/v1/inventory/listings/listing_1/units/unit_1",
    );
    expect(callAt(fake.calls, 1).init?.method).toBe("PATCH");
    expect(bodyOf(callAt(fake.calls, 1))).toEqual({
      plate: "DEF4G56",
      status: "reserved",
      stockNumber: "stock_2",
      vin: "vin_2",
    });
  });

  it("lists, creates, and updates vehicle checklists", async () => {
    const fake = createFakeFetch([
      {
        checklists: [
          {
            completedAt: null,
            completedByUserId: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            id: "checklist_1",
            items: [],
            name: "Entrega",
            status: "pending",
            storeId: "store_1",
            tenantId: "tenant_1",
            unitId: "unit_1",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      listingDetailPayload(),
      listingDetailPayload(),
    ]);
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.listChecklists("listing_1", "unit_1");
    await api.createChecklist("listing_1", "unit_1", {
      items: [{ label: "Manual" }],
      name: "Entrega",
    });
    await api.updateChecklist("listing_1", "unit_1", "checklist_1", {
      items: [{ id: "item_1", label: "Manual", status: "passed" }],
      status: "passed",
    });

    expect(callAt(fake.calls, 0).input).toBe(
      "/api/v1/inventory/listings/listing_1/units/unit_1/checklists",
    );
    expect(callAt(fake.calls, 1).init?.method).toBe("POST");
    expect(bodyOf(callAt(fake.calls, 1))).toEqual({
      items: [{ label: "Manual" }],
      name: "Entrega",
    });
    expect(callAt(fake.calls, 2).input).toBe(
      "/api/v1/inventory/listings/listing_1/units/unit_1/checklists/checklist_1",
    );
    expect(callAt(fake.calls, 2).init?.method).toBe("PATCH");
    expect(bodyOf(callAt(fake.calls, 2))).toEqual({
      items: [{ id: "item_1", label: "Manual", status: "passed" }],
      status: "passed",
    });
  });

  it("routes plate lookup and resale analysis through inventory enrichment", async () => {
    const fake = createFakeFetch([
      {
        fipe: null,
        metadata: [],
        plate: "ABC1D23",
        source: "apibrasil",
        vehicle: {},
      },
      {
        dealRiskScore: 22,
        riskLevel: "low",
        suggestedDescription: "Descricao gerada.",
        summary: "Baixo risco.",
        topics: [],
      },
    ]);
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.lookupPlate({ plate: "ABC1D23" });
    await api.analyzeResale({
      acquisitionPriceCents: null,
      bodyType: null,
      brand: "Fiat",
      city: null,
      color: null,
      fipePriceCents: null,
      fuel: null,
      manufactureYear: null,
      marketContext: null,
      metadata: [],
      mileageKm: null,
      model: "Strada",
      modelYear: 2023,
      origin: null,
      plate: "ABC1D23",
      recommendedAcquisitionPriceCents: null,
      recommendedSellingPriceCents: null,
      sellingPriceCents: null,
      state: null,
      transmission: null,
      vehicleType: null,
      version: "Ranch",
    });

    expect(callAt(fake.calls, 0).input).toBe(
      "/api/v1/inventory/enrichment/plate",
    );
    expect(bodyOf(callAt(fake.calls, 0))).toEqual({ plate: "ABC1D23" });
    expect(callAt(fake.calls, 1).input).toBe(
      "/api/v1/inventory/enrichment/resale-analysis",
    );
    expect(bodyOf(callAt(fake.calls, 1))).toMatchObject({
      brand: "Fiat",
      model: "Strada",
    });
  });
});
