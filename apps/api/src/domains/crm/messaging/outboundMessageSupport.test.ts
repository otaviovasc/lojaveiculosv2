import { describe, expect, it } from "vitest";
import {
  classifyOutboundIntentRecovery,
  readOutboundClientRequestId,
  readOutboundProviderReceipt,
  withOutboundClientRequestId,
} from "./outboundMessageSupport.js";

describe("CRM outbound client request correlation", () => {
  it("overwrites untrusted metadata with the server-validated idempotency key", () => {
    const metadata = withOutboundClientRequestId(
      {
        crmMessaging: { clientRequestId: "spoofed", keep: true },
      },
      "composer-request-1",
    );

    expect(metadata).toEqual({
      crmMessaging: { clientRequestId: "composer-request-1", keep: true },
    });
  });

  it.each(["INBOUND", "human_channel"] as const)(
    "does not project provider-controlled %s metadata as trusted correlation",
    (untrustedValue) => {
      const message = {
        direction: untrustedValue === "INBOUND" ? "INBOUND" : "OUTBOUND",
        metadata: {
          crmMessaging: { clientRequestId: "provider-controlled" },
        },
        senderOrigin:
          untrustedValue === "human_channel" ? "human_channel" : "customer",
      } as const;

      expect(readOutboundClientRequestId(message)).toBeNull();
    },
  );

  it("reads nested and rejects malformed provider receipts", () => {
    expect(
      readOutboundProviderReceipt({
        sent: {
          externalId: "provider-1",
          providerTimestamp: "2026-08-10T12:00:00.000Z",
        },
      }),
    ).toEqual({
      externalId: "provider-1",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
    });
    expect(
      readOutboundProviderReceipt({
        externalId: "provider-1",
        providerTimestamp: "invalid",
      }),
    ).toBeNull();
  });

  it.each([
    ["completed", "confirmed"],
    ["provider_succeeded", "confirmed"],
    ["retryable_failed", "retryable"],
    ["failed", "failed"],
    ["indeterminate", "indeterminate"],
  ] as const)("classifies %s durable evidence as %s", (status, expected) => {
    const intent = {
      messageId: status === "completed" ? "message-1" : null,
      providerResult:
        status === "provider_succeeded"
          ? {
              sent: {
                externalId: "provider-1",
                providerTimestamp: "2026-08-10T12:00:00.000Z",
              },
            }
          : null,
      status,
    } as const;
    expect(classifyOutboundIntentRecovery(intent)).toBe(expected);
  });
});
