import { SignIn, useAuth } from "@clerk/react-router";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { Logo } from "../../components/ui/logo";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import { resolveSessionDestination } from "./sessionRedirect";
import { useSessionBootstrapHandoff } from "./sessionBootstrapHandoff";
import { loadRuntimeSessionBootstrap } from "./sessionBootstrapLoader";
import { useClerkAuthConfiguration } from "./ClerkAuthProvider";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import {
  LocalDevAuthPage,
  LocalDevProtectedRoute,
  LocalDevSessionBootstrapPage,
} from "./LocalDevAuthPages";

export function ProtectedRoute({
  access = "signed-in",
  children,
}: {
  access?: AccountAccess | "signed-in";
  children: ReactNode;
}) {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) {
    return (
      <LocalDevProtectedRoute access={access}>
        {children}
      </LocalDevProtectedRoute>
    );
  }
  return (
    <ConfiguredProtectedRoute access={access} signInPath={config.signInPath}>
      {children}
    </ConfiguredProtectedRoute>
  );
}

function ConfiguredProtectedRoute({
  access,
  children,
  signInPath,
}: {
  access: AccountAccess | "signed-in";
  children: ReactNode;
  signInPath: string;
}) {
  const auth = useAuth();

  if (!auth.isLoaded) return <AuthLoadingPage title="Validando sessão" />;
  if (!auth.isSignedIn) return <Navigate replace to={signInPath} />;

  if (access !== "signed-in") {
    return (
      <AccountAccessGate
        access={access}
        getToken={auth.getToken}
        userId={auth.userId}
      >
        {children}
      </AccountAccessGate>
    );
  }

  return children;
}

export function SignInPage() {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) return <LocalDevAuthPage />;

  return (
    <AuthEntryShell eyebrow="Acesso seguro" title="Acessar a Loja Veículos">
      <SignIn path={config.signInPath} routing="path" />
    </AuthEntryShell>
  );
}

export function SignUpPage() {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) return <LocalDevAuthPage />;

  return <Navigate replace to={config.signInPath} />;
}

export function SessionBootstrapPage() {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) return <LocalDevSessionBootstrapPage />;
  return <ConfiguredSessionBootstrapPage />;
}

function ConfiguredSessionBootstrapPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { store: storeBootstrapHandoff } = useSessionBootstrapHandoff();
  const [error, setError] = useState<string | null>(null);
  const [accessUnavailable, setAccessUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { getToken, isLoaded, isSignedIn, userId } = auth;
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    setError(null);
    setAccessUnavailable(false);

    async function bootstrapSession() {
      try {
        const bootstrap = await loadRuntimeSessionBootstrap(
          getTokenRef.current,
        );
        if (bootstrap.defaultStore) {
          persistCurrentStoreSlug(bootstrap.defaultStore.storeSlug, userId);
        } else {
          clearCurrentStoreSlug(userId);
        }
        const destination = resolveSessionDestination(bootstrap);
        if (cancelled) return;
        if (destination) {
          if (userId) storeBootstrapHandoff(userId, bootstrap);
          void navigate(destination, { replace: true });
        } else {
          setAccessUnavailable(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            formatApiErrorDisplay(err, "Não foi possível carregar sua sessão."),
          );
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [attempt, isLoaded, isSignedIn, navigate, storeBootstrapHandoff, userId]);

  if (!isLoaded) return <AuthLoadingPage title="Preparando autenticação" />;
  if (!isSignedIn) return <SessionSignInRedirect />;
  if (accessUnavailable) {
    return (
      <AccountAccessUnavailable
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  return (
    <FeaturePageShell
      className="min-h-screen max-w-xl justify-center"
      variant="plain"
    >
      {error ? (
        <>
          <FeatureAlert title="Não foi possível preparar sua conta">
            {error}
          </FeatureAlert>
          <FeatureActionButton
            icon={RefreshCcw}
            label="Tentar novamente"
            onClick={() => setAttempt((current) => current + 1)}
            variant="primary"
          />
        </>
      ) : (
        <AppBootScreen
          description="Estamos preparando seu acesso à loja."
          title="Sincronizando sua conta"
        />
      )}
    </FeaturePageShell>
  );
}

function SessionSignInRedirect() {
  const config = useClerkAuthConfiguration();
  return <Navigate replace to={config.signInPath} />;
}

function AuthEntryShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <FeaturePageShell
      className="min-h-screen max-w-3xl items-center justify-center"
      variant="plain"
    >
      <Logo className="h-11" variant="full" />
      <FeaturePageHeader
        chip="Acesso protegido"
        description="Sua identidade é validada antes de liberar lojas, agências e permissões."
        eyebrow={eyebrow}
        title={title}
      />
      <div className="flex w-full justify-center">{children}</div>
    </FeaturePageShell>
  );
}

function AuthConfigurationMissingPage() {
  return (
    <FeaturePageShell
      className="min-h-screen max-w-2xl justify-center"
      variant="plain"
    >
      <FeatureEmptyState
        body="A autenticação está temporariamente indisponível. A área operacional permanece protegida; contate o administrador da plataforma."
        icon={AlertTriangle}
        title="Acesso temporariamente indisponível"
      />
    </FeaturePageShell>
  );
}

function AuthLoadingPage({ title }: { title: string }) {
  return <AppBootScreen title={title} />;
}
