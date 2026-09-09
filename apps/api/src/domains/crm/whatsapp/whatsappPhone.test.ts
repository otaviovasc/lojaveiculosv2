import { describe, expect, it } from "vitest";
import {
  whatsappPhoneLookupCandidates,
  whatsappPhonesMatch,
} from "./whatsappPhone.js";

describe("whatsappPhoneLookupCandidates", () => {
  it("matches BR mobile numbers with and without the ninth digit", () => {
    expect(whatsappPhoneLookupCandidates("5511985492129")).toEqual(
      expect.arrayContaining(["551185492129", "11985492129", "1185492129"]),
    );
    expect(whatsappPhoneLookupCandidates("551185492129")).toEqual(
      expect.arrayContaining(["5511985492129", "11985492129", "1185492129"]),
    );
  });

  it("keeps country-code toggle behavior", () => {
    expect(whatsappPhoneLookupCandidates("5511985492129")).toContain(
      "11985492129",
    );
    expect(whatsappPhoneLookupCandidates("11985492129")).toContain(
      "5511985492129",
    );
  });

  it("does not touch landline-length numbers", () => {
    expect(whatsappPhoneLookupCandidates("551132447788")).not.toContain(
      "5511932447788",
    );
  });
});

describe("whatsappPhonesMatch", () => {
  it("matches formatted, prefixed and ninth-digit variants", () => {
    expect(whatsappPhonesMatch("+55 (11) 98549-2129", "5511985492129")).toBe(
      true,
    );
    expect(whatsappPhonesMatch("5511985492129", "+551185492129")).toBe(true);
    expect(whatsappPhonesMatch("5511985492129", "5511997777755")).toBe(false);
  });
});
