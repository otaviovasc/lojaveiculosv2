import { describe, expect, it } from "vitest";
import {
  getReportDeltaLabel,
  getReportFunnelLabel,
  getReportKpiLabel,
  getReportSourceLabel,
} from "./reportsLabels";

describe("reportsLabels", () => {
  it("maps analytics enums and legacy labels to product language", () => {
    expect(getReportFunnelLabel("negotiating")).toBe("Em negociação");
    expect(getReportSourceLabel("public_site")).toBe("Site da loja");
    expect(getReportKpiLabel("Recebiveis")).toBe("Recebíveis");
    expect(getReportDeltaLabel("periodo atual")).toBe("período atual");
  });

  it("does not expose unknown analytics identifiers", () => {
    expect(getReportFunnelLabel("provider_internal_stage")).toBe("Outra etapa");
    expect(getReportSourceLabel("source_123")).toBe("Outra origem");
    expect(getReportKpiLabel("provider_metric_id")).toBe("Indicador comercial");
  });
});
