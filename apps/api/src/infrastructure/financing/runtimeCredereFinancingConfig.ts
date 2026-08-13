import {
  allowsMemoryRuntimeFallback,
  RuntimeDatabaseConfigError,
} from "../db/runtimeConfig.js";
export const DEFAULT_CREDERE_SCOPE = "simulator proposals";

export type RuntimeCredereFinancingConfig = {
  bankPolicyCodes: string[] | null;
  clientId: string;
  clientSecret: string;
  credentialEncryptionKey: string;
  environment: "production" | "sandbox";
  redirectUri: string;
  scope: string;
};

export function resolveRuntimeCredereFinancingConfig(
  env: Record<string, string | undefined>,
): RuntimeCredereFinancingConfig | null {
  const configuredValues = [
    env.CREDERE_BANK_POLICY_CODES,
    env.CREDERE_CLIENT_ID,
    env.CREDERE_CLIENT_SECRET,
    env.CREDERE_CREDENTIAL_ENCRYPTION_KEY,
    env.CREDERE_REDIRECT_URI,
  ].filter((value) => value?.trim() && !value.trim().startsWith("${{"));

  if (configuredValues.length === 0) return null;

  const config = {
    bankPolicyCodes: parseBankPolicyCodes(env.CREDERE_BANK_POLICY_CODES),
    clientId: env.CREDERE_CLIENT_ID?.trim() ?? "",
    clientSecret: env.CREDERE_CLIENT_SECRET?.trim() ?? "",
    credentialEncryptionKey:
      env.CREDERE_CREDENTIAL_ENCRYPTION_KEY?.trim() ?? "",
    environment: "production" as const,
    redirectUri: env.CREDERE_REDIRECT_URI?.trim() ?? "",
    scope: DEFAULT_CREDERE_SCOPE,
  };

  const missing = Object.entries({
    CREDERE_CLIENT_ID: config.clientId,
    CREDERE_CLIENT_SECRET: config.clientSecret,
    CREDERE_CREDENTIAL_ENCRYPTION_KEY: config.credentialEncryptionKey,
    CREDERE_REDIRECT_URI: config.redirectUri,
  })
    .filter(([, value]) => !value || value.startsWith("${{"))
    .map(([key]) => key);

  if (missing.length === 0) return config;
  if (allowsMemoryRuntimeFallback(env)) return null;

  throw new RuntimeDatabaseConfigError(
    `Credere financing runtime requires ${missing.join(
      ", ",
    )} outside local/test.`,
  );
}

function parseBankPolicyCodes(value: string | undefined): string[] | null {
  if (!value?.trim()) return null;
  const configured = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const codes = configured?.length ? configured : [];
  return Array.from(new Set(codes.filter((code) => /^\d{3}$/.test(code))));
}
