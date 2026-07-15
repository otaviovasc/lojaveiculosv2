import { LogIn, LogOut, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { Logo } from "../../components/ui/logo";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { AccountAccessGate, type AccountAccess } from "./AccountAccessGate";
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!account) return;

    let cancelled = false;
    const localAccount = account;
    setError(null);

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
        if (!cancelled) void navigate(destination, { replace: true });
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

  return (
    <FeaturePageShell
      className="min-h-screen max-w-xl justify-center"
      variant="plain"
    >
      {error ? (
        <>
          <FeatureAlert title="Não foi possível preparar sua conta local">
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
        <FeatureLoadingState icon={Loader2} title="Sincronizando conta local">
          <span className="sr-only">Aguarde</span>
        </FeatureLoadingState>
      )}
    </FeaturePageShell>
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
    <FeaturePageShell
      className="min-h-screen max-w-3xl justify-center"
      variant="plain"
    >
      <Logo className="h-11 self-start" variant="full" />
      <FeaturePageHeader
        chip="Local QA"
        description="Contas de teste para validar permissões sem depender do provedor de identidade externo."
        eyebrow="Ambiente local"
        title="Selecionar perfil"
      />
      <div className="grid gap-3">
        {localDevAccounts.map((account) => (
          <button
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
            key={account.userId}
            onClick={() => signIn(account)}
            type="button"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-950">
                {account.name}
              </span>
              <span className="block text-xs text-slate-500">
                {roleLabel(account.role)} · {account.email}
              </span>
            </span>
            <LogIn aria-hidden className="h-4 w-4 text-slate-500" />
          </button>
        ))}
      </div>
      {selectedAccount ? (
        <FeatureActionButton
          icon={LogOut}
          label={`Sair de ${selectedAccount.name}`}
          onClick={signOut}
          variant="secondary"
        />
      ) : null}
    </FeaturePageShell>
  );
}

function roleLabel(role: LocalDevAccount["role"]) {
  if (role === "agency") return "Agência";
  if (role === "investor") return "Investidor";
  if (role === "owner") return "Owner";
  if (role === "supervisor") return "Supervisor";
  return "Vendedor";
}
