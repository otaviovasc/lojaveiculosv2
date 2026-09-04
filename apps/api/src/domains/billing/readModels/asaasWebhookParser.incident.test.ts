import { describe, expect, it } from "vitest";
import { parseAsaasWebhook } from "./asaasWebhookParser.js";

describe("Asaas staging checkout correlation", () => {
  it("accepts CHECKOUT_PAID without a subscription id", () => {
    expect(
      parseAsaasWebhook({
        checkout: {
          customer: "cus_real_1",
          id: "chk_real_1",
          status: "PAID",
        },
        event: "CHECKOUT_PAID",
        id: "evt_checkout_paid_1",
      }).checkout,
    ).toMatchObject({
      providerCheckoutId: "chk_real_1",
      providerSubscriptionId: null,
      status: "paid",
    });
  });

  it("captures checkout session and hire reference from the later real payment", () => {
    expect(
      parseAsaasWebhook({
        event: "PAYMENT_CONFIRMED",
        id: "evt_payment_confirmed_1",
        payment: {
          checkoutSession: "chk_real_1",
          externalReference: "83262608-0000-4000-8000-000000000099",
          id: "pay_real_1",
          subscription: "sub_real_1",
          value: 197,
        },
      }).payment,
    ).toMatchObject({
      externalReference: "83262608-0000-4000-8000-000000000099",
      providerCheckoutId: "chk_real_1",
      providerPaymentId: "pay_real_1",
      providerSubscriptionId: "sub_real_1",
      status: "paid",
    });
  });

  it("captures the provider event timestamp used for monotonic subscription updates", () => {
    const parsed = parseAsaasWebhook({
      dateCreated: "2026-08-25T12:30:00.000Z",
      event: "SUBSCRIPTION_UPDATED",
      id: "evt_subscription_1",
      subscription: {
        id: "sub_real_1",
        nextDueDate: "2026-09-25",
        status: "ACTIVE",
      },
    });

    expect(parsed.occurredAt).toEqual(new Date("2026-08-25T12:30:00.000Z"));
    expect(parsed.subscription?.status).toBe("active");
  });
});
