import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useClerkAuthConfiguration } from "../account/ClerkAuthProvider";

export function LandingAuthActions({
  compact = false,
  primaryLabel,
}: {
  compact?: boolean;
  primaryLabel: string;
}) {
  const config = useClerkAuthConfiguration();
  const primaryClass =
    "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-black text-white shadow-lg transition hover:bg-accent-strong";
  const secondaryClass =
    "inline-flex h-12 items-center justify-center rounded-md border border-white/18 px-4 text-sm font-black text-white transition hover:bg-white/10";

  if (!config.configured) {
    return (
      <>
        <Link className={primaryClass} to={config.signUpPath}>
          {primaryLabel}
          <ArrowRight className="size-4" />
        </Link>
        {!compact ? (
          <Link className={secondaryClass} to={config.signInPath}>
            Entrar
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <ConfiguredLandingAuthActions
      compact={compact}
      primaryClass={primaryClass}
      primaryLabel={primaryLabel}
      secondaryClass={secondaryClass}
      sessionPath={config.sessionPath}
    />
  );
}

function ConfiguredLandingAuthActions({
  compact,
  primaryClass,
  primaryLabel,
  secondaryClass,
  sessionPath,
}: {
  compact: boolean;
  primaryClass: string;
  primaryLabel: string;
  secondaryClass: string;
  sessionPath: string;
}) {
  const { isLoaded, isSignedIn } = useUser();

  if (isLoaded && isSignedIn) {
    return (
      <>
        <Link className={primaryClass} to={sessionPath}>
          Abrir painel
          <ArrowRight className="size-4" />
        </Link>
        <UserButton />
      </>
    );
  }

  return (
    <>
      <SignUpButton mode="modal">
        <button className={primaryClass} type="button">
          {primaryLabel}
          <ArrowRight className="size-4" />
        </button>
      </SignUpButton>
      {!compact ? (
        <SignInButton mode="modal">
          <button className={secondaryClass} type="button">
            Entrar
          </button>
        </SignInButton>
      ) : null}
    </>
  );
}
