import { describe, expect, it } from "vitest";
import { sanitizeHttpPath } from "./sanitizeHttpPath.js";

describe("sanitizeHttpPath", () => {
  it("redacts the Spedy webhook token from request metadata", () => {
    expect(
      sanitizeHttpPath("/api/v1/fiscal/webhooks/spedy/a-secret-opaque-token"),
    ).toBe("/api/v1/fiscal/webhooks/spedy/<redacted>");
  });

  it("keeps ordinary API paths intact", () => {
    expect(sanitizeHttpPath("/api/v1/fiscal/documents")).toBe(
      "/api/v1/fiscal/documents",
    );
  });
});
