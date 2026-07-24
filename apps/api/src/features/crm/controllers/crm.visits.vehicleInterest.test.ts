import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryVehicleInventoryPorts } from "../../inventory/adapters/memory/vehicleInventoryPorts.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const visitPermissions = [
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

describe("CRM visit vehicle interest", () => {
  it("optionally stores and clears a scoped vehicle interest", async () => {
    const crmRepository = createMemoryCrmRepository();
    const lead = await crmRepository.createLead({
      buyerName: "Lead com Veiculo",
      buyerPhone: "5511999999999",
      source: "manual",
      storeId,
      tenantId,
    });
    const inventory = createMemoryVehicleInventoryPorts();
    const listingId = "44000000-0000-4000-8000-000000000001";
    const seededListing = await inventory.listingRepository.create({
      catalog: null,
      description: null,
      manufactureYear: 2025,
      modelYear: 2026,
      plate: null,
      priceCents: 12_990_000,
      status: "published",
      storeId,
      tenantId,
      title: "SUV Prata",
      trimName: null,
    });
    vi.spyOn(inventory.listingRepository, "findById").mockResolvedValue({
      ...seededListing,
      id: listingId,
    });
    const app = createTestApp({
      crmRepository,
      permissions: visitPermissions,
      vehicleInventory: {
        listingRepository: inventory.listingRepository,
        mediaRepository: inventory.mediaRepository!,
        unitRepository: inventory.unitRepository!,
      },
    });

    const response = await app.request("/api/v1/crm/visits", {
      body: JSON.stringify({
        leadId: lead.id,
        listingId,
        scheduledAt: "2026-07-08T14:00:00.000Z",
      }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    const created = (await response.json()) as { id: string };
    expect(created).toMatchObject({
      leadId: lead.id,
      listingId,
      vehicleTitle: "SUV Prata",
    });

    const cleared = await app.request(`/api/v1/crm/visits/${created.id}`, {
      body: JSON.stringify({ listingId: null }),
      method: "PATCH",
    });
    expect(cleared.status).toBe(200);
    await expect(cleared.json()).resolves.toMatchObject({
      id: created.id,
      listingId: null,
      vehicleTitle: null,
    });
  });
});
