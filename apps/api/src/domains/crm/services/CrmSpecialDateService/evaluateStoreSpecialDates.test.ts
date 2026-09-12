import { describe, expect, it, vi } from "vitest";
import { evaluateStoreSpecialDates } from "./evaluateStoreSpecialDates.js";
import { createMemoryCrmSpecialDateRepository } from "../../testSupportSpecialDates.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/types.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";

function createContext(overrides?: Partial<ServiceContext>): ServiceContext {
  return {
    actor: { id: "user-1", kind: "user" },
    audit: { record: vi.fn() },
    entitlements: ["crm"],
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as never,
    permissions: [
      "crm.messaging.connection.setup",
      "crm.scheduled_messages.process",
    ],
    platformAdmin: false,
    requestId: "req-1",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    ...overrides,
  };
}

const mockConnectionRepo = {
  findConnectionById: vi.fn().mockResolvedValue({
    channel: "whatsapp",
    displayName: "WhatsApp Store",
    id: "conn-1",
    provider: "zapi",
    status: "active",
    storeId: "store-1",
    tenantId: "tenant-1",
  }),
} as unknown as CrmConnectionRepository;

describe("evaluateStoreSpecialDates", () => {
  it("schedules a birthday message and enforces once-per-year idempotency", async () => {
    const specialDateRepo = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:lead-1",
          name: "Lucas Mendes",
          phone: "5511999991111",
          rawDate: "1995-09-07",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
        {
          key: "lead:lead-invalid-phone",
          name: "Contato sem telefone utilizável",
          phone: "123",
          rawDate: "1995-09-07",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
      ],
      configs: [
        {
          connectionId: "conn-1",
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "cfg-1",
          leadDays: 0,
          messageTemplate: "Parabéns, {nome}!",
          sendTime: "09:00",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
          updatedAt: new Date(),
        },
      ],
    });

    const ports = {
      crmConnectionRepository: mockConnectionRepo,
      crmSpecialDateRepository: specialDateRepo,
    } as CrmServicePorts;

    const context = createContext();

    // Reference date: 2026-09-07 10:00 BRT -> 13:00 UTC
    const referenceDate = new Date("2026-09-07T13:00:00.000Z");

    // First evaluation: should schedule message
    const result1 = await evaluateStoreSpecialDates(
      context,
      ports,
      referenceDate,
    );
    expect(result1.scheduledMessages).toBe(1);

    // Second evaluation on the same date: atomic deduplication must prevent duplicate schedule
    const result2 = await evaluateStoreSpecialDates(
      context,
      ports,
      referenceDate,
    );
    expect(result2.scheduledMessages).toBe(0);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm.special_date.evaluate",
        outcome: "succeeded",
      }),
    );
  });

  it("schedules purchase anniversary for sales from prior years", async () => {
    const specialDateRepo = createMemoryCrmSpecialDateRepository({
      anniversaryRecipients: [
        {
          closedAt: new Date("2024-09-07T14:00:00.000Z"), // 2 years ago
          key: "sale:sale-1",
          name: "Roberto Carlos",
          phone: "5511988882222",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
        {
          closedAt: new Date("2026-09-07T11:00:00.000Z"), // Same year: not an anniversary yet
          key: "sale:sale-2",
          name: "Novo Cliente",
          phone: "5511988883333",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
      ],
      configs: [
        {
          connectionId: "conn-1",
          createdAt: new Date(),
          dateType: "purchaseAnniversary",
          enabled: true,
          id: "cfg-2",
          leadDays: 0,
          messageTemplate: "Olá, {nome}! Feliz aniversário do seu carro!",
          sendTime: "10:00",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
          updatedAt: new Date(),
        },
      ],
    });

    const ports = {
      crmConnectionRepository: mockConnectionRepo,
      crmSpecialDateRepository: specialDateRepo,
    } as CrmServicePorts;

    const context = createContext();
    const referenceDate = new Date("2026-09-07T13:00:00.000Z");

    const result = await evaluateStoreSpecialDates(
      context,
      ports,
      referenceDate,
    );
    expect(result.scheduledMessages).toBe(1);
  });

  it("skips execution when config is disabled", async () => {
    const specialDateRepo = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:lead-1",
          name: "Lucas Mendes",
          phone: "5511999991111",
          rawDate: "1995-09-07",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
      ],
      configs: [
        {
          connectionId: "conn-1",
          createdAt: new Date(),
          dateType: "birthday",
          enabled: false, // Disabled
          id: "cfg-1",
          leadDays: 0,
          messageTemplate: "Parabéns, {nome}!",
          sendTime: "09:00",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
          updatedAt: new Date(),
        },
      ],
    });

    const ports = {
      crmConnectionRepository: mockConnectionRepo,
      crmSpecialDateRepository: specialDateRepo,
    } as CrmServicePorts;

    const context = createContext();
    const referenceDate = new Date("2026-09-07T13:00:00.000Z");

    const result = await evaluateStoreSpecialDates(
      context,
      ports,
      referenceDate,
    );
    expect(result.scheduledMessages).toBe(0);
  });

  it("enforces permission and CRM entitlement guardrails", async () => {
    const ports = {
      crmConnectionRepository: mockConnectionRepo,
      crmSpecialDateRepository: createMemoryCrmSpecialDateRepository(),
    } as CrmServicePorts;

    // Missing permission
    const unprivilegedContext = createContext({ permissions: ["lead.read"] });
    await expect(
      evaluateStoreSpecialDates(unprivilegedContext, ports),
    ).rejects.toThrow();

    // Missing CRM entitlement
    const unentitledContext = createContext({ entitlements: [] });
    await expect(
      evaluateStoreSpecialDates(unentitledContext, ports),
    ).rejects.toThrow();
  });
});
