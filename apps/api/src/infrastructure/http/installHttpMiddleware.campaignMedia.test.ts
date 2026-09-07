import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
  CRM_CAMPAIGN_CREATE_BODY_LIMIT,
  installHttpMiddleware,
} from "./installHttpMiddleware.js";

function createApp() {
  const app = new Hono();
  installHttpMiddleware(app);
  app.post("/api/v1/crm/campaigns", (context) => context.text("accepted"));
  app.post("/api/v1/crm/messages", (context) => context.text("accepted"));
  return app;
}

describe("campaign media HTTP body limit", () => {
  it("allows the base64 envelope needed for a 10 MiB managed image", async () => {
    const app = createApp();
    const size = 1024 * 1024 + 1;
    const response = await app.request("/api/v1/crm/campaigns", {
      body: "x".repeat(size),
      headers: { "content-length": String(size) },
      method: "POST",
    });

    expect(response.status).toBe(200);
  });

  it("keeps the default limit for unrelated CRM endpoints", async () => {
    const app = createApp();
    const size = 1024 * 1024 + 1;
    const response = await app.request("/api/v1/crm/messages", {
      body: "x".repeat(size),
      headers: { "content-length": String(size) },
      method: "POST",
    });

    expect(response.status).toBe(413);
  });

  it("rejects campaign envelopes above the encoded media budget", async () => {
    const app = createApp();
    const size = CRM_CAMPAIGN_CREATE_BODY_LIMIT + 1;
    const response = await app.request("/api/v1/crm/campaigns", {
      body: "x".repeat(size),
      headers: { "content-length": String(size) },
      method: "POST",
    });

    expect(response.status).toBe(413);
  });
});
