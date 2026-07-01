import { describe, expect, it } from "vitest";
import type {
  InventoryListingDetail,
  InventoryMedia,
  InventoryUnit,
} from "../model/types";
import {
  createVitrineComponents,
  createVitrinePageSlug,
} from "./VitrineTabComponentsHelper";

describe("createVitrineComponents", () => {
  it("uses only public photos when selected unit photos are unavailable", () => {
    const primaryUnit = unit({ id: "unit_private", listingId: "listing_1" });
    const detail = listingDetail({
      media: [
        media({
          displayOrder: 0,
          id: "media_private",
          isPublic: false,
          unitId: "unit_private",
          url: "https://cdn.local/private-front.jpg",
        }),
        media({
          displayOrder: 1,
          id: "media_public",
          isPublic: true,
          unitId: "unit_public",
          url: "https://cdn.local/public-front.jpg",
        }),
      ],
      units: [primaryUnit, unit({ id: "unit_public", listingId: "listing_1" })],
    });

    const components = createVitrineComponents({
      detail,
      primaryUnit,
      specs: specs(),
      storeName: "Loja Demo",
      storeSlug: "demo",
      whatsappPhone: "+55 11 99999-0000",
    });

    expect(componentProps(components, "hero")).toMatchObject({
      imageUrl: "https://cdn.local/public-front.jpg",
    });
    expect(JSON.stringify(components)).not.toContain("private-front.jpg");
  });

  it("omits plate and VIN from public vehicle specs", () => {
    const components = createVitrineComponents({
      detail: listingDetail(),
      primaryUnit: unit(),
      specs: specs({ plate: "ABC1D23", vin: "9BD00000000000000" }),
      storeName: "Loja Demo",
      storeSlug: "demo",
      whatsappPhone: "",
    });

    const vehicleSpecs = JSON.stringify(
      componentProps(components, "vehicle_specs"),
    );
    expect(vehicleSpecs).not.toContain("Placa");
    expect(vehicleSpecs).not.toContain("Chassi/VIN");
    expect(JSON.stringify(components)).not.toContain("ABC1D23");
    expect(JSON.stringify(components)).not.toContain("9BD00000000000000");
  });
});

describe("createVitrinePageSlug", () => {
  it("includes a listing id segment to avoid duplicate title collisions", () => {
    expect(createVitrinePageSlug({ id: "listing_1", title: "Fiat Toro" })).toBe(
      "vitrine-fiat-toro-listing-1",
    );
    expect(createVitrinePageSlug({ id: "listing_2", title: "Fiat Toro" })).toBe(
      "vitrine-fiat-toro-listing-2",
    );
  });

  it("keeps the slug within the custom page schema limit", () => {
    const slug = createVitrinePageSlug({
      id: "12345678-1234-1234-1234-123456789abc",
      title: "Fiat Toro Volcano Ultra Premium Branco Perolizado Blindado",
    });

    expect(slug).toContain("12345678-1234-1234-1234-123456789abc");
    expect(slug.length).toBeLessThanOrEqual(80);
  });
});

function componentProps(
  components: ReturnType<typeof createVitrineComponents>,
  type: string,
) {
  return components.find((component) => component.type === type)?.props;
}

function listingDetail(
  input: {
    media?: readonly InventoryMedia[];
    units?: readonly InventoryUnit[];
  } = {},
): InventoryListingDetail {
  const defaultUnit = unit();
  return {
    checklists: [],
    costs: [],
    documents: [],
    listing: {
      catalog: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "Veiculo revisado",
      doors: 4,
      engineAspiration: null,
      engineDisplacement: null,
      fuelType: "flex",
      id: "listing_1",
      internalNotes: null,
      manufactureYear: 2024,
      mileageKm: 12000,
      modelYear: 2025,
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "published",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Fiat Toro",
      transmission: "automatic",
      trimName: null,
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    media: input.media ?? [
      media({
        id: "media_public",
        isPublic: true,
        url: "https://cdn.local/public-front.jpg",
      }),
    ],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: input.units ?? [defaultUnit],
  };
}

function unit(input: Partial<InventoryUnit> = {}): InventoryUnit {
  return {
    colorName: "white",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available",
    stockNumber: "stock_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: "9BD00000000000000",
    ...input,
  };
}

function media(input: Partial<InventoryMedia> = {}): InventoryMedia {
  return {
    altText: "Foto frontal",
    createdAt: "2026-01-01T00:00:00.000Z",
    displayOrder: 0,
    id: "media_1",
    isPublic: true,
    kind: "photo",
    storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    url: "https://cdn.local/front.jpg",
    ...input,
  };
}

function specs(
  input: Partial<Parameters<typeof createVitrineComponents>[0]["specs"]> = {},
) {
  return {
    bodyType: "Picape",
    color: "Branco",
    doors: "4 portas",
    engine: "2.0",
    fuel: "Flex",
    km: "12.000 km",
    modality: "Usado",
    plate: "ABC1D23",
    transmission: "Automatico",
    vin: "9BD00000000000000",
    ...input,
  };
}
