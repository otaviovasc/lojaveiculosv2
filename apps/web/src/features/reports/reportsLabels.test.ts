import { describe, expect, it } from "vitest";
import {
  getReportAgeBucketLabel,
  getReportDocumentKindLabel,
  getReportFunnelLabel,
  getReportSourceLabel,
} from "./reportsLabels";

describe("reportsLabels", () => {
  it("maps analytics enums to product language", () => {
    expect(getReportFunnelLabel("negotiating")).toBe("Em negociação");
    expect(getReportSourceLabel("public_site")).toBe("Site da loja");
    expect(getReportAgeBucketLabel("days31to60")).toBe("31–60 dias");
    expect(getReportAgeBucketLabel("over90")).toBe("Mais de 90 dias");
    expect(getReportDocumentKindLabel("sale_contract")).toBe(
      "Contrato de venda",
    );
  });

  it("does not expose unknown analytics identifiers", () => {
    expect(getReportFunnelLabel("provider_internal_stage")).toBe("Outra etapa");
    expect(getReportSourceLabel("source_123")).toBe("Outra origem");
    expect(getReportAgeBucketLabel("bucket_123")).toBe("Idade desconhecida");
    expect(getReportDocumentKindLabel("provider_internal_document")).toBe(
      "Outro documento",
    );
  });
});
