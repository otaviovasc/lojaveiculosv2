// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import { useFinanceAccess } from "./useFinanceAccess";

describe("useFinanceAccess", () => {
  it("allows receipt generation with read and attach but no update", () => {
    const { result } = renderHook(() => useFinanceAccess(false, false, false), {
      wrapper: sessionWrapper(["finance.attach_document", "finance.read"]),
    });

    expect(result.current.canUpdate).toBe(false);
    expect(result.current.canAttach).toBe(false);
    expect(result.current.canGenerateReceipt).toBe(true);
  });

  it("does not expose receipts with attach permission alone", () => {
    const { result } = renderHook(() => useFinanceAccess(false, false, false), {
      wrapper: sessionWrapper(["finance.attach_document"]),
    });

    expect(result.current.canGenerateReceipt).toBe(false);
    expect(result.current.canOpenReceipt).toBe(false);
  });

  it("allows read-only users to open existing receipts without generating", () => {
    const { result } = renderHook(() => useFinanceAccess(false, false, false), {
      wrapper: sessionWrapper(["finance.read"]),
    });

    expect(result.current.canOpenReceipt).toBe(true);
    expect(result.current.canGenerateReceipt).toBe(false);
  });

  it("does not infer receipt generation from update permission", () => {
    const { result } = renderHook(() => useFinanceAccess(false, false, false), {
      wrapper: sessionWrapper(["finance.update"]),
    });

    expect(result.current.canUpdate).toBe(true);
    expect(result.current.canGenerateReceipt).toBe(false);
  });
});

function sessionWrapper(effectivePermissions: readonly string[]) {
  const session: SessionBootstrap = {
    defaultStore: {
      effectivePermissions,
      role: "finance",
      status: "active",
      storeId: "store_1",
      storeName: "Auto Prime Centro",
      storeSlug: "auto-prime-centro",
      tenantId: "tenant_1",
      tenantName: "Auto Prime",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "user_1",
      email: "finance@example.com",
      id: "user_1",
      name: "Financeiro",
    },
  };
  return function SessionWrapper({ children }: { children: ReactNode }) {
    return (
      <AccountSessionProvider session={session}>
        {children}
      </AccountSessionProvider>
    );
  };
}
