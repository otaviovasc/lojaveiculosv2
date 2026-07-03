import { expect, type Page } from "@playwright/test";

type ExtrasSendState = {
  sentCatalogProductId?: string;
  sentLocationAddress?: string;
  sentVehicleListingId?: string;
};

const catalogImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect width='640' height='480' fill='%23155eef'/%3E%3Ctext x='48' y='260' font-family='Arial' font-size='48' font-weight='700' fill='white'%3ECatalogo%3C/text%3E%3C/svg%3E";

const vehicleImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect width='640' height='480' fill='%230f766e'/%3E%3Ctext x='48' y='260' font-family='Arial' font-size='48' font-weight='700' fill='white'%3EAudi A4%3C/text%3E%3C/svg%3E";

export async function installExtrasActionRoutes(
  page: Page,
  messageId: string,
): Promise<ExtrasSendState> {
  const state: ExtrasSendState = {};
  await installCatalogRoutes(page, messageId, state);
  await installVehicleRoutes(page, messageId, state);
  await installLocationRoute(page, messageId, state);
  return state;
}

async function installCatalogRoutes(
  page: Page,
  messageId: string,
  state: ExtrasSendState,
) {
  await page.route("**/crm/whatsapp/catalog/products**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        catalogPhone: "5511940231407",
        products: [
          {
            currency: "BRL",
            id: "prod_civic_e2e",
            images: [catalogImage],
            name: "Honda Civic EXL Catalogo",
            price: "119900",
            retailerId: "CIVIC-E2E",
          },
        ],
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });

  await page.route("**/crm/whatsapp/send/catalog/product", async (route) => {
    const body = route.request().postDataJSON() as {
      catalogPhone?: string;
      productId?: string;
      productName?: string;
    };
    state.sentCatalogProductId = body.productId;
    expect(body).toMatchObject({
      catalogPhone: "5511940231407",
      productId: "prod_civic_e2e",
      productName: "Honda Civic EXL Catalogo",
    });
    await route.fulfill({
      body: JSON.stringify({
        content: "Honda Civic EXL Catalogo",
        createdAt: new Date().toISOString(),
        direction: "OUTBOUND",
        id: `catalog-${messageId}`,
        metadata: {
          catalogProduct: {
            catalogPhone: body.catalogPhone,
            productId: body.productId,
            productName: body.productName,
          },
        },
        providerTimestamp: new Date().toISOString(),
        senderType: "HUMAN",
        status: "SENT",
        type: "CATALOG",
      }),
      headers: { "content-type": "application/json" },
      status: 201,
    });
  });
}

async function installVehicleRoutes(
  page: Page,
  messageId: string,
  state: ExtrasSendState,
) {
  await page.route("**/api/v1/inventory/units**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [
          {
            listing: {
              catalog: null,
              createdAt: new Date().toISOString(),
              description: "Sedan preto completo",
              doors: 4,
              engineAspiration: null,
              engineDisplacement: null,
              fuelType: null,
              id: "10000000-0000-4000-8000-000000000001",
              internalNotes: null,
              manufactureYear: 2021,
              mileageKm: 32000,
              modelYear: 2022,
              plate: "ABC1D23",
              priceCents: 18990000,
              status: "available",
              storeId: null,
              tenantId: null,
              title: "Audi A4 Prestige Plus 2022",
              transmission: null,
              trimName: null,
              unitIds: ["11000000-0000-4000-8000-000000000001"],
              updatedAt: new Date().toISOString(),
            },
            mediaCount: 4,
            primaryMediaUrl: vehicleImage,
            primaryUnit: {
              colorName: "Preto",
              createdAt: new Date().toISOString(),
              id: "11000000-0000-4000-8000-000000000001",
              listingId: "10000000-0000-4000-8000-000000000001",
              plate: "ABC1D23",
              status: "available",
              stockNumber: "LV-A4-PRETO",
              storeId: null,
              tenantId: null,
              updatedAt: new Date().toISOString(),
              vin: null,
            },
            units: [],
          },
        ],
        nextOffset: null,
        total: 1,
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });

  await page.route("**/crm/whatsapp/send/vehicle", async (route) => {
    const body = route.request().postDataJSON() as {
      listingId?: string;
      mediaLimit?: number;
      title?: string;
      unitId?: string;
    };
    state.sentVehicleListingId = body.listingId;
    expect(body).toMatchObject({
      listingId: "10000000-0000-4000-8000-000000000001",
      mediaLimit: 4,
      title: "Audi A4 Prestige Plus 2022",
      unitId: "11000000-0000-4000-8000-000000000001",
    });
    await route.fulfill({
      body: JSON.stringify({
        content: "Audi A4 Prestige Plus 2022",
        createdAt: new Date().toISOString(),
        direction: "OUTBOUND",
        id: `vehicle-${messageId}`,
        metadata: {
          vehicle: {
            priceLabel: "R$ 189.900",
            thumbnailUrl: vehicleImage,
            title: body.title,
            year: "2021/2022",
          },
        },
        providerTimestamp: new Date().toISOString(),
        senderType: "HUMAN",
        status: "SENT",
        type: "CATALOG",
      }),
      headers: { "content-type": "application/json" },
      status: 201,
    });
  });
}

async function installLocationRoute(
  page: Page,
  messageId: string,
  state: ExtrasSendState,
) {
  await page.route("**/crm/whatsapp/send/location", async (route) => {
    const body = route.request().postDataJSON() as {
      address?: string;
      latitude?: number;
      longitude?: number;
      name?: string;
    };
    state.sentLocationAddress = body.address;
    expect(body).toMatchObject({
      address: "Av. Paulista, 1000",
      latitude: -23.56168,
      longitude: -46.65598,
      name: "Loja",
    });
    await route.fulfill({
      body: JSON.stringify({
        content: "Loja",
        createdAt: new Date().toISOString(),
        direction: "OUTBOUND",
        id: `location-${messageId}`,
        metadata: {
          location: {
            address: body.address,
            latitude: body.latitude,
            longitude: body.longitude,
            name: body.name,
          },
        },
        providerTimestamp: new Date().toISOString(),
        senderType: "HUMAN",
        status: "SENT",
        type: "LOCATION",
      }),
      headers: { "content-type": "application/json" },
      status: 201,
    });
  });
}
