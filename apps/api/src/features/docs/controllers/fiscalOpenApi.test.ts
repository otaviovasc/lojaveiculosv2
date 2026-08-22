import { describe, expect, it } from "vitest";
import { fiscalPaths } from "./fiscalOpenApi.js";

describe("fiscal OpenAPI", () => {
  it("publishes the official PDF and XML artifact download contract", () => {
    const operation =
      fiscalPaths["/api/v1/fiscal/documents/{documentId}/artifacts/{format}"]
        .get;

    expect(operation.security).toEqual([
      { bearerAuth: ["fiscal.manage", "documents.download"] },
    ]);
    expect(
      operation.parameters.find((parameter) => parameter.name === "format"),
    ).toMatchObject({
      in: "path",
      required: true,
      schema: { type: "string", enum: ["pdf", "xml"] },
    });
    expect(Object.keys(operation.responses["200"].content)).toEqual([
      "application/pdf",
      "application/xml",
    ]);
    expect(Object.hasOwn(operation.responses, "404")).toBe(true);
    expect(Object.hasOwn(operation.responses, "409")).toBe(true);
    expect(Object.hasOwn(operation.responses, "503")).toBe(true);
  });
});
