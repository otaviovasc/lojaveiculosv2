import { describe, expect, it } from "vitest";
import {
  renderDocumentTemplatePreview,
  variableSample,
} from "./documentTemplatePreviewModel";

describe("document template preview", () => {
  it("renders template variables with sample document data", () => {
    const preview = renderDocumentTemplatePreview(
      {
        clauses: [
          "Comprador {{buyer.name}} compra {{vehicle.title}} por {{finance.salePrice}}.",
        ],
        title: "Contrato de {{vehicle.plate}}",
      },
      "sale_contract",
    );

    expect(preview.title).toBe("Contrato de ABC1D23");
    expect(preview.clauses[0]).toBe(
      "Comprador Ana Cliente compra Fiat Toro Volcano 2023 por R$ 126.900,00.",
    );
    expect(preview.sections[0]?.fields).toContainEqual({
      label: "Comprador",
      value: "Ana Cliente",
    });
    expect(preview.documentNumber).toBe("Venda nº 2048");
  });

  it("keeps the live preview stable for empty draft fields", () => {
    const preview = renderDocumentTemplatePreview(
      {
        clauses: [""],
        title: "",
      },
      "reservation_receipt",
    );

    expect(preview.title).toBe("Recibo de sinal");
    expect(preview.clauses).toEqual(["Cláusula em branco."]);
    expect(preview.documentNumber).toBe("Reserva nº 1024");
    expect(variableSample("{{unknown}}")).toBe("Valor preenchido na emissão");
  });
});
