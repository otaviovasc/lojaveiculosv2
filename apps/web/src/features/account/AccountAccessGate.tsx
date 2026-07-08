import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SessionBootstrap } from "./apiClient";
import {
  clearCurrentStoreSlug,
  persistCurrentStoreSlug,
  readCurrentStoreSlug,
} from "./currentStore";
import { createRuntimeAccountApi } from "./runtimeApi";
import {
  hasActiveAgencyMembership,
  resolveSessionDestination,
} from "./sessionRedirect";
import { AccountSessionProvider } from "./accountSession";

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
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function loadBootstrap() {
      try {
        const accessToken = await getTokenRef.current();
        const api = await createRuntimeAccountApi({ accessToken });
        const session = await api.bootstrap();
        if (session.defaultStore) {
          persistCurrentStoreSlug(session.defaultStore.storeSlug, userId);
        } else if (access === "store") {
          persistSelectedStoreForStoreAccess(session, userId);
        } else if (!hasActiveStoreAccess(session)) {
          clearCurrentStoreSlug(userId);
        } else {
          keepSelectedManagedStore(session, userId);
        }
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
  }, [access, attempt, userId]);

  useEffect(() => {
    if (!bootstrap || isAllowed(access, bootstrap)) return;
    void navigate(resolveSessionDestination(bootstrap), { replace: true });
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

  if (!bootstrap || !isAllowed(access, bootstrap)) {
    return (
      <FeaturePageShell
        className="min-h-screen max-w-xl justify-center"
        variant="plain"
      >
        <FeatureLoadingState icon={Loader2} title="Carregando sua conta">
          <span className="sr-only">Aguarde</span>
        </FeatureLoadingState>
      </FeaturePageShell>
    );
  }

  return (
    <AccountSessionProvider session={bootstrap}>
      {children}
    </AccountSessionProvider>
  );
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
