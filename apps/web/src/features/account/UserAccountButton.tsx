import { UserButton, useUser } from "@clerk/react";
import { User } from "lucide-react";
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
  const name =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    (isLoaded ? "Conta" : "Carregando");
  const email = user?.primaryEmailAddress?.emailAddress ?? "Sessão Clerk";

  if (compact) {
    return (
      <div className="flex justify-center py-1" title={name}>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 pl-1 pr-0 py-1.5">
      <div className="shrink-0">
        <UserButton />
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight gap-0.5">
        <p className="truncate rounded-md px-2.5 py-1.5 text-xs font-black text-primary">
          {name}
        </p>
        <span className="truncate pl-2.5 text-xs font-black uppercase tracking-widest text-muted">
          {email}
        </span>
      </div>
      {!isLoaded ? <User className="size-4 shrink-0 text-muted" /> : null}
    </div>
  );
}
