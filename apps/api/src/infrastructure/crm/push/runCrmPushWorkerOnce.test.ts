import { describe, expect, it, vi } from "vitest";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import { resolveCrmPushIconUrl } from "./crmPushIconUrl.js";
import { runCrmPushWorkerOnce } from "./runCrmPushWorkerOnce.js";

const lease = {
  attemptCount: 1,
  cycleId: "cycle",
  generation: 2,
  id: "intent",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  leaseExpiresAt: new Date("2026-01-01T00:01:00Z"),
  leaseToken: "lease",
  messageId: "message",
  state: "processing" as const,
  storeId: "store",
  tenantId: "tenant",
  threadId: "thread",
};

function repository(
  overrides: Partial<CrmPushRepository> = {},
): CrmPushRepository {
  return {
    claimDeliveryBatch: vi.fn().mockResolvedValue([lease]),
    disableInvalidSubscriptions: vi.fn().mockResolvedValue(0),
    disableSubscription: vi.fn().mockResolvedValue(true),
    enqueueCurrentGeneration: vi.fn(),
    getSettings: vi.fn(),
    listRecipientCandidates: vi.fn().mockResolvedValue([
      {
        activeMembership: true,
        canReadConversations: true,
        hasGlobalQueueVisibility: true,
        preferenceEnabled: true,
        subscriptionIds: ["subscription"],
        userId: "user",
      },
    ]),
    loadDeliveryContext: vi.fn().mockResolvedValue({
      assignedUserId: null,
      buyerName: "Buyer",
      connectionId: "connection",
      content: "hello",
      currentGeneration: 2,
      cycleId: "cycle",
      messageId: "message",
      messageType: "text",
      profilePhotoUrl: null,
      storeId: "store",
      storeSlug: "store-slug",
      tenantId: "tenant",
      threadId: "thread",
    }),
    markDeadLetter: vi.fn().mockResolvedValue("applied"),
    markDelivered: vi.fn().mockResolvedValue("applied"),
    registerOrTransferSubscription: vi.fn(),
    releaseGeneration: vi.fn().mockResolvedValue("applied"),
    retryDelivery: vi.fn().mockResolvedValue("applied"),
    setPreference: vi.fn(),
    ...overrides,
  };
}

describe("CRM push delivery worker", () => {
  it("does not forward an untrusted provider profile-photo origin", () => {
    expect(
      resolveCrmPushIconUrl(
        "https://provider.example/customer-private-photo",
        "https://app.test",
      ),
    ).toBe("https://app.test/icons/logo_lv.png");
    expect(
      resolveCrmPushIconUrl(
        "https://app.test/public/customer-photo.png",
        "https://app.test",
      ),
    ).toBe("https://app.test/public/customer-photo.png");
  });

  it("delivers eligible notifications and records provider acceptance", async () => {
    const repo = repository();
    const send = vi.fn().mockResolvedValue({
      invalidSubscriptionIds: ["invalid"],
      kind: "accepted",
      providerNotificationId: "provider-id",
    });
    await expect(
      runCrmPushWorkerOnce({
        batchSize: 25,
        leaseDurationMs: 60_000,
        maxAttempts: 8,
        now: new Date("2026-01-01T00:00:00Z"),
        provider: { send },
        publicAppUrl: "https://app.test",
        repository: repo,
      }),
    ).resolves.toMatchObject({ claimed: 1, delivered: 1 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: lease.idempotencyKey,
        subscriptionIds: ["subscription"],
        webUrl: "https://app.test/crm?storeSlug=store-slug&cycleId=cycle",
      }),
    );
    expect(repo.disableInvalidSubscriptions).toHaveBeenCalledWith({
      subscriptionIds: ["invalid"],
    });
  });

  it("releases stale generations without contacting OneSignal", async () => {
    const repo = repository({
      loadDeliveryContext: vi.fn().mockResolvedValue({
        currentGeneration: 3,
      }),
    });
    const send = vi.fn();
    const result = await runCrmPushWorkerOnce({
      batchSize: 25,
      leaseDurationMs: 60_000,
      maxAttempts: 8,
      provider: { send },
      publicAppUrl: "https://app.test",
      repository: repo,
    });
    expect(result.released).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("retries indeterminate failures with bounded backoff", async () => {
    const repo = repository();
    const now = new Date("2026-01-01T00:00:00Z");
    const result = await runCrmPushWorkerOnce({
      batchSize: 25,
      leaseDurationMs: 60_000,
      maxAttempts: 8,
      now,
      provider: {
        send: vi.fn().mockResolvedValue({
          errorCode: "onesignal_request_timeout",
          kind: "retryable_failure",
        }),
      },
      publicAppUrl: "https://app.test",
      repository: repo,
    });
    expect(result.retried).toBe(1);
    expect(repo.retryDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        nextAttemptAt: new Date(now.getTime() + 15_000),
      }),
    );
  });

  it("releases unassigned notifications when nobody has global visibility", async () => {
    const repo = repository({
      listRecipientCandidates: vi.fn().mockResolvedValue([
        {
          activeMembership: true,
          canReadConversations: true,
          hasGlobalQueueVisibility: false,
          preferenceEnabled: true,
          subscriptionIds: ["subscription"],
          userId: "user",
        },
      ]),
    });
    const result = await runCrmPushWorkerOnce({
      batchSize: 25,
      leaseDurationMs: 60_000,
      maxAttempts: 8,
      provider: { send: vi.fn() },
      publicAppUrl: "https://app.test",
      repository: repo,
    });
    expect(result.released).toBe(1);
    expect(repo.releaseGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no_eligible_recipients" }),
    );
  });

  it("disables and releases a generation when every subscription is invalid", async () => {
    const repo = repository();
    const result = await runCrmPushWorkerOnce({
      batchSize: 25,
      leaseDurationMs: 60_000,
      maxAttempts: 8,
      provider: {
        send: vi.fn().mockResolvedValue({
          errorCode: "onesignal_http_400",
          invalidSubscriptionIds: ["subscription"],
          kind: "permanent_failure",
        }),
      },
      publicAppUrl: "https://app.test",
      repository: repo,
    });
    expect(result.released).toBe(1);
    expect(repo.disableInvalidSubscriptions).toHaveBeenCalledWith({
      subscriptionIds: ["subscription"],
    });
    expect(repo.releaseGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no_subscriptions" }),
    );
  });
});
