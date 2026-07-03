// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLocalDevAccount,
  isLocalDevAuthEnabled,
  readLocalDevAccount,
  selectLocalDevAccount,
} from "./localDevAuth";

describe("local dev auth", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("stays disabled unless the explicit local bypass flag is set", () => {
    expect(isLocalDevAuthEnabled({})).toBe(false);
    expect(
      readLocalDevAccount({ VITE_DEV_CLERK_USER_ID: "clerk_seed_owner" }),
    ).toBeNull();
  });

  it("selects deterministic seeded accounts", () => {
    selectLocalDevAccount("clerk_seed_supervisor");

    expect(
      readLocalDevAccount({ VITE_LOCAL_AUTH_BYPASS: "true" }),
    ).toMatchObject({
      email: "supervisor.seed@lojaveiculos.com.br",
      role: "supervisor",
      storeSlug: "test-store",
      userId: "clerk_seed_supervisor",
    });
  });

  it("exposes the seeded read-only investor account", () => {
    selectLocalDevAccount("clerk_test_investor");

    expect(
      readLocalDevAccount({ VITE_LOCAL_AUTH_BYPASS: "true" }),
    ).toMatchObject({
      email: "investor@lojaveiculos.com.br",
      role: "investor",
      storeSlug: "test-store",
      userId: "clerk_test_investor",
    });
  });

  it("clears the selected local account", () => {
    selectLocalDevAccount("clerk_seed_salesman");
    clearLocalDevAccount();

    expect(readLocalDevAccount({ VITE_LOCAL_AUTH_BYPASS: "true" })).toBeNull();
  });
});
