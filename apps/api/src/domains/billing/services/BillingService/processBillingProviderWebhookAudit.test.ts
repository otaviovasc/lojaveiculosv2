import { describe, expect, it, vi } from "vitest";
import {
  createAuditSink,
  createBillingRepository,
  createProviderGateway,
  createWebhookContext,
  createWebhookRepository,
} from "../../testSupportProcessBillingProviderWebhook.js";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";

describe("processBillingProviderWebhook audit boundary", () => {
  it("does not apply provider evidence before the observed audit is durable", async () => {
    const audit = createAuditSink();
    vi.mocked(audit.record).mockRejectedValueOnce(
      new Error("audit unavailable"),
    );
    const repository = createWebhookRepository();
    const upsertProviderPayment = vi.fn(repository.upsertProviderPayment);

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(audit),
        paymentWebhook("evt_observation_failed"),
        ports({ ...repository, upsertProviderPayment }),
      ),
    ).rejects.toThrow("audit unavailable");
    expect(upsertProviderPayment).not.toHaveBeenCalled();
  });

  it("keeps a processed event processed when only the outcome audit fails", async () => {
    const audit = createAuditSink();
    vi.mocked(audit.record)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("outcome audit unavailable"));
    const repository = createWebhookRepository();
    const updateStatus = vi.fn(repository.updateStatus);

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(audit),
        paymentWebhook("evt_outcome_audit_failed"),
        ports({ ...repository, updateStatus }),
      ),
    ).resolves.toMatchObject({ status: "processed" });
    expect(updateStatus).toHaveBeenCalledTimes(1);
    expect(updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed" }),
    );
  });
});

function paymentWebhook(providerEventId: string) {
  return {
    payload: {
      event: "PAYMENT_CONFIRMED",
      id: providerEventId,
      payment: {
        confirmedDate: "2026-08-26",
        id: `pay_${providerEventId}`,
        subscription: "sub_memory",
        value: 197,
      },
    },
    provider: "asaas" as const,
    webhookToken: "secret",
  };
}

function ports(
  billingWebhookRepository: ReturnType<typeof createWebhookRepository>,
) {
  return {
    billingRepository: createBillingRepository(),
    billingWebhookRepository,
    environment: "test",
    paymentProviderGateway: createProviderGateway("secret"),
  };
}
