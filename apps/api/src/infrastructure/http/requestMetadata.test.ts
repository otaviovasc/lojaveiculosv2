import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { readHttpRequestHeaders } from "./requestMetadata.js";

describe("HTTP request metadata", () => {
  it("preserves workflow correlation, causation, and idempotency headers", async () => {
    const app = new Hono();
    app.post("/actions", (context) =>
      context.json(readHttpRequestHeaders(context)),
    );

    const response = await app.request("/actions", {
      headers: {
        "idempotency-key": "idem_1",
        "x-causation-id": "cause_1",
        "x-correlation-id": "corr_1",
        "x-request-id": "req_1",
      },
      method: "POST",
    });

    await expect(response.json()).resolves.toMatchObject({
      causationId: "cause_1",
      correlationId: "corr_1",
      idempotencyKey: "idem_1",
      method: "POST",
      path: "/actions",
      requestId: "req_1",
    });
  });
});
