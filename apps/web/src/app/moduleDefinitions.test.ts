import { describe, expect, it } from "vitest";
import { moduleDefinitions } from "./moduleDefinitions";

describe("module definitions", () => {
  it("describes billing with the cumulative contract model", () => {
    expect(moduleDefinitions.billing.description).toMatch(
      /contratos.*planos cumulativos/i,
    );
    expect(moduleDefinitions.billing.description).not.toMatch(/add-ons/i);
  });
});
