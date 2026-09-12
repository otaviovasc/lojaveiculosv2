import { Children, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  PdfPaymentsTable,
  PdfSignatureBlocks,
  PdfVehicleCardGrid,
  formatBuyerDocument,
  formatCnpj,
  formatCurrencyCents,
  formatPhoneForPdf,
  paymentMethodLabel,
} from "./reactPdfDocumentPrimitives.js";

describe("react PDF document primitives", () => {
  it("formats documents, currency, phones and payment methods for PDFs", () => {
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatBuyerDocument("32165498700")).toBe("321.654.987-00");
    expect(formatBuyerDocument("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatBuyerDocument("321.654.987-00")).toBe("321.654.987-00");
    expect(formatCurrencyCents(15490000).replace(/\s/g, " ")).toBe(
      "R$ 154.900,00",
    );
    expect(formatPhoneForPdf("5519988776655")).toBe("+55 (19) 98877-6655");
    expect(paymentMethodLabel("trade_in")).toBe("Troca");
    expect(paymentMethodLabel("financing")).toBe("Financiamento");
    expect(paymentMethodLabel("pix")).toBe("Pix");
  });

  it("keeps the vehicle card grid on a single page with all V1 fields", () => {
    const grid = PdfVehicleCardGrid({
      vehicle: {
        brand: "TOYOTA",
        chassi: "9BR53WECXP8123456",
        color: "Branco Polar",
        fuel: "Flex",
        manufactureYear: 2022,
        model: "COROLLA",
        modelYear: 2023,
        plate: "BRZ-2C45",
        renavam: "01234567890",
        version: "2.0 XEI FLEX",
        km: 38500,
      },
    });

    expect(grid.props.wrap).toBe(false);
    const labels = elementChildren(grid).map((field) =>
      textContent(elementChildren(field)[0]),
    );
    expect(labels).toEqual([
      "Marca / Modelo",
      "Versão",
      "Ano Fabricação / Modelo",
      "Cor",
      "Combustível",
      "Placa",
      "Renavam",
      "Quilometragem",
      "Laudo Cautelar",
    ]);
  });

  it("renders the premium payments table with header and total row", () => {
    const table = PdfPaymentsTable({
      payments: [
        {
          date: "18/07/2026",
          description: "Entrada via PIX",
          method: "pix",
          valueCents: 4000000,
        },
      ],
      totalCents: 15490000,
    });

    expect(table.props.wrap).toBe(false);
    const [header, row, total] = elementChildren(table);
    expect(elementChildren(header).map(textContent)).toEqual([
      "Forma",
      "Descrição",
      "Data",
      "Valor",
    ]);
    expect(textTree(row)).toContain("Entrada via PIX");
    expect(textTree(row)).toContain("R$ 40.000,00");
    expect(textTree(total)).toContain("TOTAL:");
    expect(textTree(total)).toContain("R$ 154.900,00");
  });

  it("groups signature blocks two per row and highlights the buyer notice", () => {
    const blocks = PdfSignatureBlocks({
      signatures: [
        { name: "Loja", role: "Vendedor(a)" },
        {
          highlightText: "(Reconhecer firma)",
          name: "Ana",
          role: "Comprador(a)",
        },
        { name: "Testemunha Um", role: "Testemunha 1" },
      ],
    });

    const rows = elementChildren(blocks);
    expect(rows).toHaveLength(2);
    expect(textTree(rows[0])).toContain("(Reconhecer firma)");
    expect(textTree(rows[1])).toContain("Testemunha Um");
  });
});

function elementChildren(element: ReactElement | undefined) {
  return Children.toArray(
    (element?.props as { children?: ReactNode } | undefined)?.children,
  ) as ReactElement<Record<string, unknown>>[];
}

function textContent(element: ReactElement | undefined): string {
  return String(
    (element?.props as { children?: ReactNode } | undefined)?.children ?? "",
  );
}

function textTree(element: ReactElement | undefined): string {
  if (!element) return "";
  const children = (element.props as { children?: ReactNode }).children;
  return Children.toArray(children)
    .map((child) =>
      typeof child === "object" && child !== null && "props" in child
        ? textTree(child as ReactElement)
        : String(child ?? ""),
    )
    .join(" ");
}
