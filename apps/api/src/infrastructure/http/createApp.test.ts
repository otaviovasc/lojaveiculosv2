import { describe, expect, it } from "vitest";
import { createApp } from "./createApp.js";

describe("API middleware", () => {
  it("applies security and CORS headers to normal responses", async () => {
    const app = createApp();

    const response = await app.request("/health", {
      headers: { Origin: "https://app.lojaveiculos.local" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-expose-headers")).toBe(
      "X-Request-Id",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("handles CORS preflight before feature routing", async () => {
    const app = createApp();

    const response = await app.request("/api/v1/inventory/listings", {
      headers: {
        "Access-Control-Request-Headers": "Authorization,X-Request-Id",
        "Access-Control-Request-Method": "GET",
        Origin: "https://app.lojaveiculos.local",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,HEAD,POST,PUT,PATCH,DELETE",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization,Content-Type,X-API-Key,X-Idempotency-Key,X-Request-Id,X-Store-Id",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects oversized request bodies before controllers parse them", async () => {
    const app = createApp();
    const oversizedBody = JSON.stringify({ value: "x".repeat(1024 * 1024) });

    const response = await app.request(
      "/api/v1/public/storefront/listings/listing_1/leads",
      {
        body: oversizedBody,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ message: "Payload too large" });
  });
});
