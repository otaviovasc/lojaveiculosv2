import { describe, expect, it } from "vitest";
import { openApiDocument } from "./docs.controller.js";

describe("published parity OpenAPI", () => {
  it("merges document, fiscal artifact, and agency contracts", () => {
    expect(Object.keys(openApiDocument.paths)).toEqual(
      expect.arrayContaining([
        "/api/v1/agency/tenants/{tenantId}/stats",
        "/api/v1/agency/tenants/{tenantId}/team-access",
        "/api/v1/documents",
        "/api/v1/fiscal/documents/{documentId}/artifacts/{format}",
      ]),
    );
    expect(Object.keys(openApiDocument.components.schemas)).toEqual(
      expect.arrayContaining([
        "AgencyStatsReport",
        "AgencyTeamAccessDirectory",
        "DocumentsWorkspaceResponse",
      ]),
    );
  });
});
