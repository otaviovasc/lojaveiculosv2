import { RedirectToSignIn, SignIn, SignUp, useAuth } from "@clerk/react";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import { createRuntimeAccountApi } from "./runtimeApi";
import { resolveSessionDestination } from "./sessionRedirect";
import { useClerkAuthConfiguration } from "./ClerkAuthProvider";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
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
    <ConfiguredProtectedRoute access={access}>
      {children}
    </ConfiguredProtectedRoute>
  );
}

function ConfiguredProtectedRoute({
  access,
  children,
}: {
  access: AccountAccess | "signed-in";
  children: ReactNode;
}) {
  const config = useClerkAuthConfiguration();
  const auth = useAuth();

  if (!auth.isLoaded) return <AuthLoadingPage title="Validando sessão" />;
  if (!auth.isSignedIn) {
    return (
      <RedirectToSignIn
        signInFallbackRedirectUrl={config.sessionPath}
        signUpFallbackRedirectUrl={config.sessionPath}
      />
    );
  }

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
    <AuthEntryShell eyebrow="Acesso seguro" title="Entrar na Loja Veículos">
      <SignIn
        fallbackRedirectUrl={config.sessionPath}
        path={config.signInPath}
        routing="path"
        signUpUrl={config.signUpPath}
      />
    </AuthEntryShell>
  );
}

export function SignUpPage() {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return <AuthConfigurationMissingPage />;
  if (config.localAuthBypass) return <LocalDevAuthPage />;

  return (
    <AuthEntryShell eyebrow="Criar acesso" title="Começar no Loja Veículos">
      <SignUp
        fallbackRedirectUrl={config.sessionPath}
        path={config.signUpPath}
        routing="path"
        signInUrl={config.signInPath}
      />
    </AuthEntryShell>
  );
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
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { getToken, isLoaded, isSignedIn, userId } = auth;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    setError(null);

    async function bootstrapSession() {
      try {
        const accessToken = await getToken();
        const api = await createRuntimeAccountApi({ accessToken });
        const bootstrap = await api.bootstrap();
        if (bootstrap.defaultStore) {
          persistCurrentStoreSlug(bootstrap.defaultStore.storeSlug, userId);
        } else {
          clearCurrentStoreSlug(userId);
        }
        const destination = resolveSessionDestination(bootstrap);
        if (!cancelled) void navigate(destination, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [attempt, getToken, isLoaded, isSignedIn, navigate, userId]);

  if (!isLoaded) return <AuthLoadingPage title="Preparando autenticação" />;
  if (!isSignedIn) return <SessionSignInRedirect />;

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
        <FeatureLoadingState icon={Loader2} title="Sincronizando sua conta">
          <span className="sr-only">Aguarde</span>
        </FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function SessionSignInRedirect() {
  const config = useClerkAuthConfiguration();
  return (
    <RedirectToSignIn
      signInFallbackRedirectUrl={config.sessionPath}
      signUpFallbackRedirectUrl={config.sessionPath}
    />
  );
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
      <FeaturePageHeader
        chip="Clerk Auth"
        description="A sessão é validada pelo provedor de identidade antes de liberar lojas, agências e permissões."
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
        body="Configure VITE_CLERK_PUBLISHABLE_KEY para carregar o projeto Clerk V2. A área operacional permanece bloqueada até a variável estar presente."
        icon={AlertTriangle}
        title="Clerk V2 não configurado"
      />
    </FeaturePageShell>
  );
}

function AuthLoadingPage({ title }: { title: string }) {
  return (
    <FeaturePageShell
      className="min-h-screen max-w-xl justify-center"
      variant="plain"
    >
      <FeatureLoadingState icon={Loader2} title={title}>
        <span className="sr-only">Aguarde</span>
      </FeatureLoadingState>
    </FeaturePageShell>
  );
}
