import { describe, expect, it } from "vitest";
import {
  getReportAgeBucketLabel,
  getReportFunnelLabel,
  getReportSourceLabel,
} from "./reportsLabels";

describe("reportsLabels", () => {
  it("maps analytics enums to product language", () => {
    expect(getReportFunnelLabel("negotiating")).toBe("Em negociação");
    expect(getReportSourceLabel("public_site")).toBe("Site da loja");
    expect(getReportAgeBucketLabel("days31to60")).toBe("31–60 dias");
    expect(getReportAgeBucketLabel("over90")).toBe("Mais de 90 dias");
  });

  it("does not expose unknown analytics identifiers", () => {
    expect(getReportFunnelLabel("provider_internal_stage")).toBe("Outra etapa");
    expect(getReportSourceLabel("source_123")).toBe("Outra origem");
    expect(getReportAgeBucketLabel("bucket_123")).toBe("Idade desconhecida");
  });
});
