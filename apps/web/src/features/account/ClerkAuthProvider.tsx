import { ClerkProvider } from "@clerk/react-router";
import { createContext, useContext, type ReactNode } from "react";
import { readClerkAuthConfig, type ClerkAuthConfig } from "./authConfig";
import { SessionBootstrapHandoffProvider } from "./sessionBootstrapHandoff";

const ClerkAuthConfigContext = createContext<ClerkAuthConfig>(
  readClerkAuthConfig(),
);

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const config = readClerkAuthConfig();
  const content = (
    <ClerkAuthConfigContext.Provider value={config}>
      <SessionBootstrapHandoffProvider>
        {children}
      </SessionBootstrapHandoffProvider>
    </ClerkAuthConfigContext.Provider>
  );

  if (config.localAuthBypass || !config.configured || !config.publishableKey) {
    return content;
  }

  return (
    <ClerkProvider
      publishableKey={config.publishableKey}
      signInFallbackRedirectUrl={config.sessionPath}
      signInUrl={config.signInPath}
      signUpFallbackRedirectUrl={config.sessionPath}
    >
      {content}
    </ClerkProvider>
  );
}

export function useClerkAuthConfiguration() {
  return useContext(ClerkAuthConfigContext);
}
