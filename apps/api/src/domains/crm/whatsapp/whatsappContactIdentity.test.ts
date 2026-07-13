import { describe, expect, it } from "vitest";
import {
  isLidLikeWhatsappPhone,
  isRealWhatsappPhone,
  shouldBackfillWhatsappPhone,
} from "./whatsappContactIdentity.js";

describe("WhatsApp contact identity", () => {
  it("backfills a LID only when the same chatLid proves identity", () => {
    expect(
      shouldBackfillWhatsappPhone("158716288618587@lid", "5511999999999", true),
    ).toBe(true);
    expect(
      shouldBackfillWhatsappPhone(
        "158716288618587@lid",
        "5511999999999",
        false,
      ),
    ).toBe(false);
  });

  it("distinguishes real phones from provider LID placeholders", () => {
    expect(isRealWhatsappPhone("+55 11 99999-9999")).toBe(true);
    expect(isRealWhatsappPhone("9999999")).toBe(false);
    expect(isLidLikeWhatsappPhone("12345678901234567890@lid")).toBe(true);
    expect(isLidLikeWhatsappPhone("5511999999999")).toBe(false);
  });
});
