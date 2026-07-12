import { describe, expect, it } from "vitest";
import { cn, normalizePublicSlug } from "./utils";

describe("shared class composition", () => {
  it("combines conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2 text-sm", false, ["px-4", { block: true }])).toBe(
      "text-sm px-4 block",
    );
  });

  it("returns an empty class string when no values are enabled", () => {
    expect(cn(undefined, null, false)).toBe("");
  });
});

describe("public slug normalization", () => {
  it.each([
    ["Loja São José!!!", "loja-sao-jose"],
    ["  MULTI___ espaço -- aqui  ", "multi-espaco-aqui"],
    ["áéíóú Ç", "aeiou-c"],
    ["---", ""],
  ])("normalizes %j", (input, expected) => {
    expect(normalizePublicSlug(input)).toBe(expected);
  });

  it("caps slugs at 80 characters without leaving a separator suffix", () => {
    const input = `${"a".repeat(79)} b`;

    expect(normalizePublicSlug(input)).toBe("a".repeat(79));
  });
});
