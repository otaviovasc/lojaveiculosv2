import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useClerkAuthConfiguration } from "../account/ClerkAuthProvider";
import { readLocalDevAccount } from "../account/localDevAuth";

export function LandingAuthActions({
  compact = false,
  primaryLabel,
}: {
  compact?: boolean;
  primaryLabel: string;
}) {
  const config = useClerkAuthConfiguration();
  const primaryClass =
    "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-black text-accent-foreground shadow-lg transition hover:bg-accent-strong hover:text-accent-strong-foreground";
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

  if (config.localAuthBypass) {
    return (
      <LocalLandingAuthActions
        compact={compact}
        primaryClass={primaryClass}
        primaryLabel={primaryLabel}
        secondaryClass={secondaryClass}
        sessionPath={config.sessionPath}
        signInPath={config.signInPath}
        signUpPath={config.signUpPath}
      />
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

function LocalLandingAuthActions({
  compact,
  primaryClass,
  primaryLabel,
  secondaryClass,
  sessionPath,
  signInPath,
  signUpPath,
}: {
  compact: boolean;
  primaryClass: string;
  primaryLabel: string;
  secondaryClass: string;
  sessionPath: string;
  signInPath: string;
  signUpPath: string;
}) {
  const account = readLocalDevAccount();
  if (account) {
    return (
      <>
        <Link className={primaryClass} to={sessionPath}>
          Abrir painel
          <ArrowRight className="size-4" />
        </Link>
        {!compact ? (
          <Link className={secondaryClass} to={signInPath}>
            Trocar perfil
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Link className={primaryClass} to={signUpPath}>
        {primaryLabel}
        <ArrowRight className="size-4" />
      </Link>
      {!compact ? (
        <Link className={secondaryClass} to={signInPath}>
          Entrar
        </Link>
      ) : null}
    </>
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
