import { SignIn, useAuth } from "@clerk/react-router";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import "../../styles/account-auth.css";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import { resolveSessionDestination } from "./sessionRedirect";
import { useSessionBootstrapHandoff } from "./sessionBootstrapHandoff";
import { loadRuntimeSessionBootstrap } from "./sessionBootstrapLoader";
import { useClerkAuthConfiguration } from "./ClerkAuthProvider";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import { AuthEntryLayout } from "./AuthEntryLayout";
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
    <AuthEntryLayout
      description="Entre para gerenciar o estoque, vendas, atendimento e a operação da sua loja."
      features={[
        "Estoque, vendas e despesas em um só painel",
        "Comissões, permissões e atendimento da equipe",
        "Documentos e integrações fiscais da operação",
      ]}
      title="Acessar a Loja Veículos"
    >
      <SignIn
        appearance={authEntryClerkAppearance}
        path={config.signInPath}
        routing="path"
      />
    </AuthEntryLayout>
  );
}

const authEntryClerkAppearance = {
  elements: {
    cardBox: "shadow-none border-0 bg-transparent w-full",
    card: "shadow-none border-0 bg-transparent p-0 gap-4 w-full",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-line bg-app text-foreground font-bold rounded-xl",
    formFieldInput: "border-line bg-app text-foreground rounded-xl",
    footer: "bg-transparent",
  },
  variables: {
    borderRadius: "0.875rem",
    colorBackground: "transparent",
    colorDanger: "var(--color-danger)",
    colorInputBackground: "var(--color-app)",
    colorInputText: "var(--color-foreground)",
    colorPrimary: "var(--color-accent-strong)",
    colorText: "var(--color-foreground)",
    colorTextSecondary: "var(--color-muted)",
    fontFamily: "inherit",
  },
} as const;

export function SignUpPage() {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) return <LocalDevAuthPage />;

  // Invite-only by design: members are provisioned via inviteStoreMember, so
  // the legacy sign-up route canonicalizes to the unified sign-in flow.
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

  if (error) {
    return (
      <main className="account-auth-shell">
        <div aria-hidden="true" className="account-auth-glow" />
        <div className="account-glass-card max-w-xl text-center space-y-6">
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
        </div>
      </main>
    );
  }

  return (
    <AppBootScreen
      description="Carregando as informações da sua conta e preferências de acesso."
      title="Entrando na loja"
    />
  );
}

function SessionSignInRedirect() {
  const config = useClerkAuthConfiguration();
  return <Navigate replace to={config.signInPath} />;
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
