import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { createVehicleChecklist } from "./createVehicleChecklist.js";
import { getVehicleListingDetail } from "./getVehicleListingDetail.js";
import { listVehicleChecklists } from "./listVehicleChecklists.js";
import { updateVehicleChecklist } from "./updateVehicleChecklist.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService checklists", () => {
  it("creates, lists, and includes unit checklists in listing detail", async () => {
    const context = createContext([
      "inventory.checklist_read",
      "inventory.checklist_update",
      "inventory.create",
      "inventory.read",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1", stockNumber: "stock_1" },
      ports,
    );

    const checklist = await createVehicleChecklist(
      context,
      {
        items: [{ label: "Manual", status: "pending" }],
        listingId: "listing_1",
        name: "Entrega",
        unitId: unit.id,
      },
      ports,
    );

    expect(checklist).toMatchObject({
      completedAt: null,
      name: "Entrega",
      status: "pending",
      unitId: "unit_1",
    });
    await expect(
      listVehicleChecklists(
        context,
        { listingId: "listing_1", unitId: unit.id },
        ports,
      ),
    ).resolves.toHaveLength(1);
    await expect(
      getVehicleListingDetail(context, { listingId: "listing_1" }, ports),
    ).resolves.toMatchObject({ checklists: [{ id: checklist.id }] });
  });

  it("updates items, derives completion, and audits changed fields", async () => {
    const context = createContext([
      "inventory.checklist_update",
      "inventory.create",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1", stockNumber: "stock_1" },
      ports,
    );
    const checklist = await createVehicleChecklist(
      context,
      {
        items: [{ id: "item_1", label: "Manual", status: "pending" }],
        listingId: "listing_1",
        name: "Entrega",
        unitId: unit.id,
      },
      ports,
    );

    const updated = await updateVehicleChecklist(
      context,
      {
        checklistId: checklist.id,
        items: [{ id: "item_1", label: "Manual", status: "passed" }],
        listingId: "listing_1",
        unitId: unit.id,
      },
      ports,
    );

    expect(updated.status).toBe("passed");
    expect(updated.completedAt).toBeInstanceOf(Date);
    const event = lastAuditEvent(context.audit.record);
    expect(event.action).toBe("vehicle_checklist.update");
    expect(event.entityType).toBe("vehicle_checklist");
    expect(event.changes).toEqual(
      expect.arrayContaining([
        { after: "passed", before: "pending", path: "status" },
        expect.objectContaining({ path: "items" }),
        expect.objectContaining({ path: "completedAt" }),
      ]),
    );
  });

  it("requires checklist read permission for list operations", async () => {
    const context = createContext(["inventory.create"]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1", stockNumber: "stock_1" },
      ports,
    );

    await expect(
      listVehicleChecklists(
        context,
        { listingId: "listing_1", unitId: unit.id },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.checklist_read");
  });
});

function lastAuditEvent(record: (event: AuditEvent) => Promise<void>) {
  const calls = vi.mocked(record).mock.calls;
  const event = calls.at(-1)?.[0];

  if (!event) throw new Error("Expected an audit event.");
  return event;
}
