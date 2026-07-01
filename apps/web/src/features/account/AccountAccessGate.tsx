import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import type { SessionBootstrap } from "./apiClient";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import { createRuntimeAccountApi } from "./runtimeApi";
import {
  hasActiveAgencyMembership,
  resolveSessionDestination,
} from "./sessionRedirect";

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

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function loadBootstrap() {
      try {
        const accessToken = await getToken();
        const api = await createRuntimeAccountApi({ accessToken });
        const session = await api.bootstrap();
        if (session.defaultStore) {
          persistCurrentStoreSlug(session.defaultStore.storeSlug, userId);
        } else {
          clearCurrentStoreSlug(userId);
        }
        if (!cancelled) setBootstrap(session);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, [attempt, getToken, userId]);

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

  return children;
}

function isAllowed(access: AccountAccess, bootstrap: SessionBootstrap) {
  if (access === "platform") return bootstrap.platformAdmin;
  if (access === "onboarding") return bootstrap.needsOnboarding;
  if (access === "agency") {
    return bootstrap.platformAdmin || hasActiveAgencyMembership(bootstrap);
  }
  return Boolean(bootstrap.defaultStore);
}
