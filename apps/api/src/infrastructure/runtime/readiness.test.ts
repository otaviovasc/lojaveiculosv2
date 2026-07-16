import { describe, expect, it, vi } from "vitest";
import { createReadinessProbe, readReadinessTimeoutMs } from "./readiness.js";

describe("runtime readiness", () => {
  it("reports every required dependency as ready", async () => {
    const probe = createReadinessProbe([
      { name: "productDatabase", run: vi.fn(async () => undefined) },
      { name: "auditDatabase", run: vi.fn(async () => undefined) },
    ]);

    await expect(probe()).resolves.toEqual({
      checks: {
        auditDatabase: "ready",
        productDatabase: "ready",
      },
      ok: true,
    });
  });

  it("fails closed without exposing dependency errors", async () => {
    const probe = createReadinessProbe([
      {
        name: "productDatabase",
        run: vi.fn(async () => {
          throw new Error("secret connection details");
        }),
      },
    ]);

    await expect(probe()).resolves.toEqual({
      checks: { productDatabase: "not_ready" },
      ok: false,
    });
  });

  it("uses a bounded configurable timeout", () => {
    expect(readReadinessTimeoutMs({ READINESS_TIMEOUT_MS: "750" })).toBe(750);
    expect(readReadinessTimeoutMs({ READINESS_TIMEOUT_MS: "invalid" })).toBe(
      2_000,
    );
  });
});
