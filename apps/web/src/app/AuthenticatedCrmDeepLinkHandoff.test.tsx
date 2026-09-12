// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AccountSessionProvider } from "../features/account/accountSession";
import type { SessionBootstrap } from "../features/account/apiClient";
import {
  persistCurrentStoreSlug,
  readCurrentStoreSlug,
} from "../features/account/currentStore";
import { CrmDeepLinkHandoffTestProbe } from "../features/crm/CrmDeepLinkHandoffTestParts";
import {
  createAuthenticatedCrmConversationPath,
  resolveCrmDeepLinkHandoff,
} from "../features/crm/crmDeepLinkHandoff";
import { AuthenticatedCrmDeepLinkHandoff } from "./AuthenticatedCrmDeepLinkHandoff";

const cycleId = "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61";

describe("authenticated CRM deep-link handoff", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("defines the external notification URL contract", () => {
    expect(
      createAuthenticatedCrmConversationPath({
        cycleId,
        storeSlug: "loja são paulo",
      }),
    ).toBe(`/crm?storeSlug=loja+s%C3%A3o+paulo&cycleId=${cycleId}`);
  });

  it("opens an authorized cycle only after selecting its active store", async () => {
    const session = createSession();
    persistCurrentStoreSlug("store-one", session.user.clerkUserId);

    renderHandoff(
      session,
      createAuthenticatedCrmConversationPath({
        cycleId,
        storeSlug: "store-two",
      }),
    );

    expect(await screen.findByText("CRM carregado")).toBeInTheDocument();
    expect(screen.getByTestId("active-store")).toHaveTextContent("store-two");
    expect(readCurrentStoreSlug(session.user.clerkUserId)).toBe("store-two");
    expect(screen.getByTestId("route-location")).toHaveTextContent(
      `/crm#/crm?surface=conversations&cycleId=${cycleId}`,
    );
  });

  it("drops the cycle and preserves the current store for an unauthorized slug", async () => {
    const session = createSession();
    persistCurrentStoreSlug("store-one", session.user.clerkUserId);

    renderHandoff(
      session,
      createAuthenticatedCrmConversationPath({
        cycleId,
        storeSlug: "other-tenant-store",
      }),
    );

    expect(await screen.findByText("CRM carregado")).toBeInTheDocument();
    expect(readCurrentStoreSlug(session.user.clerkUserId)).toBe("store-one");
    expect(screen.getByTestId("route-location")).toHaveTextContent(
      "/crm#/crm?surface=conversations&scope=conversations",
    );
    expect(screen.getByTestId("route-location")).not.toHaveTextContent(cycleId);
  });

  it("rejects malformed or ambiguous cycle parameters", () => {
    const session = createSession();
    const malformed = resolveCrmDeepLinkHandoff(session, {
      pathname: "/crm",
      search: "?storeSlug=store-one&cycleId=not-a-uuid",
    });
    const repeated = resolveCrmDeepLinkHandoff(session, {
      pathname: "/crm",
      search: `?storeSlug=store-one&cycleId=${cycleId}&cycleId=${cycleId}`,
    });

    expect(malformed).toMatchObject({ kind: "fallback", reason: "malformed" });
    expect(repeated).toMatchObject({ kind: "fallback", reason: "malformed" });
  });

  it("leaves ordinary internal CRM routes unchanged", async () => {
    const session = createSession();
    renderHandoff(session, "/crm#/crm?surface=conversations");

    await waitFor(() =>
      expect(screen.getByText("CRM carregado")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("route-location")).toHaveTextContent(
      "/crm#/crm?surface=conversations",
    );
  });
});

function renderHandoff(session: SessionBootstrap, initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={
            <AccountSessionProvider session={session}>
              <AuthenticatedCrmDeepLinkHandoff>
                <CrmDeepLinkHandoffTestProbe />
              </AuthenticatedCrmDeepLinkHandoff>
            </AccountSessionProvider>
          }
          path="/crm/*"
        />
      </Routes>
    </MemoryRouter>,
  );
}

function createSession(): SessionBootstrap {
  const store = (storeSlug: string, tenantId = "tenant-agency") => ({
    effectivePermissions: ["crm.conversations.read"],
    role: "agency",
    status: "active" as const,
    storeId: `id-${storeSlug}`,
    storeName: storeSlug,
    storeSlug,
    tenantId,
    tenantName: tenantId,
  });
  const stores = [
    store("store-one"),
    store("store-two"),
    store("other-tenant-store", "tenant-other"),
  ];

  return {
    defaultStore: stores[0] ?? null,
    needsOnboarding: false,
    platformAdmin: false,
    stores,
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant-agency",
        tenantName: "Agency",
        tenantSlug: "agency",
      },
    ],
    user: {
      clerkUserId: "clerk-agency",
      email: "agency@example.com",
      id: "user-agency",
      name: "Agency",
    },
  };
}
