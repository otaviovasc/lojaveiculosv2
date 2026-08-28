import { describe, expect, it } from "vitest";
import {
  readOutboundClientRequestId,
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
});
