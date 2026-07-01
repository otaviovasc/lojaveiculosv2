import { createContext, useContext, type ReactNode } from "react";
import type { SessionBootstrap } from "./apiClient";

const AccountSessionContext = createContext<SessionBootstrap | null>(null);

export function AccountSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: SessionBootstrap;
}) {
  return (
    <AccountSessionContext.Provider value={session}>
      {children}
    </AccountSessionContext.Provider>
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
