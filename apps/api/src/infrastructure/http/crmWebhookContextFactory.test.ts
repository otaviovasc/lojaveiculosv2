import { describe, expect, it } from "vitest";
import { resolveCrmWebhookActor } from "./crmWebhookContextFactory.js";

describe("CRM webhook actor attribution", () => {
  it.each([
    ["/api/v1/crm/bot/actions", "external_crm_bot"],
    ["/api/v1/crm/whatsapp/webhooks/meta", "meta"],
    ["/api/v1/crm/whatsapp/webhooks/zapi/connection/received", "zapi"],
    ["/api/v1/crm/whatsapp/webhooks/olx/connection/received", "olx_chat"],
  ])("attributes %s to %s", (pathname, actorId) => {
    expect(resolveCrmWebhookActor(pathname)).toMatchObject({ actorId });
  });

  it("fails closed for an unknown provider path", () => {
    expect(() =>
      resolveCrmWebhookActor("/api/v1/crm/whatsapp/webhooks/unknown/event"),
    ).toThrow("Unknown CRM webhook provider");
  });
});
