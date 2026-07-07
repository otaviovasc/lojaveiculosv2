import { describe, expect, it } from "vitest";
import {
  documentTemplateKeys,
  getDocumentTemplateClauses,
  interpolateSampleVariables,
  isDocumentTemplateKey,
  listDocumentTemplateDefinitions,
  variablesForContext,
} from "./index.js";

describe("document template catalog", () => {
  it("defines every migrated V1 document exactly once", () => {
    const templates = listDocumentTemplateDefinitions();
    const keys = templates.map((template) => template.templateKey);

    expect(keys).toHaveLength(documentTemplateKeys.length);
    expect(new Set(keys).size).toBe(documentTemplateKeys.length);
    expect(keys).toEqual(expect.arrayContaining([...documentTemplateKeys]));
  });

  it("marks editable contracts and locked generated reports distinctly", () => {
    const templates = listDocumentTemplateDefinitions();
    const editable = templates.filter(
      (template) => template.mode === "editable",
    );
    const locked = templates.filter((template) => template.mode === "locked");

    expect(editable.map((template) => template.templateKey)).toContain(
      "sale_contract",
    );
    expect(locked.map((template) => template.templateKey)).toEqual(
      expect.arrayContaining([
        "financial_report",
        "vehicle_checklist",
        "internal_invoice_control",
      ]),
    );
    expect(locked.every((template) => template.defaultBlocks.length > 0)).toBe(
      true,
    );
  });

  it("extracts editable clause text from structured blocks", () => {
    const saleContract = listDocumentTemplateDefinitions().find(
      (template) => template.templateKey === "sale_contract",
    );

    expect(saleContract).toBeDefined();
    expect(
      getDocumentTemplateClauses(saleContract?.defaultBlocks ?? []),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("{{buyer.name}}"),
        expect.stringContaining("{{vehicle.title}}"),
      ]),
    );
  });

  it("validates template keys and renders sample variables for previews", () => {
    expect(isDocumentTemplateKey("sale_receipt")).toBe(true);
    expect(isDocumentTemplateKey("unknown_document")).toBe(false);
    expect(
      variablesForContext("sale").map((variable) => variable.token),
    ).toEqual(expect.arrayContaining(["{{store.name}}", "{{buyer.name}}"]));
    expect(interpolateSampleVariables("Emitido por {{store.name}}")).toBe(
      "Emitido por Loja Exemplo Veiculos",
    );
  });
});
