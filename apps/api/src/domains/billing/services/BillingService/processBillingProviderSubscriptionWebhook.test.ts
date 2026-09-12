import { describe, expect, it, vi } from "vitest";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";
import {
  createAuditSink,
  createBillingRepository,
  createProviderGateway,
  createWebhookContext,
  createWebhookRepository,
} from "../../testSupportProcessBillingProviderWebhook.js";

describe("subscription webhook ordering", () => {
  it("passes provider event identity and occurrence time to lifecycle ordering", async () => {
    const repository = createWebhookRepository();
    const syncProviderSubscription = vi.fn(repository.syncProviderSubscription);
    await processBillingProviderWebhook(
      createWebhookContext(createAuditSink()),
      {
        payload: {
          dateCreated: "2026-08-25T12:30:00.000Z",
          event: "SUBSCRIPTION_UPDATED",
          id: "evt_subscription_ordered",
          subscription: {
            id: "sub_memory",
            nextDueDate: "2026-09-25",
            status: "ACTIVE",
          },
        },
        provider: "asaas",
        webhookToken: "secret",
      },
      {
        billingRepository: createBillingRepository(),
        billingWebhookRepository: { ...repository, syncProviderSubscription },
        environment: "test",
        paymentProviderGateway: createProviderGateway("secret"),
      },
    );
    expect(syncProviderSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        eventOccurredAt: new Date("2026-08-25T12:30:00.000Z"),
        providerEventId: "evt_subscription_ordered",
      }),
    );
  });
});
