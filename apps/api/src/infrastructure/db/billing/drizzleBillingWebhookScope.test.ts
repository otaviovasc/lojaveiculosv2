import { describe, expect, it } from "vitest";
import {
  chooseCorrelatedHire,
  externalReferenceMatchesCandidate,
} from "./drizzleBillingWebhookScope.js";
import {
  paymentScopeMatchesHire,
  providerScopedIdentitiesCanBind,
} from "./drizzleBillingWebhookIdentity.js";

type HireCandidate = {
  id: string;
  status: "activation_pending" | "failed" | "paid_active" | "payment_pending";
};

describe("chooseCorrelatedHire", () => {
  it("selects the pending renewal when a provider subscription is reused", () => {
    const previous = candidate("previous", "paid_active");
    const renewal = candidate("renewal", "payment_pending");

    expect(chooseCorrelatedHire([[renewal, previous]])).toEqual(renewal);
  });

  it("intersects checkout or external-reference evidence with reused subscription evidence", () => {
    const previous = candidate("previous", "paid_active");
    const renewal = candidate("renewal", "activation_pending");

    expect(chooseCorrelatedHire([[renewal, previous], [renewal]])).toEqual(
      renewal,
    );
  });

  it("keeps contradictory provider identities pending reconciliation", () => {
    const first = candidate("first", "payment_pending");
    const second = candidate("second", "payment_pending");

    expect(chooseCorrelatedHire([[first], [second]])).toBeNull();
  });

  it("allows corrected evidence to repair a previously failed hire", () => {
    const failed = candidate("failed", "failed");

    expect(chooseCorrelatedHire([[failed]])).toEqual(failed);
  });
});

describe("paymentScopeMatchesHire", () => {
  it("rejects an existing payment from store A correlated to a hire from store B", () => {
    expect(
      paymentScopeMatchesHire(
        {
          storeId: "store_a",
          subscriptionId: "subscription_a",
          tenantId: "tenant_1",
        },
        {
          storeId: "store_b",
          subscriptionId: "subscription_b",
          tenantId: "tenant_1",
        },
      ),
    ).toBe(false);
  });

  it("requires tenant, store, and subscription identity to match", () => {
    const scope = {
      storeId: "store_a",
      subscriptionId: "subscription_a",
      tenantId: "tenant_1",
    };

    expect(paymentScopeMatchesHire(scope, scope)).toBe(true);
    expect(
      paymentScopeMatchesHire(scope, { ...scope, tenantId: "tenant_2" }),
    ).toBe(false);
  });
});

describe("externalReferenceMatchesCandidate", () => {
  it("rejects an unknown external reference even when another identity is known", () => {
    expect(
      externalReferenceMatchesCandidate("hire_unknown", null, {
        id: "hire_from_known_payment",
      }),
    ).toBe(false);
  });

  it("rejects an unknown external reference with a known subscription candidate", () => {
    expect(
      externalReferenceMatchesCandidate("hire_unknown", null, {
        id: "hire_from_known_subscription",
      }),
    ).toBe(false);
  });

  it("rejects a cross-hire intersection", () => {
    expect(
      externalReferenceMatchesCandidate(
        "hire_from_reference",
        { id: "hire_from_reference" },
        { id: "hire_from_subscription" },
      ),
    ).toBe(false);
  });
});

describe("providerScopedIdentitiesCanBind", () => {
  it("rejects a known provider subscription paired with another known customer", () => {
    expect(
      providerScopedIdentitiesCanBind(
        {
          providerCustomerId: "cus_store_a",
          providerSubscriptionId: "sub_known",
        },
        {
          providerCustomerId: "cus_store_b",
          providerSubscriptionId: "sub_known",
        },
      ),
    ).toBe(false);
  });

  it("rejects existing-payment fallback when supplied subscription identity conflicts", () => {
    expect(
      providerScopedIdentitiesCanBind(
        {
          providerCustomerId: "cus_known",
          providerSubscriptionId: "sub_store_a",
        },
        {
          providerCustomerId: "cus_known",
          providerSubscriptionId: "sub_store_b",
        },
      ),
    ).toBe(false);
  });

  it("allows an unbound local identity to receive verified correlation evidence", () => {
    expect(
      providerScopedIdentitiesCanBind(
        { providerCustomerId: null, providerSubscriptionId: null },
        {
          providerCustomerId: "cus_verified",
          providerSubscriptionId: "sub_verified",
        },
      ),
    ).toBe(true);
  });
});

function candidate(id: string, status: HireCandidate["status"]): HireCandidate {
  return { id, status };
}
