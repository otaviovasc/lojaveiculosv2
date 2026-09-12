import { describe, expect, it } from "vitest";
import {
  connectionId,
  schedule,
  scheduledFixture,
} from "./crm.scheduledMessages.routes.testSupport.js";

describe("CRM scheduled-message mutation routes", () => {
  it("creates a canonical conversation when scheduling for a new phone", async () => {
    const fixture = await scheduledFixture();

    const response = await fixture.app.request(
      "/api/v1/crm/scheduled-messages",
      {
        body: JSON.stringify({
          connectionId,
          content: "Primeiro contato",
          phone: "11987654321",
          scheduledAt: "2030-01-01T11:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      connectionId,
      content: "Primeiro contato",
      recipientAddress: "5511987654321",
      status: "pending",
    });
  });

  it("edits content and date while a scheduled message is pending", async () => {
    const fixture = await scheduledFixture();
    const createdResponse = await schedule(fixture.app, fixture.cycleId);
    const created = (await createdResponse.json()) as { id: string };

    const response = await fixture.app.request(
      `/api/v1/crm/scheduled-messages/${created.id}`,
      {
        body: JSON.stringify({
          content: "Mensagem revisada",
          scheduledAt: "2031-01-01T10:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      content: "Mensagem revisada",
      scheduledAt: "2031-01-01T10:00:00.000Z",
      status: "pending",
    });
  });
});
