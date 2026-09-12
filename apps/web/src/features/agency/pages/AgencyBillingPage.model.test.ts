import { describe, expect, it, vi } from "vitest";
import {
  agencyBillingConfigurationLabels,
  startAgencyStorePlanHire,
} from "./AgencyBillingPage.model";

describe("AgencyBillingPage model", () => {
  it("turns provider configuration keys into actionable Portuguese", () => {
    expect(
      agencyBillingConfigurationLabels([
        "ASAAS_API_URL",
        "ASAAS_WEBHOOK_URL",
        "UNKNOWN_KEY",
      ]),
    ).toEqual([
      "Endereço da API do Asaas",
      "Endereço de confirmação automática",
      "Configuração complementar da integração",
    ]);
  });

  it("persists one store-scoped plan hire without changing effective selection first", async () => {
    const createStorePlanHire = vi.fn(async () => ({ id: "hire_1" }));
    await startAgencyStorePlanHire({
      api: { createStorePlanHire } as never,
      input: { idempotencyKey: "agency-hire-1", planId: "plan_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(createStorePlanHire).toHaveBeenCalledWith("tenant_1", "store_1", {
      idempotencyKey: "agency-hire-1",
      planId: "plan_1",
    });
  });
});
