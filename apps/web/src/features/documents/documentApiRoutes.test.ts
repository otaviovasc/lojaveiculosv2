import { describe, expect, it } from "vitest";
import { documentsRoutes } from "./documentApiRoutes";

describe("document content routes", () => {
  it("builds same-origin content routes with optional versions", () => {
    expect(documentsRoutes.content("document 1")).toBe(
      "/api/v1/documents/document%201/content",
    );
    expect(
      documentsRoutes.content("document 1", { versionId: "version 2" }),
    ).toBe("/api/v1/documents/document%201/content?versionId=version+2");
  });
});
