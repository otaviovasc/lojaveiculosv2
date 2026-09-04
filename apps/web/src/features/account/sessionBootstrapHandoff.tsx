import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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
  const [handoff, setHandoff] = useState<BootstrapHandoff | null>(null);

  const clear = useCallback(
    (clerkUserId: string, bootstrap: SessionBootstrap) => {
      setHandoff((current) =>
        current?.clerkUserId === clerkUserId && current.bootstrap === bootstrap
          ? null
          : current,
      );
    },
    [],
  );
  const peek = useCallback(
    (clerkUserId: string | null | undefined) =>
      clerkUserId && handoff?.clerkUserId === clerkUserId
        ? handoff.bootstrap
        : null,
    [handoff],
  );
  const store = useCallback(
    (clerkUserId: string, bootstrap: SessionBootstrap) => {
      if (bootstrap.user.clerkUserId !== clerkUserId) {
        throw new Error(
          "Session bootstrap actor does not match Clerk session.",
        );
      }
      setHandoff({ bootstrap, clerkUserId });
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
