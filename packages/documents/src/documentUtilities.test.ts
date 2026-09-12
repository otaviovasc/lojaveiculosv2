import { describe, expect, it } from "vitest";
import {
  findDocumentTemplateDefinition,
  getDefaultDocumentTemplate,
  interpolateSampleVariables,
  sampleValue,
  variablesForContext,
} from "./index.js";
import {
  blockText,
  clause,
  fields,
  heading,
  paragraph,
  signatures,
  table,
} from "./blockBuilders.js";

describe("document block builders", () => {
  it("creates each supported block with a stable type and unique id", () => {
    const title = heading("Contrato");
    const body = paragraph("Texto do contrato");
    const item = clause("Objeto", "Venda do veículo");
    const grid = fields("Dados", [
      { label: "Placa", token: "{{vehicle.plate}}" },
    ]);
    const simpleTable = table("Itens", ["Descrição"]);
    const presetTable = table("Parcelas", ["Valor"], "sale_payments");
    const signature = signatures(["Comprador", "Vendedor"]);

    expect(
      new Set([
        title.id,
        body.id,
        item.id,
        grid.id,
        simpleTable.id,
        presetTable.id,
        signature.id,
      ]).size,
    ).toBe(7);
    expect(title).toMatchObject({ text: "Contrato", type: "heading" });
    expect(body).toMatchObject({
      body: "Texto do contrato",
      type: "paragraph",
    });
    expect(item).toMatchObject({
      body: "Venda do veículo",
      label: "Objeto",
      type: "clause",
    });
    expect(grid).toMatchObject({ title: "Dados", type: "field_grid" });
    expect(simpleTable).toMatchObject({ title: "Itens", type: "table" });
    expect(simpleTable).not.toHaveProperty("preset");
    expect(presetTable).toMatchObject({
      preset: "sale_payments",
      type: "table",
    });
    expect(signature).toMatchObject({
      roles: ["Comprador", "Vendedor"],
      type: "signature",
    });
  });

  it("extracts text only from text-bearing blocks", () => {
    expect(blockText(heading("Título"))).toBe("Título");
    expect(blockText(paragraph("Parágrafo"))).toBe("Parágrafo");
    expect(blockText(clause("Cláusula", "Conteúdo"))).toBe("Conteúdo");
    expect(blockText(fields("Dados", []))).toBeNull();
    expect(blockText(table("Tabela", []))).toBeNull();
    expect(blockText(signatures([]))).toBeNull();
  });
});

describe("document template and variable utilities", () => {
  it("finds defaults only for known template keys", () => {
    const contract = findDocumentTemplateDefinition("sale_contract");

    expect(contract?.templateKey).toBe("sale_contract");
    expect(getDefaultDocumentTemplate("sale_contract")).toBe(contract);
    expect(findDocumentTemplateDefinition("not-a-template")).toBeNull();
    expect(getDefaultDocumentTemplate("not-a-template")).toBeNull();
  });

  it("selects variables for every document context", () => {
    expect(variablesForContext("store").map((item) => item.token)).toContain(
      "{{store.name}}",
    );
    expect(variablesForContext("vehicle").map((item) => item.token)).toContain(
      "{{vehicle.plate}}",
    );
    expect(variablesForContext("sale").map((item) => item.token)).toEqual(
      expect.arrayContaining(["{{buyer.name}}", "{{vehicle.title}}"]),
    );
    expect(
      variablesForContext("reservation").map((item) => item.token),
    ).toEqual(expect.arrayContaining(["{{buyer.name}}", "{{vehicle.title}}"]));
    expect(variablesForContext("customer").map((item) => item.token)).toContain(
      "{{buyer.document}}",
    );
    expect(variablesForContext("finance").map((item) => item.token)).toContain(
      "{{finance.salePrice}}",
    );
    expect(
      variablesForContext("test_drive").map((item) => item.token),
    ).toContain("{{driver.name}}");
    expect(variablesForContext("fiscal").map((item) => item.token)).toContain(
      "{{document.issuedAt}}",
    );
    expect(variablesForContext("report").map((item) => item.token)).toContain(
      "{{document.number}}",
    );
  });

  it("resolves catalog tokens and representative sample fallbacks", () => {
    expect(sampleValue("{{store.name}}")).toBe("Loja Exemplo Veiculos");
    expect(sampleValue("store.name")).toBe("Loja Exemplo Veiculos");
    expect(sampleValue(" phoneNumber ")).toBe("(11) 99999-9999");
    expect(sampleValue("billing.address")).toBe("Rua das Flores, 123 - Centro");
    expect(sampleValue("total_price")).toBe("R$ 126.900,00");
    expect(sampleValue("sale_date")).toBe("24/06/2026");
    expect(sampleValue("customer_name")).toBe("Ana Cliente");
    expect(sampleValue("customer_document")).toBe("123.456.789-00");
    expect(sampleValue("unknown.value")).toBe("Valor preenchido na emissão");
  });

  it("interpolates templates while preserving empty text", () => {
    expect(interpolateSampleVariables("")).toBe("");
    expect(
      interpolateSampleVariables("{{buyer.name}} — {{finance.salePrice}}"),
    ).toBe("Ana Cliente — R$ 126.900,00");
  });
});
