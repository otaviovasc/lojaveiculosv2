import { vi } from "vitest";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";

export function createTestCrmMessagingGateway(
  overrides: Partial<CrmMessagingGateway>,
): CrmMessagingGateway {
  const send = vi.fn(async () => ({
    externalId: "test-whatsapp-outbound",
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    raw: {},
  }));
  return {
    configureWebhooks: vi.fn(async () => ({ results: [] })),
    deleteMessage: vi.fn(async () => ({ deleted: true })),
    disconnectConnection: vi.fn(async () => ({ disconnected: true as const })),
    getConnectionStatus: vi.fn(async () => ({
      checkedAt: new Date("2026-07-02T19:00:00.000Z"),
      connected: false,
      connectedPhone: null,
      providerStatus: "unknown" as const,
      smartphoneConnected: null,
    })),
    listCatalogProducts: vi.fn(async () => ({
      cartEnabled: null,
      nextCursor: null,
      products: [],
      raw: {},
    })),
    sendCatalog: send,
    sendMedia: send,
    sendProduct: send,
    removeReaction: send,
    sendReaction: send,
    sendText: send,
    sendTemplate: send,
    ...overrides,
  };
}
