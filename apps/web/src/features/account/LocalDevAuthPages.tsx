import { LogIn, LogOut, RefreshCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppBootScreen } from "../../components/ui";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { cleanupCrmPushBeforeLogout } from "../crm/push/logoutCleanup";
import "../../styles/account-auth.css";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
import { AccountAccessUnavailable } from "./AccountAccessUnavailable";
import { AuthEntryLayout } from "./AuthEntryLayout";
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

  if (error) {
    return (
      <main className="account-auth-shell">
        <div aria-hidden="true" className="account-auth-glow" />
        <div className="account-glass-card max-w-xl text-center space-y-6">
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
        </div>
      </main>
    );
  }

  return (
    <AppBootScreen
      description="Carregando as configurações e o perfil selecionado."
      title="Entrando na conta local"
    />
  );
}

export function LocalDevAuthPage() {
  const navigate = useNavigate();
  const selectedAccount = readLocalDevAccount();

  async function signIn(account: LocalDevAccount) {
    if (selectedAccount && selectedAccount.userId !== account.userId) {
      await cleanupCrmPushBeforeLogout();
    }
    selectLocalDevAccount(account.userId);
    clearCurrentStoreSlug(account.userId);
    void navigate("/auth/session", { replace: true });
  }

  async function signOut() {
    await cleanupCrmPushBeforeLogout();
    if (selectedAccount) clearCurrentStoreSlug(selectedAccount.userId);
    clearLocalDevAccount();
  }

  return (
    <AuthEntryLayout
      description="Escolha um perfil para testar permissões e fluxos de trabalho locais."
      title="Selecionar perfil de teste"
    >
      <ul className="account-profile-list">
        {localDevAccounts.map((account) => (
          <li key={account.userId}>
            <button
              aria-label={`${account.name}, ${roleLabel(account.role)}, ${account.email}`}
              className="account-profile-row group"
              onClick={() => void signIn(account)}
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
              <LogIn
                aria-hidden
                className="size-4 shrink-0 text-muted transition-colors group-hover:text-accent-text"
              />
            </button>
          </li>
        ))}
      </ul>

      {selectedAccount ? (
        <div className="account-profile-signout">
          <button onClick={() => void signOut()} type="button">
            <LogOut aria-hidden className="size-4" />
            Sair de {selectedAccount.name}
          </button>
        </div>
      ) : null}
    </AuthEntryLayout>
  );
}

function roleLabel(role: LocalDevAccount["role"]) {
  if (role === "agency") return "Agência";
  if (role === "investor") return "Investidor";
  if (role === "owner") return "Proprietário";
  if (role === "supervisor") return "Supervisor";
  return "Vendedor";
}
