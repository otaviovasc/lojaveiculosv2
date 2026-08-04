import { describe, expect, it } from "vitest";
import { normalizeBrazilianPhoneDigits } from "./brazilianPhones.js";

describe("Brazilian phone helpers", () => {
  it.each([
    ["+55 (11) 98765-4321", "11987654321"],
    ["551132345678", "1132345678"],
    ["11987654321", "11987654321"],
    ["119876543219999", "11987654321"],
    ["559876543219", "9876543219"],
    ["55987654321", "55987654321"],
    ["+5555987654321", "55987654321"],
  ])("normalizes %j to local canonical digits", (input, expected) => {
    expect(normalizeBrazilianPhoneDigits(input)).toBe(expected);
  });
});
