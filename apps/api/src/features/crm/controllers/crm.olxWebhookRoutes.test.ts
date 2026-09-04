import { describe, expect, it } from "vitest";
import { connectionId } from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM OLX webhook routes", () => {
  it("does not expose the legacy WhatsApp-namespaced route", async () => {
    const legacyPath = [
      "",
      "api",
      "v1",
      "crm",
      "whatsapp",
      "webhooks",
      "olx",
      connectionId,
      "received",
    ].join("/");

    const response = await createTestApp().request(legacyPath, {
      method: "POST",
    });

    expect(response.status).toBe(404);
  });
});
