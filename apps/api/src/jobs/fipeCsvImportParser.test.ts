import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveFipeCsvPath } from "./fipeCsvImportConfig.js";
import {
  assertFipeCsvHeader,
  parseCsvLine,
  parseFipeCsvRow,
} from "./fipeCsvImportParser.js";

describe("FIPE CSV import parser", () => {
  it("parses quoted prices, commas, and escaped quotes", () => {
    const fields = parseCsvLine(
      'CAR,21,Fiat,123,"Pulse ""Abarth"", 1.3",2026-1,2026 Gasolina,001234-5,G,Gasolina,"R$ 123.456,78",julho de 2026',
    );

    expect(fields).toEqual([
      "CAR",
      "21",
      "Fiat",
      "123",
      'Pulse "Abarth", 1.3',
      "2026-1",
      "2026 Gasolina",
      "001234-5",
      "G",
      "Gasolina",
      "R$ 123.456,78",
      "julho de 2026",
    ]);
  });

  it("rejects malformed headers and unterminated quoted rows", () => {
    expect(() => assertFipeCsvHeader("Type,Brand Code")).toThrow(
      "Invalid FIPE CSV header",
    );
    expect(parseFipeCsvRow('CAR,21,"Fiat')).toBeNull();
  });

  it("parses every row in the versioned FIPE snapshot", () => {
    const [header, ...rows] = readFileSync(resolveFipeCsvPath(), "utf8")
      .trimEnd()
      .split(/\r?\n/);

    expect(() => assertFipeCsvHeader(header ?? "")).not.toThrow();
    expect(rows).toHaveLength(50_605);
    expect(rows.map(parseFipeCsvRow)).not.toContain(null);
  });

  it("honors an explicitly configured CSV path", () => {
    expect(resolveFipeCsvPath("/tmp/custom-fipe.csv")).toBe(
      "/tmp/custom-fipe.csv",
    );
  });
});
