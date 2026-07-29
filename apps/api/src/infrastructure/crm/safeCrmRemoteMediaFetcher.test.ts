import { describe, expect, it } from "vitest";
import { UnsafeCrmRemoteMediaUrlError } from "../../domains/crm/ports/crmRemoteMediaFetcher.js";
import {
  assertPublicRemoteAddress,
  parsePublicHttpsUrl,
} from "./safeCrmRemoteMediaFetcher.js";

describe("safeCrmRemoteMediaFetcher", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "198.51.100.10",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])("rejects non-public address %s", (address) => {
    expect(() => assertPublicRemoteAddress(address)).toThrow(
      UnsafeCrmRemoteMediaUrlError,
    );
  });

  it.each([
    "http://media.example.com/file.jpg",
    "https://user:secret@media.example.com/file.jpg",
    "file:///tmp/file.jpg",
    "not-a-url",
    "https://127.0.0.1/file.jpg",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => parsePublicHttpsUrl(url)).toThrow(
      UnsafeCrmRemoteMediaUrlError,
    );
  });

  it("accepts a public HTTPS URL before DNS validation", () => {
    expect(
      parsePublicHttpsUrl("https://media.example.com/file.jpg").toString(),
    ).toBe("https://media.example.com/file.jpg");
  });
});
