import { describe, expect, it } from "vitest";
import {
  documentsRouteHash,
  readDocumentsRouteState,
} from "./documentsRouteState";

describe("documents route state", () => {
  it("round-trips a vehicle document deep link", () => {
    const hash = documentsRouteHash({
      documentId: "document 1",
      unitId: "unit/1",
    });

    expect(hash).toBe("#/documents?unitId=unit%2F1&documentId=document+1");
    expect(readDocumentsRouteState(hash)).toEqual({
      documentId: "document 1",
      unitId: "unit/1",
    });
  });

  it("ignores query parameters from another module", () => {
    expect(
      readDocumentsRouteState("#/sales?unitId=unit_1&documentId=document_1"),
    ).toEqual({ documentId: null, unitId: null });
  });
});
