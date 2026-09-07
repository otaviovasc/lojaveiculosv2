import { describe, expect, it } from "vitest";
import { createMemoryCrmSpecialDateRepository } from "./testSupportSpecialDates.js";

describe("special-date memory persistence support", () => {
  it("keeps duplicate contact candidates until date matching", async () => {
    const repository = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:first",
          name: "Cliente",
          phone: "+55 (11) 99900-0001",
          rawDate: "1990-01-01",
          storeId: "store_test" as never,
          tenantId: "tenant_test" as never,
        },
        {
          key: "lead:second",
          name: "Cliente",
          phone: "5511999000001",
          rawDate: "1990-09-08",
          storeId: "store_test" as never,
          tenantId: "tenant_test" as never,
        },
      ],
    });

    const candidates = await repository.findBirthdayRecipients(
      "tenant_test" as never,
      "store_test" as never,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map(({ key }) => key)).toEqual([
      "phone:5511999000001",
      "phone:5511999000001",
    ]);
  });

  it("returns only candidates belonging to the requested scope", async () => {
    const repository = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:in-scope",
          name: "Escopo atual",
          phone: "5511999000001",
          rawDate: "1990-09-08",
          storeId: "store_test" as never,
          tenantId: "tenant_test" as never,
        },
        {
          key: "lead:other-store",
          name: "Outra loja",
          phone: "5511999000002",
          rawDate: "1990-09-08",
          storeId: "store_other" as never,
          tenantId: "tenant_test" as never,
        },
        {
          key: "lead:other-tenant",
          name: "Outro tenant",
          phone: "5511999000003",
          rawDate: "1990-09-08",
          storeId: "store_test" as never,
          tenantId: "tenant_other" as never,
        },
      ],
    });

    const candidates = await repository.findBirthdayRecipients(
      "tenant_test" as never,
      "store_test" as never,
    );

    expect(candidates.map(({ name }) => name)).toEqual(["Escopo atual"]);
  });
});
