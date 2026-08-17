import { describe, expect, it } from "vitest";
import { toInquiry } from "./drizzleFinancingMappers.js";

describe("Drizzle financing inquiry mapper", () => {
  it("keeps unavailable provider-history terms and consent unknown", () => {
    const inquiry = toInquiry(inquiryRow(), []);

    expect(inquiry).toMatchObject({
      amountCents: null,
      consentEvidence: null,
      downPaymentCents: null,
      installments: null,
    });
  });

  it("projects real persisted terms and consent without synthesizing them", () => {
    const grantedAt = new Date("2026-08-17T10:00:00.000Z");
    const inquiry = toInquiry(
      inquiryRow({
        amountCents: 6_000_000,
        downPaymentCents: 1_000_000,
        installments: 48,
      }),
      [],
      { consentVersion: "credere-v3", grantedAt },
    );

    expect(inquiry).toMatchObject({
      amountCents: 6_000_000,
      consentEvidence: {
        acceptedAt: grantedAt,
        termsVersion: "credere-v3",
      },
      downPaymentCents: 1_000_000,
      installments: 48,
    });
  });
});

function inquiryRow(metadata: Record<string, unknown> = {}) {
  const createdAt = new Date("2026-08-17T09:00:00.000Z");
  return {
    applicantDocumentHash: "a".repeat(64),
    applicantDocumentLast4: null,
    completedAt: null,
    createdAt,
    id: "inquiry_1",
    idempotencyKey: "credere-backfill:simulation_1",
    leadId: null,
    listingId: null,
    metadata,
    operationRequestId: null,
    providerInquiryId: "simulation_1",
    providerOperationId: null,
    providerResultSummary: {},
    status: "submitted",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: null,
    updatedAt: createdAt,
  };
}
