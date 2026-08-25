import { useClerk, useUser } from "@clerk/react-router";
import { LogOut, RefreshCcw, User } from "lucide-react";
import { useState } from "react";
import { cleanupCrmPushBeforeLogout } from "../crm/push/logoutCleanup";
import { useClerkAuthConfiguration } from "./ClerkAuthProvider";
import { readLocalDevAccount } from "./localDevAuth";

export function UserAccountButton({ compact = false }: { compact?: boolean }) {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return null;
  if (config.localAuthBypass) {
    return <LocalDevUserAccountButton compact={compact} />;
  }
  return <ConfiguredUserAccountButton compact={compact} />;
}

function LocalDevUserAccountButton({ compact }: { compact: boolean }) {
  const account = readLocalDevAccount();
  const name = account?.name ?? "Selecionar perfil";
  const email = account?.email ?? "Local QA";

  return (
    <button
      aria-label={name}
      className={
        compact
          ? "flex w-full justify-center rounded-lg py-1 text-primary hover:bg-app-elevated"
          : "flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 text-left hover:bg-app-elevated"
      }
      onClick={() => {
        window.location.href = "/sign-in";
      }}
      title={name}
      type="button"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-app text-primary">
        <User aria-hidden className="size-4" />
      </span>
      {!compact ? (
        <span className="flex min-w-0 flex-1 flex-col leading-tight gap-0.5">
          <span className="truncate rounded-md px-2.5 py-1.5 text-xs font-black text-primary">
            {name}
          </span>
          <span className="truncate pl-2.5 text-xs font-black uppercase tracking-widest text-muted">
            {email}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function ConfiguredUserAccountButton({ compact }: { compact: boolean }) {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const name =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    (isLoaded ? "Conta" : "Carregando");
  const email = user?.primaryEmailAddress?.emailAddress ?? "Sessão Clerk";

  const safeSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await cleanupCrmPushBeforeLogout();
      await signOut({ redirectUrl: "/sign-in" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex items-center justify-center gap-1 py-1"
          : "flex min-w-0 flex-1 items-center gap-2 pl-1 pr-0 py-1.5"
      }
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-app text-primary"
        title={name}
      >
        {user?.imageUrl ? (
          <img alt="" className="size-full object-cover" src={user.imageUrl} />
        ) : (
          <User aria-hidden="true" className="size-4" />
        )}
      </span>
      {!compact ? (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span className="truncate rounded-md px-2.5 py-1.5 text-xs font-black text-primary">
            {name}
          </span>
          <span className="truncate pl-2.5 text-xs font-black uppercase tracking-widest text-muted">
            {email}
          </span>
        </div>
      ) : null}
      <button
        aria-busy={isSigningOut || undefined}
        aria-label="Sair da conta"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-elevated hover:text-primary disabled:cursor-wait disabled:opacity-70"
        disabled={isSigningOut || !isLoaded}
        onClick={() => void safeSignOut()}
        title="Sair da conta"
        type="button"
      >
        {isSigningOut ? (
          <RefreshCcw aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
