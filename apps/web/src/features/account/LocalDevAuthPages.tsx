import { LogIn, LogOut, RefreshCcw, UserCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { Logo } from "../../components/ui/logo";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import "../../styles/account-auth.css";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import {
  clearLocalDevAccount,
  localDevAccounts,
  readLocalDevAccount,
  selectLocalDevAccount,
  type LocalDevAccount,
} from "./localDevAuth";
import { createRuntimeAccountApi } from "./runtimeApi";
import { resolveSessionDestination } from "./sessionRedirect";

export function LocalDevProtectedRoute({
  access,
  children,
}: {
  access: AccountAccess | "signed-in";
  children: ReactNode;
}) {
  const account = readLocalDevAccount();
  if (!account) return <LocalDevAuthPage />;
  if (access === "signed-in") return children;

  return (
    <AccountAccessGate
      access={access}
      getToken={async () => null}
      userId={account.userId}
    >
      {children}
    </AccountAccessGate>
  );
}

export function LocalDevSessionBootstrapPage() {
  const navigate = useNavigate();
  const account = readLocalDevAccount();
  const [error, setError] = useState<string | null>(null);
  const [accessUnavailable, setAccessUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!account) return;

    let cancelled = false;
    const localAccount = account;
    setError(null);
    setAccessUnavailable(false);

    async function bootstrapSession() {
      try {
        const api = await createRuntimeAccountApi({ accessToken: null });
        const bootstrap = await api.bootstrap();
        if (bootstrap.defaultStore) {
          persistCurrentStoreSlug(
            bootstrap.defaultStore.storeSlug,
            localAccount.userId,
          );
        } else {
          clearCurrentStoreSlug(localAccount.userId);
        }
        const destination = resolveSessionDestination(bootstrap);
        if (cancelled) return;
        if (destination) {
          void navigate(destination, { replace: true });
        } else {
          setAccessUnavailable(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            formatApiErrorDisplay(
              err,
              "Não foi possível carregar sua sessão local.",
            ),
          );
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [account, attempt, navigate]);

  if (!account) return <LocalDevAuthPage />;
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
            <FeatureAlert title="Não foi possível carregar sua conta local">
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
            description="Carregando as configurações e o perfil selecionado."
            title="Entrando na conta local"
          />
        )}
      </div>
    </main>
  );
}

export function LocalDevAuthPage() {
  const navigate = useNavigate();
  const selectedAccount = readLocalDevAccount();

  function signIn(account: LocalDevAccount) {
    selectLocalDevAccount(account.userId);
    clearCurrentStoreSlug(account.userId);
    void navigate("/auth/session", { replace: true });
  }

  function signOut() {
    if (selectedAccount) clearCurrentStoreSlug(selectedAccount.userId);
    clearLocalDevAccount();
  }

  return (
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
        <Logo className="h-10" variant="full" />
        <div className="account-glass-card space-y-6">
          <div className="space-y-2 text-center">
            <span className="account-badge-label">
              <UserCheck className="size-3.5" aria-hidden="true" /> Ambiente
              local
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Selecionar perfil de teste
            </h1>
            <p className="text-sm font-medium text-muted max-w-md mx-auto leading-relaxed">
              Escolha um perfil para testar permissões e fluxos de trabalho
              locais.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {localDevAccounts.map((account) => (
              <button
                className="account-card-option group"
                key={account.userId}
                onClick={() => signIn(account)}
                type="button"
              >
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground group-hover:text-accent-text transition-colors">
                      {account.name}
                    </span>
                    <span className="account-role-chip">
                      {roleLabel(account.role)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted">
                    {account.email}
                  </span>
                </div>
                <div className="size-8 rounded-full border border-line bg-app flex items-center justify-center text-muted group-hover:border-accent-strong group-hover:text-accent-text transition-all shrink-0">
                  <LogIn aria-hidden className="size-4" />
                </div>
              </button>
            ))}
          </div>

          {selectedAccount ? (
            <div className="pt-2 border-t border-line">
              <FeatureActionButton
                className="w-full justify-center text-sm font-bold text-muted hover:text-foreground"
                icon={LogOut}
                label={`Sair de ${selectedAccount.name}`}
                onClick={signOut}
                variant="secondary"
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function roleLabel(role: LocalDevAccount["role"]) {
  if (role === "agency") return "Agência";
  if (role === "investor") return "Investidor";
  if (role === "owner") return "Proprietário";
  if (role === "supervisor") return "Supervisor";
  return "Vendedor";
}
