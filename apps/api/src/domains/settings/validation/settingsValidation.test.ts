import { describe, expect, it } from "vitest";
import {
  normalizeCustomDomain,
  normalizePublicSlug,
  StoreSettingsValidationError,
} from "./settingsValidation.js";

describe("settings validation", () => {
  it("normalizes safe public slugs and rejects reserved slugs", () => {
    expect(normalizePublicSlug(" Demo-Loja ")).toBe("demo-loja");
    expect(() => normalizePublicSlug("api")).toThrow(
      StoreSettingsValidationError,
    );
  });

  it("normalizes safe custom domains", () => {
    expect(normalizeCustomDomain(" Loja.Example.COM. ")).toBe(
      "loja.example.com",
    );
  });

  it.each([".example.com", "example..com", "-example.com", "example-.com"])(
    "rejects ambiguous custom domain %s",
    (domain) => {
      expect(() => normalizeCustomDomain(domain)).toThrow(
        StoreSettingsValidationError,
      );
    },
  );
});
