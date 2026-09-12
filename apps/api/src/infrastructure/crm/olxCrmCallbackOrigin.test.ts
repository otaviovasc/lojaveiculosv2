import { describe, expect, it } from "vitest";
import { readOlxCrmCallbackOrigin } from "./olxCrmCallbackOrigin.js";

describe("readOlxCrmCallbackOrigin", () => {
  it("uses the direct API origin for deployed OLX webhooks", () => {
    expect(
      readOlxCrmCallbackOrigin({
        API_BASE_URL: "https://api.example.test/base/path",
        APP_ENV: "staging",
        PUBLIC_APP_URL: "https://app.example.test",
      }),
    ).toBe("https://api.example.test");
  });

  it("does not fall back to the public web origin outside local/test", () => {
    expect(() =>
      readOlxCrmCallbackOrigin({
        APP_ENV: "staging",
        PUBLIC_APP_URL: "https://app.example.test",
      }),
    ).toThrow("API_BASE_URL is required for OLX CRM callbacks");
  });

  it("keeps the local API fallback for mocked development flows", () => {
    expect(readOlxCrmCallbackOrigin({ APP_ENV: "test" })).toBe(
      "http://localhost:8787",
    );
  });

  it("requires HTTPS for a deployed API origin", () => {
    expect(() =>
      readOlxCrmCallbackOrigin({
        API_BASE_URL: "http://api.example.test",
        APP_ENV: "staging",
      }),
    ).toThrow("OLX CRM callbacks require an HTTPS API_BASE_URL");
  });
});
