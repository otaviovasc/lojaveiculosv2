import { SignIn, useAuth } from "@clerk/react-router";
import { AlertTriangle, LogIn, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { Logo } from "../../components/ui/logo";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import "../../styles/account-auth.css";
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

  if (!auth.isLoaded) return <AuthLoadingPage title="Carregando sessão" />;
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
    <AuthEntryShell eyebrow="Acesso à conta" title="Acessar a Loja Veículos">
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

  if (!isLoaded) return <AuthLoadingPage title="Carregando autenticação" />;
  if (!isSignedIn) return <SessionSignInRedirect />;
  if (accessUnavailable) {
    return (
      <AccountAccessUnavailable
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  return (
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="account-glass-card max-w-xl text-center space-y-6">
        {error ? (
          <>
            <FeatureAlert title="Não foi possível carregar sua conta">
              {error}
            </FeatureAlert>
            <FeatureActionButton
              className="account-primary-button"
              icon={RefreshCcw}
              label="Tentar novamente"
              onClick={() => setAttempt((current) => current + 1)}
              variant="primary"
            />
          </>
        ) : (
          <AppBootScreen
            description="Carregando as informações da sua conta e preferências de acesso."
            title="Entrando na loja"
          />
        )}
      </div>
    </main>
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
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        <Logo className="h-10" variant="full" />
        <div className="account-glass-card space-y-6 text-center">
          <div className="space-y-2">
            <span className="account-badge-label">
              <LogIn className="size-3.5" aria-hidden="true" /> {eyebrow}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-sm font-medium text-muted max-w-md mx-auto leading-relaxed">
              Entre para gerenciar o estoque, vendas, atendimento e a operação
              da sua loja.
            </p>
          </div>
          <div className="flex w-full justify-center pt-2">{children}</div>
        </div>
      </div>
    </main>
  );
}

function AuthConfigurationMissingPage() {
  return (
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="account-glass-card max-w-xl text-center">
        <FeatureEmptyState
          body="A autenticação está temporariamente indisponível. Tente novamente em alguns instantes ou contate o suporte."
          icon={AlertTriangle}
          title="Autenticação indisponível"
        />
      </div>
    </main>
  );
}

function AuthLoadingPage({ title }: { title: string }) {
  return <AppBootScreen title={title} />;
}
