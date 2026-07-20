import { describe, expect, it } from "vitest";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CreateFinanceRecurringEntryInput } from "../../ports/financeRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import {
  createTestFinanceRepository,
  type TestFinanceRepository,
} from "../../testSupportFinanceRepository.js";
import { materializeFinanceRecurringEntries } from "./materializeFinanceRecurringEntries.js";
import type { FinanceServicePorts } from "./serviceSupport.js";

describe("materializeFinanceRecurringEntries limits and scope", () => {
  it("stops at the occurrences cap and records exhaustedAt", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository, {
      frequency: "monthly",
      metadata: { notes: "Contrato anual", occurrences: 2 },
      nextDueAt: new Date("2026-01-10T00:00:00.000Z"),
    });
    const asOf = new Date("2026-06-01T00:00:00.000Z");

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf },
      ports,
    );

    expect(result.generatedEntries).toHaveLength(2);
    const exhausted = await ports.financeRepository.findRecurringById({
      recurringEntryId: template.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(exhausted?.metadata).toMatchObject({
      exhaustedAt: asOf.toISOString(),
      generatedCount: 2,
      notes: "Contrato anual",
      occurrences: 2,
    });
    expect(exhausted?.nextDueAt.toISOString()).toBe("2026-03-10T00:00:00.000Z");

    const rerun = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-07-01T00:00:00.000Z") },
      ports,
    );
    expect(rerun.generatedEntries).toHaveLength(0);
    const afterRerun = await ports.financeRepository.findRecurringById({
      recurringEntryId: template.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(afterRerun?.metadata.exhaustedAt).toBe(asOf.toISOString());
  });

  it("is idempotent for a repeated call with the same asOf", async () => {
    const ports = createPorts();
    await createTemplate(ports.financeRepository, {
      frequency: "monthly",
      nextDueAt: new Date("2026-01-10T00:00:00.000Z"),
    });
    const asOf = new Date("2026-02-15T00:00:00.000Z");

    const first = await materializeFinanceRecurringEntries(
      context(),
      { asOf },
      ports,
    );
    const second = await materializeFinanceRecurringEntries(
      context(),
      { asOf },
      ports,
    );

    expect(first.generatedEntries).toHaveLength(2);
    expect(second.generatedEntries).toHaveLength(0);
    expect(ports.financeRepository.entries).toHaveLength(2);
  });

  it("skips templates whose nextDueAt is in the future", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository, {
      nextDueAt: new Date("2027-01-01T00:00:00.000Z"),
    });

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-06-01T00:00:00.000Z") },
      ports,
    );

    expect(result.generatedEntries).toHaveLength(0);
    const untouched = await ports.financeRepository.findRecurringById({
      recurringEntryId: template.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(untouched?.lastGeneratedAt).toBeNull();
    expect(untouched?.nextDueAt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("skips cancelled templates", async () => {
    const ports = createPorts();
    await createTemplate(ports.financeRepository, {
      nextDueAt: new Date("2026-01-10T00:00:00.000Z"),
      status: "cancelled",
    });

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-06-01T00:00:00.000Z") },
      ports,
    );

    expect(result.generatedEntries).toHaveLength(0);
  });

  it("does not touch templates from another store", async () => {
    const ports = createPorts();
    const otherStoreTemplate = await createTemplate(ports.financeRepository, {
      nextDueAt: new Date("2026-01-10T00:00:00.000Z"),
      storeId: "store_2",
    });

    const result = await materializeFinanceRecurringEntries(
      context(),
      { asOf: new Date("2026-06-01T00:00:00.000Z") },
      ports,
    );

    expect(result.generatedEntries).toHaveLength(0);
    const untouched = await ports.financeRepository.findRecurringById({
      recurringEntryId: otherStoreTemplate.id,
      storeId: "store_2",
      tenantId: "tenant_1",
    });
    expect(untouched?.lastGeneratedAt).toBeNull();
    expect(
      ports.financeRepository.entries.filter(
        (entry) => entry.storeId === "store_2",
      ),
    ).toHaveLength(0);
  });

  it("requires the finance.create permission", async () => {
    const ports = createPorts();

    await expect(
      materializeFinanceRecurringEntries(
        context(["finance.read"]),
        { asOf: new Date("2026-06-01T00:00:00.000Z") },
        ports,
      ),
    ).rejects.toThrow("Missing permission: finance.create");
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
  overrides: Partial<CreateFinanceRecurringEntryInput> = {},
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
