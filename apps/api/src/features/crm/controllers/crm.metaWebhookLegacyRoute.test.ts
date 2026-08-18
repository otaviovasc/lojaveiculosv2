import { describe, expect, it } from "vitest";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM legacy Meta webhook route", () => {
  it("does not expose the WhatsApp-prefixed alias", async () => {
    const app = createTestApp();
    const challenge = await app.request(
      "/api/v1/crm/whatsapp/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta-test-verify-token&hub.challenge=challenge-123",
    );
    expect(challenge.status).toBe(404);

    const event = await app.request("/api/v1/crm/whatsapp/webhooks/meta", {
      body: JSON.stringify({ object: "whatsapp_business_account" }),
      method: "POST",
    });
    expect(event.status).toBe(404);
  });
});
