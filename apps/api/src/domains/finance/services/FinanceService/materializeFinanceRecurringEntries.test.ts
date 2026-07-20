import { describe, expect, it } from "vitest";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CreateFinanceRecurringEntryInput,
  FinanceRecurrenceFrequency,
} from "../../ports/financeRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import {
  createTestFinanceRepository,
  type TestFinanceRepository,
} from "../../testSupportFinanceRepository.js";
import { materializeFinanceRecurringEntries } from "./materializeFinanceRecurringEntries.js";
import type { FinanceServicePorts } from "./serviceSupport.js";

describe("materializeFinanceRecurringEntries advancement", () => {
  it("generates monthly entries with clamped month-day advancement", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository, {
      frequency: "monthly",
      nextDueAt: new Date("2026-01-31T00:00:00.000Z"),
    });
    const asOf = new Date("2026-03-15T00:00:00.000Z");

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf },
      ports,
    );

    expect(result.generatedEntries).toHaveLength(2);
    expect(
      result.generatedEntries.map((entry) => entry.dueAt?.toISOString()),
    ).toEqual(["2026-01-31T00:00:00.000Z", "2026-02-28T00:00:00.000Z"]);
    expect(result.generatedEntries[0]).toMatchObject({
      amountCents: 15000,
      category: "Aluguel",
      metadata: {
        recurringEntryId: template.id,
        source: "finance_recurring",
      },
      name: "Aluguel",
      paidAt: null,
      status: "pending",
      storeId: "store_1",
      tenantId: "tenant_1",
      type: "expense",
    });

    const updated = await ports.financeRepository.findRecurringById({
      recurringEntryId: template.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(updated?.nextDueAt.toISOString()).toBe("2026-03-28T00:00:00.000Z");
    expect(updated?.lastGeneratedAt?.toISOString()).toBe(asOf.toISOString());
    expect(updated?.metadata).toMatchObject({ generatedCount: 2 });
    expect(updated?.metadata.exhaustedAt).toBeUndefined();
  });

  it("generates weekly entries seven days apart", async () => {
    const ports = createPorts();
    await createTemplate(ports.financeRepository, {
      frequency: "weekly",
      nextDueAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-06-21T00:00:00.000Z") },
      ports,
    );

    expect(
      result.generatedEntries.map((entry) => entry.dueAt?.toISOString()),
    ).toEqual([
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
      "2026-06-15T00:00:00.000Z",
    ]);
  });

  it("generates yearly entries clamping leap-day to February 28", async () => {
    const ports = createPorts();
    await createTemplate(ports.financeRepository, {
      frequency: "yearly",
      nextDueAt: new Date("2024-02-29T00:00:00.000Z"),
    });

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-03-01T00:00:00.000Z") },
      ports,
    );

    expect(
      result.generatedEntries.map((entry) => entry.dueAt?.toISOString()),
    ).toEqual([
      "2024-02-29T00:00:00.000Z",
      "2025-02-28T00:00:00.000Z",
      "2026-02-28T00:00:00.000Z",
    ]);
  });
});

function createPorts(): FinanceServicePorts & {
  financeRepository: TestFinanceRepository;
} {
  return {
    documentRepository: createTestDocumentRepository(),
    financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
    financeRepository: createTestFinanceRepository(),
  };
}

function context(permissions: string[] = ["finance.create"]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions,
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createTemplate(
  repository: TestFinanceRepository,
  overrides: Partial<CreateFinanceRecurringEntryInput> & {
    frequency?: FinanceRecurrenceFrequency;
  } = {},
) {
  return repository.createRecurringEntry({
    amountCents: 15000,
    category: "Aluguel",
    dayOfMonth: null,
    frequency: "monthly",
    metadata: {},
    name: "Aluguel",
    nextDueAt: new Date("2026-01-31T00:00:00.000Z"),
    sellerUserId: null,
    status: "pending",
    storeId: "store_1",
    tenantId: "tenant_1",
    type: "expense",
    ...overrides,
  });
}
