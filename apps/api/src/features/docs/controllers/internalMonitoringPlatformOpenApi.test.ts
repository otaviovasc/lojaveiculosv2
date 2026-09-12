import { describe, expect, it } from "vitest";
import { internalMonitoringPlatformPaths } from "./internalMonitoringPlatformOpenApi.js";

describe("platform internal monitoring OpenAPI", () => {
  it("documents the non-delegable platform authority boundary", () => {
    const operation =
      internalMonitoringPlatformPaths["/api/v1/internal/platform/health"].get;

    expect(operation.security).toEqual([
      { bearerAuth: ["platformAdmin", "audit.read"] },
    ]);
    expect(operation.description).toContain(
      "audit.read alone do not grant access",
    );
  });
});
