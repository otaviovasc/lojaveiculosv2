import { SignInButton, useUser } from "@clerk/react-router";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useClerkAuthConfiguration } from "../account/ClerkAuthProvider";
import { UserAccountButton } from "../account/UserAccountButton";
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
    "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-7 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-700 active:translate-y-px";
  const secondaryClass =
    "inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-transparent px-5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white/40 hover:bg-white/5 active:translate-y-px";

  if (!config.configured) {
    return (
      <>
        <Link className={primaryClass} to={config.signUpPath}>
          <span>{primaryLabel}</span>
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
          <span>Abrir painel</span>
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
        <span>{primaryLabel}</span>
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
          <span>Abrir painel</span>
          <ArrowRight className="size-4" />
        </Link>
        <UserAccountButton compact />
      </>
    );
  }

  return (
    <>
      <SignInButton fallbackRedirectUrl={sessionPath} mode="modal" withSignUp>
        <button className={primaryClass} type="button">
          <span>{primaryLabel}</span>
          <ArrowRight className="size-4" />
        </button>
      </SignInButton>
      {!compact ? (
        <SignInButton fallbackRedirectUrl={sessionPath} mode="modal">
          <button className={secondaryClass} type="button">
            Entrar
          </button>
        </SignInButton>
      ) : null}
    </>
  );
}
