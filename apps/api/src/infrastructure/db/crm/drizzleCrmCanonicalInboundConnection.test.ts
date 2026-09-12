import { describe, expect, it } from "vitest";
import { assertCanonicalInboundConnectionRow } from "./drizzleCrmCanonicalInboundConnection.js";

type CanonicalConnectionRow = NonNullable<
  Parameters<typeof assertCanonicalInboundConnectionRow>[0]
>;

describe("canonical inbound connection assertion", () => {
  it("rejects a disconnected canonical connection", () => {
    expect(() =>
      assertCanonicalInboundConnectionRow(
        canonicalConnection({ state: "disconnected" }),
        { channel: "whatsapp", provider: "zapi" },
      ),
    ).toThrow("not ready for inbound messaging");
  });

  it("rejects a ready-looking connection without inbound capability", () => {
    expect(() =>
      assertCanonicalInboundConnectionRow(
        canonicalConnection({
          metadata: {
            capabilities: { outbound: true },
            connected: true,
          },
        }),
        { channel: "whatsapp", provider: "zapi" },
      ),
    ).toThrow("not ready for inbound messaging");
  });

  it("accepts an active, connected canonical connection with inbound capability", () => {
    expect(() =>
      assertCanonicalInboundConnectionRow(canonicalConnection(), {
        channel: "whatsapp",
        provider: "zapi",
      }),
    ).not.toThrow();
  });
});

function canonicalConnection(
  overrides: Partial<CanonicalConnectionRow> = {},
): CanonicalConnectionRow {
  return {
    broker: "direct",
    channel: "whatsapp",
    metadata: {
      capabilities: { inbound: true, outbound: true },
      connected: true,
      credentialsRef: {
        stored: {
          clientToken: "sealed:client-token",
          instanceId: "sealed:instance-id",
          instanceToken: "sealed:instance-token",
        },
      },
    },
    provider: "zapi",
    state: "active",
    ...overrides,
  };
}
