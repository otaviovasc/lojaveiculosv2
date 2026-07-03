import { describe, expect, it } from "vitest";
import { toTemplateClauses } from "./drizzleDocumentTemplates.js";

describe("drizzle document template adapter", () => {
  it("reads current string clauses and legacy object clauses", () => {
    expect(
      toTemplateClauses([
        "Cláusula atual",
        { title: "Legada", body: "Cláusula legada" },
        { title: "Sem corpo" },
        "",
        null,
      ]),
    ).toEqual(["Cláusula atual", "Cláusula legada"]);
  });
});
