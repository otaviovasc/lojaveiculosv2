import { describe, expect, it } from "vitest";
import {
  isStandaloneReactionMessage,
  isUnresolvedFallbackReactionMessage,
  readFallbackReactionValue,
  readReactionOrigin,
  sanitizeCrmMessageUrl,
} from "./crmMessageHelpers";

describe("sanitizeCrmMessageUrl", () => {
  it.each([
    "https://media.example.com/photo.jpg",
    "http://media.example.com/document.pdf",
    "/api/v1/crm/media/photo.jpg",
    "./media/photo.jpg",
    "media/photo.jpg",
  ])("allows safe web and same-origin URL forms: %s", (url) => {
    expect(sanitizeCrmMessageUrl(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "//untrusted.example/media.jpg",
    "\\\\untrusted.example\\media.jpg",
  ])("rejects executable or untrusted URL forms: %s", (url) => {
    expect(sanitizeCrmMessageUrl(url)).toBeUndefined();
  });
});

describe("readReactionOrigin", () => {
  it("returns the reaction origin when present", () => {
    expect(
      readReactionOrigin({ reaction: { origin: "inbound", value: "❤️" } }),
    ).toBe("inbound");
  });

  it("returns undefined for outbound reactions without an origin", () => {
    expect(
      readReactionOrigin({ reaction: { sentAt: "2026-01-01", value: "👍" } }),
    ).toBeUndefined();
    expect(readReactionOrigin(undefined)).toBeUndefined();
  });
});

describe("isStandaloneReactionMessage", () => {
  it("detects legacy standalone reaction rows", () => {
    expect(
      isStandaloneReactionMessage({
        interactive: { kind: "reaction", messageId: "abc", value: "❤️" },
      }),
    ).toBe(true);
  });

  it("ignores regular and other interactive messages", () => {
    expect(isStandaloneReactionMessage({})).toBe(false);
    expect(isStandaloneReactionMessage({ interactive: { kind: "poll" } })).toBe(
      false,
    );
    expect(isStandaloneReactionMessage(undefined)).toBe(false);
  });
});

describe("isUnresolvedFallbackReactionMessage", () => {
  it("detects fallback reactions stamped as unresolved", () => {
    expect(
      isUnresolvedFallbackReactionMessage({
        interactive: { kind: "reaction", unresolved: true, value: "❤️" },
      }),
    ).toBe(true);
  });

  it("keeps resolved or legacy reaction rows hidden", () => {
    expect(
      isUnresolvedFallbackReactionMessage({
        interactive: { kind: "reaction", messageId: "abc", value: "❤️" },
      }),
    ).toBe(false);
    expect(
      isUnresolvedFallbackReactionMessage({
        interactive: { kind: "reaction", unresolved: false, value: "❤️" },
      }),
    ).toBe(false);
    expect(isUnresolvedFallbackReactionMessage(undefined)).toBe(false);
  });
});

describe("readFallbackReactionValue", () => {
  it("reads the reaction emoji from interactive metadata", () => {
    expect(
      readFallbackReactionValue({
        interactive: { kind: "reaction", unresolved: true, value: "❤️" },
      }),
    ).toBe("❤️");
    expect(readFallbackReactionValue({ interactive: {} })).toBeUndefined();
  });
});
