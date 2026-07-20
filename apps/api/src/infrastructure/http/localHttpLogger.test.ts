import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonApiError } from "./apiErrorResponse.js";
import { createLocalHttpLogger } from "./localHttpLogger.js";

describe("createLocalHttpLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs successful requests as completed info events", async () => {
    vi.stubEnv("APP_ENV", "local");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = new Hono();
    app.use("*", createLocalHttpLogger());
    app.get("/health", (context) => context.json({ ok: true }));

    await app.request("/health", {
      headers: { "x-request-id": "req_ok" },
    });

    expect(warn).not.toHaveBeenCalled();
    expect(readLogLine(info)).toMatchObject({
      component: "http",
      event: "request.completed",
      method: "GET",
      path: "/health",
      requestId: "req_ok",
      status: 200,
    });
  });

  it("logs handled 4xx responses as failed warn events", async () => {
    vi.stubEnv("APP_ENV", "local");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = new Hono();
    app.use("*", createLocalHttpLogger());
    app.post("/api/v1/inventory/enrichment/plate", (context) =>
      jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        message: "Missing store scope.",
        status: 401,
      }),
    );

    await app.request("/api/v1/inventory/enrichment/plate", {
      headers: { "x-request-id": "req_401" },
      method: "POST",
    });

    expect(readLogLine(warn)).toMatchObject({
      code: "HTTP_AUTHENTICATION_REQUIRED",
      component: "http",
      event: "request.failed",
      method: "POST",
      path: "/api/v1/inventory/enrichment/plate",
      requestId: "req_401",
      status: 401,
    });
  });

  it("logs handled 5xx responses as failed error events", async () => {
    vi.stubEnv("APP_ENV", "local");
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = new Hono();
    app.use("*", createLocalHttpLogger());
    app.get("/boom", (context) =>
      jsonApiError(context, {
        code: "INTERNAL_SERVER_ERROR",
        error: new Error("boom"),
        message: "Internal server error.",
        status: 500,
      }),
    );

    await app.request("/boom", {
      headers: { "x-request-id": "req_500" },
    });

    // jsonApiError also emits a request.internal_error line for staging/prod
    // visibility; assert the local middleware line among all error calls.
    expect(readLogLine(error, "request.failed")).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      component: "http",
      event: "request.failed",
      errorName: "Error",
      requestId: "req_500",
      status: 500,
    });
  });
});

function readLogLine(
  spy: { mock: { calls: Array<Array<unknown>> } },
  event?: string,
) {
  const lines = spy.mock.calls
    .map((call) => call[0])
    .filter((line): line is string => typeof line === "string")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  const match = event ? lines.find((line) => line.event === event) : lines[0];
  if (!match) throw new Error("Missing log line.");
  return match;
}
