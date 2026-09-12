import { describe, expect, it } from "vitest";
import { isDirectHumanOutboundEcho } from "./parseZapiInboundMessage.js";

describe("isDirectHumanOutboundEcho", () => {
  it("is false for inbound messages", () => {
    expect(isDirectHumanOutboundEcho({ fromMe: false, metadata: {} })).toBe(
      false,
    );
  });

  it("is true for outbound echoes without interactive metadata", () => {
    expect(isDirectHumanOutboundEcho({ fromMe: true, metadata: {} })).toBe(
      true,
    );
  });

  it("is false for outbound reaction echoes", () => {
    expect(
      isDirectHumanOutboundEcho({
        fromMe: true,
        metadata: { interactive: { kind: "reaction", value: "👍" } },
      }),
    ).toBe(false);
  });

  it("is true for outbound echoes with non-reaction interactive metadata", () => {
    expect(
      isDirectHumanOutboundEcho({
        fromMe: true,
        metadata: { interactive: { kind: "button" } },
      }),
    ).toBe(true);
  });

  it("is true when interactive metadata is an array", () => {
    expect(
      isDirectHumanOutboundEcho({
        fromMe: true,
        metadata: { interactive: [] },
      }),
    ).toBe(true);
  });
});
