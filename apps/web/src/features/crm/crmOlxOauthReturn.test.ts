// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCrmOlxOauthReturn,
  consumeCrmOlxOauthReturn,
  hasCrmOlxOauthReturn,
  markCrmOlxOauthReturn,
} from "./crmOlxOauthReturn";

describe("CRM OLX OAuth return", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("keeps a transient CRM return marker through the provider redirect", () => {
    markCrmOlxOauthReturn();
    expect(hasCrmOlxOauthReturn()).toBe(true);
    expect(consumeCrmOlxOauthReturn()).toBe(true);
    expect(hasCrmOlxOauthReturn()).toBe(false);
  });

  it("can discard a failed or cancelled return", () => {
    markCrmOlxOauthReturn();
    clearCrmOlxOauthReturn();
    expect(consumeCrmOlxOauthReturn()).toBe(false);
  });

  it("discards stale or malformed return markers", () => {
    window.sessionStorage.setItem(
      "crm.olx.oauth.return",
      JSON.stringify({
        issuedAt: Date.now() - 11 * 60 * 1_000,
        returnTo: "connection",
      }),
    );
    expect(hasCrmOlxOauthReturn()).toBe(false);
    window.sessionStorage.setItem("crm.olx.oauth.return", "invalid");
    expect(hasCrmOlxOauthReturn()).toBe(false);
  });
});
