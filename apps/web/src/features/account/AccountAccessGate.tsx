import { RefreshCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SessionBootstrap } from "./apiClient";
import {
  clearCurrentStoreSlug,
  persistCurrentStoreSlug,
  readCurrentStoreSlug,
} from "./currentStore";
import {
  hasActiveAgencyMembership,
  resolveSessionDestination,
} from "./sessionRedirect";
import { AccountSessionProvider } from "./accountSession";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import { useSessionBootstrapHandoff } from "./sessionBootstrapHandoff";
import { loadRuntimeSessionBootstrap } from "./sessionBootstrapLoader";

export type AccountAccess = "agency" | "onboarding" | "platform" | "store";

export function AccountAccessGate({
  access,
  children,
  getToken,
  userId,
}: {
  access: AccountAccess;
  children: ReactNode;
  getToken: () => Promise<string | null>;
  userId?: string | null;
}) {
  const navigate = useNavigate();
  const { clear: clearBootstrapHandoff, peek: peekBootstrapHandoff } =
    useSessionBootstrapHandoff();
  const handedOffBootstrap = peekBootstrapHandoff(userId);
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(
    () => handedOffBootstrap,
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const getTokenRef = useRef(getToken);
  const mountedRef = useRef(true);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await loadRuntimeSessionBootstrap(getTokenRef.current);
      if (!mountedRef.current) return false;
      persistBootstrapSelection(session, access, userId);
      setBootstrap(session);
      return true;
    } catch {
      return false;
    }
  }, [access, userId]);

  useEffect(() => {
    if (!bootstrap && handedOffBootstrap) {
      setBootstrap(handedOffBootstrap);
    }
  }, [bootstrap, handedOffBootstrap]);

  useEffect(() => {
    if (!bootstrap || !userId) return;
    clearBootstrapHandoff(userId, bootstrap);
  }, [bootstrap, clearBootstrapHandoff, userId]);

  useEffect(() => {
    if (bootstrap) return;
    let cancelled = false;
    setError(null);

    async function loadBootstrap() {
      try {
        const session = await loadRuntimeSessionBootstrap(getTokenRef.current);
        persistBootstrapSelection(session, access, userId);
        if (!cancelled) setBootstrap(session);
      } catch (err) {
        if (!cancelled) {
          setError(
            formatApiErrorDisplay(err, "Nao foi possivel carregar sua sessao."),
          );
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, [access, attempt, bootstrap, userId]);

  useEffect(() => {
    if (!bootstrap || isAllowed(access, bootstrap)) return;
    const destination = resolveSessionDestination(bootstrap);
    if (destination) void navigate(destination, { replace: true });
  }, [access, bootstrap, navigate]);

  if (error) {
    return (
      <FeaturePageShell
        className="min-h-screen max-w-xl justify-center"
        variant="plain"
      >
        <FeatureAlert title="Não foi possível carregar sua conta">
          {error}
        </FeatureAlert>
        <FeatureActionButton
          icon={RefreshCcw}
          label="Tentar novamente"
          onClick={() => setAttempt((current) => current + 1)}
          variant="primary"
        />
      </FeaturePageShell>
    );
  }

  if (
    bootstrap &&
    !isAllowed(access, bootstrap) &&
    resolveSessionDestination(bootstrap) === null
  ) {
    return (
      <AccountAccessUnavailable
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  if (!bootstrap || !isAllowed(access, bootstrap)) {
    return (
      <AppBootScreen
        description="Estamos preparando seu acesso à loja."
        title="Carregando sua conta"
      />
    );
  }

  return (
    <AccountSessionProvider refreshSession={refreshSession} session={bootstrap}>
      {children}
    </AccountSessionProvider>
  );
}

function persistBootstrapSelection(
  session: SessionBootstrap,
  access: AccountAccess,
  actorKey: string | null | undefined,
) {
  if (session.defaultStore) {
    persistCurrentStoreSlug(session.defaultStore.storeSlug, actorKey);
  } else if (access === "store") {
    persistSelectedStoreForStoreAccess(session, actorKey);
  } else if (!hasActiveStoreAccess(session)) {
    clearCurrentStoreSlug(actorKey);
  } else {
    keepSelectedManagedStore(session, actorKey);
  }
}

function isAllowed(access: AccountAccess, bootstrap: SessionBootstrap) {
  if (access === "platform") return bootstrap.platformAdmin;
  if (access === "onboarding") return bootstrap.needsOnboarding;
  if (access === "agency") {
    return bootstrap.platformAdmin || hasActiveAgencyMembership(bootstrap);
  }
  return hasActiveStoreAccess(bootstrap);
}

function hasActiveStoreAccess(bootstrap: SessionBootstrap) {
  return Boolean(
    bootstrap.defaultStore ??
    bootstrap.stores.find((store) => store.status === "active"),
  );
}

function persistSelectedStoreForStoreAccess(
  session: SessionBootstrap,
  actorKey: string | null | undefined,
) {
  const current = readCurrentStoreSlug(actorKey);
  const selected = session.stores.find(
    (store) => store.status === "active" && store.storeSlug === current,
  );
  if (selected) return;
  const firstActiveStore = session.stores.find(
    (store) => store.status === "active",
  );
  if (firstActiveStore) {
    persistCurrentStoreSlug(firstActiveStore.storeSlug, actorKey);
    return;
  }
  clearCurrentStoreSlug(actorKey);
}

function keepSelectedManagedStore(
  session: SessionBootstrap,
  actorKey: string | null | undefined,
) {
  const current = readCurrentStoreSlug(actorKey);
  if (
    current &&
    session.stores.some(
      (store) => store.status === "active" && store.storeSlug === current,
    )
  ) {
    return;
  }
  clearCurrentStoreSlug(actorKey);
}
