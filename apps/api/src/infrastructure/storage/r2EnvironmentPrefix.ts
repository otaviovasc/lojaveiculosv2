export type R2EnvironmentPrefix = "l" | "p" | "s";

export function resolveR2EnvironmentPrefix(
  env: Record<string, string | undefined>,
): R2EnvironmentPrefix {
  const appEnvironment = env.APP_ENV?.trim().toLowerCase();

  if (
    appEnvironment === "development" ||
    appEnvironment === "local" ||
    appEnvironment === "test"
  ) {
    return "l";
  }
  if (appEnvironment === "staging") return "s";
  if (appEnvironment === "production") return "p";

  throw new Error(
    "APP_ENV must be local, development, test, staging, or production when R2 is configured.",
  );
}

export function assertR2StorageKeyEnvironment(
  storageKey: string,
  environmentPrefix: R2EnvironmentPrefix,
): void {
  if (!storageKey.startsWith(`${environmentPrefix}/`)) {
    throw new Error(
      `R2 storage key must be inside the ${environmentPrefix}/ environment prefix.`,
    );
  }
}
