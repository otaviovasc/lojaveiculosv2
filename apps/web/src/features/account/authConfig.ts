export type ClerkAuthConfig = {
  configured: boolean;
  localAuthBypass: boolean;
  publishableKey: string | null;
  sessionPath: string;
  signInPath: string;
  signUpPath: string;
};

export function readClerkAuthConfig(): ClerkAuthConfig {
  const env = import.meta.env as {
    VITE_CLERK_PUBLISHABLE_KEY?: string;
    VITE_LOCAL_AUTH_BYPASS?: string;
  };
  const localAuthBypass = env.VITE_LOCAL_AUTH_BYPASS === "true";
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || null;

  return {
    configured: Boolean(publishableKey) || localAuthBypass,
    localAuthBypass,
    publishableKey,
    sessionPath: "/auth/session",
    signInPath: "/sign-in",
    signUpPath: "/sign-up",
  };
}
