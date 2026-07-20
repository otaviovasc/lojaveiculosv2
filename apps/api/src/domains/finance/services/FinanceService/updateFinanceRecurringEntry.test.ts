import { describe, expect, it } from "vitest";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import {
  createTestFinanceRepository,
  type TestFinanceRepository,
} from "../../testSupportFinanceRepository.js";
import { cancelFinanceRecurringEntry } from "./cancelFinanceRecurringEntry.js";
import {
  FinanceRecurringEntryNotFoundError,
  type FinanceServicePorts,
} from "./serviceSupport.js";
import { updateFinanceRecurringEntry } from "./updateFinanceRecurringEntry.js";

describe("updateFinanceRecurringEntry", () => {
  it("applies provided fields to the scoped template", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository);

    const updated = await updateFinanceRecurringEntry(
      context(),
      {
        amountCents: 22000,
        category: "Energia",
        dayOfMonth: 15,
        frequency: "weekly",
        name: "Energia escritorio",
        nextDueAt: new Date("2026-08-15T00:00:00.000Z"),
        recurringEntryId: template.id,
        sellerUserId: "seller_1",
      },
      ports,
    );

    expect(updated).toMatchObject({
      amountCents: 22000,
      category: "Energia",
      dayOfMonth: 15,
      frequency: "weekly",
      id: template.id,
      name: "Energia escritorio",
      sellerUserId: "seller_1",
      status: "pending",
    });
    expect(updated.nextDueAt.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });

  it("replaces metadata instead of merging it", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository);

    const updated = await updateFinanceRecurringEntry(
      context(),
      {
        metadata: { notes: "Novo contrato" },
        recurringEntryId: template.id,
      },
      ports,
    );

    expect(updated.metadata).toEqual({ notes: "Novo contrato" });
  });

  it("rejects updates for templates outside the actor scope", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository, {
      storeId: "store_2",
    });

    await expect(
      updateFinanceRecurringEntry(
        context(),
        { name: "Fora de escopo", recurringEntryId: template.id },
        ports,
      ),
    ).rejects.toBeInstanceOf(FinanceRecurringEntryNotFoundError);
  });

  it("requires the finance.update permission", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository);

    await expect(
      updateFinanceRecurringEntry(
        context(["finance.read"]),
        { name: "Sem permissao", recurringEntryId: template.id },
        ports,
      ),
    ).rejects.toThrow("Missing permission: finance.update");
  });
});

describe("cancelFinanceRecurringEntry", () => {
  it("cancels the template and merges the reason into metadata", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository);

    const cancelled = await cancelFinanceRecurringEntry(
      context(),
      { reason: "Contrato encerrado", recurringEntryId: template.id },
      ports,
    );

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.metadata).toEqual({
      cancelledReason: "Contrato encerrado",
      notes: "Contrato anual",
      occurrences: 12,
    });
  });

  it("rejects cancellation for unknown templates", async () => {
    const ports = createPorts();

    await expect(
      cancelFinanceRecurringEntry(
        context(),
        { recurringEntryId: "recurring_missing" },
        ports,
      ),
    ).rejects.toBeInstanceOf(FinanceRecurringEntryNotFoundError);
  });

  it("requires the finance.update permission", async () => {
    const ports = createPorts();
    const template = await createTemplate(ports.financeRepository);

    await expect(
      cancelFinanceRecurringEntry(
        context(["finance.read"]),
        { recurringEntryId: template.id },
        ports,
      ),
    ).rejects.toThrow("Missing permission: finance.update");
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

function context(permissions: string[] = ["finance.update"]) {
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
  overrides: { storeId?: string } = {},
) {
  return repository.createRecurringEntry({
    amountCents: 15000,
    category: "Aluguel",
    dayOfMonth: 10,
    frequency: "monthly",
    metadata: { notes: "Contrato anual", occurrences: 12 },
    name: "Aluguel",
    nextDueAt: new Date("2026-08-10T00:00:00.000Z"),
    sellerUserId: null,
    status: "pending",
    storeId: overrides.storeId ?? "store_1",
    tenantId: "tenant_1",
    type: "expense",
  });
}
