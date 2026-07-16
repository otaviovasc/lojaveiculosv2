import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory checklist routes", () => {
  it("lists the filtered fleet overview through the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/checklists/overview?scope=all&status=attention&search=toro",
    );

    expect(response.status).toBe(200);
    expect(services.listChecklistOverview).toHaveBeenCalledWith(
      expect.any(Object),
      { scope: "all", search: "toro", status: "attention" },
    );
    expect(await response.json()).toMatchObject({
      generatedAt: "2026-07-15T12:00:00.000Z",
      summary: { unitCount: 0 },
    });
  });

  it("returns checklist reports as private PDF downloads", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/checklists/report.pdf?scope=active&unitId=unit_1",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain(
      "checklists-geral-2026-07-15.pdf",
    );
    expect(await response.text()).toBe("%PDF-1.7");
    expect(services.exportChecklistReport).toHaveBeenCalledWith(
      expect.any(Object),
      { scope: "active", unitId: "unit_1" },
    );
  });

  it("lists unit checklists through the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/checklists",
    );

    expect(response.status).toBe(200);
    expect(services.listChecklists).toHaveBeenCalledWith(expect.any(Object), {
      unitId: "unit_1",
    });
    expect(await response.json()).toEqual({
      checklists: [
        {
          completedAt: null,
          completedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          id: "checklist_1",
          items: [
            { id: "item_1", label: "Manual", notes: null, status: "passed" },
          ],
          name: "Entrega",
          status: "in_progress",
          storeId: "store_1",
          tenantId: "tenant_1",
          unitId: "unit_1",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("creates a unit checklist through the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/checklists",
      {
        body: JSON.stringify({
          items: [{ label: "Manual", status: "pending" }],
          name: "Entrega",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.createChecklist).toHaveBeenCalledWith(expect.any(Object), {
      items: [{ label: "Manual", status: "pending" }],
      name: "Entrega",
      unitId: "unit_1",
    });
  });

  it("updates a unit checklist through the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/checklists/checklist_1",
      {
        body: JSON.stringify({
          items: [{ id: "item_1", label: "Manual", status: "passed" }],
          status: "passed",
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateChecklist).toHaveBeenCalledWith(expect.any(Object), {
      checklistId: "checklist_1",
      items: [{ id: "item_1", label: "Manual", status: "passed" }],
      status: "passed",
      unitId: "unit_1",
    });
  });
});
