import { describe, expect, it } from "vitest";
import { sanitizeCrmMessageUrl } from "./crmMessageHelpers";

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
