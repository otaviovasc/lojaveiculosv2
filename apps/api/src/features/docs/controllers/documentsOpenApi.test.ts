import { describe, expect, it } from "vitest";
import { documentsPaths, documentsSchemas } from "./documentsOpenApi.js";

describe("documents OpenAPI", () => {
  it("publishes the complete paginated workspace response", () => {
    expect(documentsSchemas.DocumentsWorkspaceResponse).toMatchObject({
      additionalProperties: false,
      required: ["documents", "limit", "offset", "total"],
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 200 },
        offset: { type: "integer", minimum: 0 },
        total: { type: "integer", minimum: 0 },
      },
    });
  });

  it("publishes the zero-based offset query contract", () => {
    expect(
      documentsPaths["/api/v1/documents"].get.parameters.find(
        (parameter) => parameter.name === "offset",
      ),
    ).toEqual({
      in: "query",
      name: "offset",
      required: false,
      schema: { type: "integer", minimum: 0, default: 0 },
    });
  });
});
