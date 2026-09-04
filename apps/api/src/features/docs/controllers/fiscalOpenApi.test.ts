import { describe, expect, it } from "vitest";
import { fiscalPaths } from "./fiscalOpenApi.js";
import { llmsText } from "./llmsText.js";

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

  it.each([
    {
      path: "/api/v1/fiscal/documents" as const,
      permissions: ["fiscal.manage", "fiscal.document.issue"],
      llmsContract:
        "requires fiscal.manage, fiscal.document.issue, and nfe entitlement",
    },
    {
      path: "/api/v1/fiscal/documents/{documentId}/cancel" as const,
      permissions: ["fiscal.manage", "fiscal.document.cancel"],
      llmsContract:
        "requires fiscal.manage, fiscal.document.cancel, and nfe entitlement",
    },
  ])(
    "keeps the $path permission contract aligned across OpenAPI and llms.txt",
    ({ path, permissions, llmsContract }) => {
      const operation = fiscalPaths[path].post;

      expect(operation.security).toEqual([{ bearerAuth: permissions }]);
      expect(operation.description).toContain(permissions[0]);
      expect(operation.description).toContain(permissions[1]);
      expect(operation.responses["403"].description).toContain(permissions[0]);
      expect(operation.responses["403"].description).toContain(permissions[1]);
      expect(llmsText).toContain(llmsContract);
    },
  );
});
