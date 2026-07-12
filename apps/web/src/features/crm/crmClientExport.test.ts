import { describe, expect, it } from "vitest";
import { buildLeadsCsv } from "./crmClientExport";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CRM client CSV export", () => {
  it("exports localized spreadsheet-safe customer data", () => {
    const lead: ProductCrmLead = {
      assignedUserId: null,
      buyerEmail: "+SUM(1,1)@example.invalid",
      buyerName: '=HYPERLINK("https://example.invalid")',
      buyerPhone: "@malicious",
      createdAt: "2026-07-11T23:30:00.000Z",
      id: "lead_internal_1",
      lastInteractionAt: null,
      listingId: "listing_internal_1",
      metadata: { cpf: "-1+1" },
      pipelineId: null,
      pipelineStageId: null,
      source: "public_site",
      status: "new",
      storeId: "store_internal_1",
      tenantId: "tenant_internal_1",
      updatedAt: "2026-07-11T23:30:00.000Z",
      vehicleTitle: "=CMD()",
    };

    const csv = buildLeadsCsv([lead]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      '"Nome";"Email";"Telefone";"CPF/CNPJ";"Origem";"Status";"Veículo";"Cadastro"',
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM(1,1)@example.invalid");
    expect(csv).toContain("'@malicious");
    expect(csv).toContain("'-1+1");
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain("Site");
    expect(csv).toContain("Novo");
    expect(csv).toContain("11/07/2026");
    expect(csv).not.toContain("lead_internal_1");
    expect(csv).not.toContain("store_internal_1");
  });
});
