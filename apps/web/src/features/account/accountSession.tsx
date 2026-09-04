import { createContext, useContext, type ReactNode } from "react";
import type { SessionBootstrap } from "./apiClient";

const AccountSessionContext = createContext<SessionBootstrap | null>(null);
const AccountSessionRefreshContext = createContext<
  (() => Promise<boolean>) | null
>(null);

export function AccountSessionProvider({
  children,
  refreshSession,
  session,
}: {
  children: ReactNode;
  refreshSession?: () => Promise<boolean>;
  session: SessionBootstrap;
}) {
  return (
    <AccountSessionRefreshContext.Provider value={refreshSession ?? null}>
      <AccountSessionContext.Provider value={session}>
        {children}
      </AccountSessionContext.Provider>
    </AccountSessionRefreshContext.Provider>
  );
}

export function useAccountSession() {
  const session = useContext(AccountSessionContext);
  if (!session) {
    throw new Error("Account session is required inside protected app routes.");
  }
  return session;
}

export function useOptionalAccountSession() {
  return useContext(AccountSessionContext);
}

export function useOptionalAccountSessionRefresh() {
  return useContext(AccountSessionRefreshContext);
}
