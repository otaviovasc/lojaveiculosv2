import { Hono } from "hono";
import { vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createInventoryFeature,
  type InventoryContextFactory,
  type InventoryListingServices,
} from "./vehicle.controller.js";

export function createInventoryTestApp(
  services: InventoryListingServices,
  contextFactory: InventoryContextFactory = createUserContext,
) {
  const app = new Hono();
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({ contextFactory, services }),
  );

  return app;
}

export function createInventoryTestServices(): InventoryListingServices {
  return {
    attachListingUnit: vi.fn(async () => scaffoldResult()),
    changeListingStatus: vi.fn(async () => scaffoldResult()),
    createListing: vi.fn(async () => scaffoldResult()),
    getListing: vi.fn(async () => scaffoldResult()),
    updateListingDescription: vi.fn(async () => scaffoldResult()),
    updateListingPrice: vi.fn(async () => scaffoldResult()),
  };
}

export function scaffoldResult() {
  return {
    listingId: "listing_1",
    status: "not_implemented" as const,
  };
}

export async function createUserContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: [
      "inventory.create",
      "inventory.read",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
