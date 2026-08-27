import { describe, expect, it } from "vitest";
import { providerSubscriptionIdentityCanBind } from "./drizzleBillingSubscriptionWebhook.js";
import { subscriptionReferenceMatchesScope } from "./drizzleBillingSubscriptionReference.js";
import { subscriptionLifecycleIdentityMatches } from "./drizzleBillingSubscriptionLifecycle.js";

describe("provider subscription identity binding", () => {
  it("binds only the current hire when local identity is empty or exact", () => {
    expect(
      providerSubscriptionIdentityCanBind({
        currentHireId: "hire_current",
        hireProviderSubscriptionId: null,
        incomingProviderSubscriptionId: "sub_current",
        localProviderSubscriptionId: null,
        referencedHireId: "hire_current",
      }),
    ).toBe(true);
    expect(
      providerSubscriptionIdentityCanBind({
        currentHireId: "hire_current",
        hireProviderSubscriptionId: "sub_current",
        incomingProviderSubscriptionId: "sub_current",
        localProviderSubscriptionId: "sub_current",
        referencedHireId: "hire_current",
      }),
    ).toBe(true);
  });

  it("rejects a deleted old subscription instead of replacing the current identity", () => {
    expect(
      providerSubscriptionIdentityCanBind({
        currentHireId: "hire_current",
        hireProviderSubscriptionId: "sub_current",
        incomingProviderSubscriptionId: "sub_deleted_old",
        localProviderSubscriptionId: "sub_current",
        referencedHireId: "hire_old",
      }),
    ).toBe(false);
  });
});

describe("subscriptionReferenceMatchesScope", () => {
  const subscription = {
    id: "subscription_1",
    providerSubscriptionId: "sub_known",
    storeId: "store_1",
    tenantId: "tenant_1",
  };

  it("rejects an unknown external reference for a known subscription", () => {
    expect(
      subscriptionReferenceMatchesScope(null, subscription, "sub_known"),
    ).toBe(false);
  });

  it("accepts active or prior paid hire evidence only in the exact scope", () => {
    const hire = {
      providerSubscriptionId: "sub_known",
      status: "paid_active" as const,
      storeId: "store_1",
      subscriptionId: "subscription_1",
      tenantId: "tenant_1",
    };
    expect(
      subscriptionReferenceMatchesScope(hire, subscription, "sub_known"),
    ).toBe(true);
    expect(
      subscriptionReferenceMatchesScope(
        { ...hire, storeId: "store_2" },
        subscription,
        "sub_known",
      ),
    ).toBe(false);
    expect(
      subscriptionReferenceMatchesScope(
        { ...hire, status: "failed" },
        subscription,
        "sub_known",
      ),
    ).toBe(false);
  });
});

describe("subscriptionLifecycleIdentityMatches", () => {
  it.each(["cancelled", "past_due"] as const)(
    "rejects a stale %s event after the provider subscription was replaced",
    (status) => {
      const oldProviderEvent = {
        expectedProvider: "asaas",
        expectedProviderSubscriptionId: "sub_old_event",
        status,
      };
      expect(
        subscriptionLifecycleIdentityMatches(
          {
            provider: "asaas",
            providerSubscriptionId: "sub_replacement",
          },
          oldProviderEvent,
        ),
      ).toBe(false);
    },
  );

  it("accepts only the exact currently bound provider identity", () => {
    expect(
      subscriptionLifecycleIdentityMatches(
        { provider: "asaas", providerSubscriptionId: "sub_current" },
        {
          expectedProvider: "asaas",
          expectedProviderSubscriptionId: "sub_current",
        },
      ),
    ).toBe(true);
  });
});
