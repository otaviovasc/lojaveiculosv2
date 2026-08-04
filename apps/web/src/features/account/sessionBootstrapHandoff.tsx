import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SessionBootstrap } from "./apiClient";

type BootstrapHandoff = {
  bootstrap: SessionBootstrap;
  clerkUserId: string;
};

type SessionBootstrapHandoff = {
  clear: (clerkUserId: string, bootstrap: SessionBootstrap) => void;
  peek: (clerkUserId: string | null | undefined) => SessionBootstrap | null;
  store: (clerkUserId: string, bootstrap: SessionBootstrap) => void;
};

const SessionBootstrapHandoffContext =
  createContext<SessionBootstrapHandoff | null>(null);

export function SessionBootstrapHandoffProvider({
  children,
}: {
  children: ReactNode;
}) {
  const handoffRef = useRef<BootstrapHandoff | null>(null);

  const clear = useCallback(
    (clerkUserId: string, bootstrap: SessionBootstrap) => {
      const current = handoffRef.current;
      if (
        current?.clerkUserId === clerkUserId &&
        current.bootstrap === bootstrap
      ) {
        handoffRef.current = null;
      }
    },
    [],
  );
  const peek = useCallback((clerkUserId: string | null | undefined) => {
    const current = handoffRef.current;
    return clerkUserId && current?.clerkUserId === clerkUserId
      ? current.bootstrap
      : null;
  }, []);
  const store = useCallback(
    (clerkUserId: string, bootstrap: SessionBootstrap) => {
      if (bootstrap.user.clerkUserId !== clerkUserId) {
        throw new Error(
          "Session bootstrap actor does not match Clerk session.",
        );
      }
      handoffRef.current = { bootstrap, clerkUserId };
    },
    [],
  );
  const value = useMemo(() => ({ clear, peek, store }), [clear, peek, store]);

  return (
    <SessionBootstrapHandoffContext.Provider value={value}>
      {children}
    </SessionBootstrapHandoffContext.Provider>
  );
}

export function useSessionBootstrapHandoff(): SessionBootstrapHandoff {
  const handoff = useContext(SessionBootstrapHandoffContext);
  if (!handoff) {
    throw new Error(
      "useSessionBootstrapHandoff must be used inside SessionBootstrapHandoffProvider.",
    );
  }
  return handoff;
}
