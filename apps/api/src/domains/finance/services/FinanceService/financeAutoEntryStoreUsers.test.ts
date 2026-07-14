import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import { createTestFinanceRepository } from "../../testSupportFinanceRepository.js";
import { createFinanceAutoEntryRule } from "./createFinanceAutoEntryRule.js";
import type { FinanceServicePorts } from "./serviceSupport.js";
import { updateFinanceAutoEntryRule } from "./updateFinanceAutoEntryRule.js";

describe("automatic finance entry store users", () => {
  it("rejects sellers and fixed recipients outside the active store", async () => {
    const repository = createTestFinanceAutoEntryRepository();
    const outsiderId = "10000000-0000-4000-8000-000000000099";
    repository.inactiveStoreMemberUserIds.add(outsiderId);
    const ports: FinanceServicePorts = {
      documentRepository: createTestDocumentRepository(),
      financeAutoEntryRepository: repository,
      financeRepository: createTestFinanceRepository(),
    };
    const definition = {
      calculation: { amountCents: 1_000, kind: "fixed" as const },
      event: "vehicle_sale_closed" as const,
      outputType: "commission" as const,
      timing: { kind: "same_day" as const },
    };

    await expect(
      createFinanceAutoEntryRule(
        context(),
        { ...definition, sellerUserId: outsiderId },
        ports,
      ),
    ).rejects.toThrow("must have an active membership in the current store");

    const rule = await createFinanceAutoEntryRule(context(), definition, ports);
    await expect(
      updateFinanceAutoEntryRule(
        context(),
        {
          recipient: { kind: "fixed_user", userId: outsiderId },
          ruleId: rule.id,
        },
        ports,
      ),
    ).rejects.toThrow("must have an active membership in the current store");
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["finance.auto_entries.manage", "finance.read"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
