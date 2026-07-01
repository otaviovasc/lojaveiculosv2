import { UserButton, useUser } from "@clerk/react";
import { User } from "lucide-react";
import { useClerkAuthConfiguration } from "./ClerkAuthProvider";

export function UserAccountButton({ compact = false }: { compact?: boolean }) {
  const config = useClerkAuthConfiguration();
  if (!config.configured) return null;
  return <ConfiguredUserAccountButton compact={compact} />;
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
        <p className="truncate rounded-md px-2.5 py-1.5 text-[11px] font-black text-primary">
          {name}
        </p>
        <span className="truncate pl-2.5 text-[8px] font-black uppercase tracking-widest text-muted">
          {email}
        </span>
      </div>
      {!isLoaded ? <User className="size-4 shrink-0 text-muted" /> : null}
    </div>
  );
}
