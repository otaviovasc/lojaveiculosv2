import { describe, expect, it } from "vitest";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { jsonPost } from "./crm.campaigns.testSupport.js";

describe("CRM lead birthDate", () => {
  it("persists birthDate on lead creation and updates via API", async () => {
    const crmRepository = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository,
      permissions: [
        "lead.create",
        "lead.update",
        "lead.read",
        "crm.pipeline.read",
        "crm.pipeline.manage",
      ],
    });

    const createResponse = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "1990-05-15",
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );

    expect(createResponse.status).toBe(201);
    const createdLead = (await createResponse.json()) as {
      birthDate?: string | null;
      id: string;
    };
    expect(createdLead.birthDate).toBe("1990-05-15");

    const updateResponse = await app.request(
      `/api/v1/crm/leads/${createdLead.id}`,
      {
        body: JSON.stringify({ birthDate: "1990-05-16" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );

    expect(updateResponse.status).toBe(200);
    const updatedLead = (await updateResponse.json()) as {
      birthDate?: string | null;
    };
    expect(updatedLead.birthDate).toBe("1990-05-16");

    const readResponse = await app.request(
      `/api/v1/crm/leads/${createdLead.id}`,
    );
    expect(readResponse.status).toBe(200);
    const readLead = (await readResponse.json()) as {
      birthDate?: string | null;
    };
    expect(readLead.birthDate).toBe("1990-05-16");
  });

  it("rejects malformed and impossible calendar birthDate formats", async () => {
    const crmRepository = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository,
      permissions: [
        "lead.create",
        "lead.update",
        "lead.read",
        "crm.pipeline.read",
        "crm.pipeline.manage",
      ],
    });

    // Format mismatch
    const badFormat = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "15/05/1990", // Not YYYY-MM-DD
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );
    expect(badFormat.status).toBe(400);

    // Impossible month/day (review probe regression: 2026-99-99)
    const impossibleMonth = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "2026-99-99",
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );
    expect(impossibleMonth.status).toBe(400);

    // Impossible calendar day (Feb 31: 2026-02-31)
    const impossibleDay = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "2026-02-31",
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );
    expect(impossibleDay.status).toBe(400);

    // Non-leap year Feb 29 (2025-02-29)
    const nonLeapFeb29 = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "2025-02-29",
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );
    expect(nonLeapFeb29.status).toBe(400);

    // Future birth date
    const futureDate = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "2099-01-01",
        buyerName: "Carlos Silva",
        buyerPhone: "5511999998888",
        source: "manual",
      }),
    );
    expect(futureDate.status).toBe(400);
  });

  it("accepts valid leap year birthDate and supports clearing to null", async () => {
    const crmRepository = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository,
      permissions: [
        "lead.create",
        "lead.update",
        "lead.read",
        "crm.pipeline.read",
        "crm.pipeline.manage",
      ],
    });

    // Valid leap year: 2000-02-29
    const leapResponse = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "2000-02-29",
        buyerName: "Leap Baby",
        buyerPhone: "5511999997777",
        source: "manual",
      }),
    );
    expect(leapResponse.status).toBe(201);
    const created = (await leapResponse.json()) as {
      id: string;
      birthDate: string | null;
    };
    expect(created.birthDate).toBe("2000-02-29");

    // Clear to null
    const clearResponse = await app.request(`/api/v1/crm/leads/${created.id}`, {
      body: JSON.stringify({ birthDate: null }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    expect(clearResponse.status).toBe(200);
    const updated = (await clearResponse.json()) as {
      birthDate: string | null;
    };
    expect(updated.birthDate).toBeNull();

    const readAfterClear = await app.request(`/api/v1/crm/leads/${created.id}`);
    expect(readAfterClear.status).toBe(200);
    const readCleared = (await readAfterClear.json()) as {
      birthDate: string | null;
    };
    expect(readCleared.birthDate).toBeNull();
  });

  it("rejects invalid birthDate values on update without changing the stored date", async () => {
    const crmRepository = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository,
      permissions: [
        "lead.create",
        "lead.update",
        "lead.read",
        "crm.pipeline.read",
        "crm.pipeline.manage",
      ],
    });
    const createResponse = await app.request(
      "/api/v1/crm/leads",
      jsonPost({
        birthDate: "1990-05-15",
        buyerName: "Update validation",
        source: "manual",
      }),
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const invalidUpdate = await app.request(`/api/v1/crm/leads/${created.id}`, {
      body: JSON.stringify({ birthDate: "1990-02-30" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    expect(invalidUpdate.status).toBe(400);

    const readResponse = await app.request(`/api/v1/crm/leads/${created.id}`);
    expect(readResponse.status).toBe(200);
    const readLead = (await readResponse.json()) as {
      birthDate?: string | null;
    };
    expect(readLead.birthDate).toBe("1990-05-15");
  });
});
