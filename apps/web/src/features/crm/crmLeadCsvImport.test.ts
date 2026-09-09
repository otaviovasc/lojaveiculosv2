import { describe, expect, it } from "vitest";
import { parseCrmLeadCsv } from "./crmLeadCsvImport";

describe("lead CSV import", () => {
  it("reads BOM, semicolons, escaped quotes and multiline names with source line numbers", () => {
    const rows = parseCrmLeadCsv(
      '\uFEFFNome;Telefone;E-mail\r\n"Ana; \"\"Silva\"\"";(11) 99999-1234;ana@example.com\r\n"Bia\nSantos";;bia@example.com\r\n',
    );
    expect(rows).toEqual([
      {
        line: 2,
        value: {
          buyerName: 'Ana; "Silva"',
          buyerPhone: "(11) 99999-1234",
          buyerEmail: "ana@example.com",
        },
        errors: [],
      },
      {
        line: 3,
        value: { buyerName: "Bia\nSantos", buyerEmail: "bia@example.com" },
        errors: [],
      },
    ]);
  });
  it("keeps invalid data visible for preview and rejects malformed structure", () => {
    const rows = parseCrmLeadCsv(
      "nome,telefone,email\nAna,123,no-email\nBia,,bia@example.com,extra",
    );
    expect(rows[0]?.errors).toEqual(["Telefone inválido.", "E-mail inválido."]);
    expect(rows[1]?.errors).toContain(
      "Quantidade de colunas diferente do cabeçalho.",
    );
    expect(() => parseCrmLeadCsv('nome,telefone\n"Ana,5511999991234')).toThrow(
      "Aspas não fechadas",
    );
    expect(() =>
      parseCrmLeadCsv("nome,name,email\nAna,Ana,a@example.com"),
    ).toThrow("colunas repetidas");
    expect(() => parseCrmLeadCsv("nome,email\n")).toThrow(
      "não contém contatos",
    );
  });
  it("bounds batch size before uploading", () => {
    expect(() =>
      parseCrmLeadCsv("nome,email\n" + "Ana,a@example.com\n".repeat(501)),
    ).toThrow("500");
    expect(() => parseCrmLeadCsv("x".repeat(2_000_001))).toThrow("2 MB");
  });
});
