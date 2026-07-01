import { ClerkProvider } from "@clerk/react";
import { createContext, useContext, type ReactNode } from "react";
import { readClerkAuthConfig, type ClerkAuthConfig } from "./authConfig";

const ClerkAuthConfigContext = createContext<ClerkAuthConfig>(
  readClerkAuthConfig(),
);

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const config = readClerkAuthConfig();
  const content = (
    <ClerkAuthConfigContext.Provider value={config}>
      {children}
    </ClerkAuthConfigContext.Provider>
  );

  if (config.localAuthBypass || !config.configured || !config.publishableKey) {
    return content;
  }

  return (
    <ClerkProvider
      publishableKey={config.publishableKey}
      signInUrl={config.signInPath}
      signUpUrl={config.signUpPath}
    >
      {content}
    </ClerkProvider>
  );
}

export function useClerkAuthConfiguration() {
  return useContext(ClerkAuthConfigContext);
}
