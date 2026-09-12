export type ResettableEnvironment = "local" | "staging";

export type ResetCommand = {
  apply: boolean;
  environment: ResettableEnvironment;
};

export function parseResetCommand(
  args: readonly string[],
  env: Record<string, string | undefined>,
): ResetCommand {
  const environment = resolveResettableEnvironment(env);
  const allowedArgs = new Set(["--apply", `--confirm=${environment}`]);
  const unknownArg = args.find((arg) => !allowedArgs.has(arg));
  if (unknownArg) {
    throw new Error(`Unknown reset argument: ${unknownArg}`);
  }

  const apply = args.includes("--apply");
  const confirmation = args.includes(`--confirm=${environment}`);
  if (apply && !confirmation) {
    throw new Error(`Applying the reset requires --confirm=${environment}.`);
  }
  if (!apply && args.some((arg) => arg.startsWith("--confirm="))) {
    throw new Error("--confirm can only be used together with --apply.");
  }

  return { apply, environment };
}

export function resolveResettableEnvironment(
  env: Record<string, string | undefined>,
): ResettableEnvironment {
  const appEnvironment = normalized(env.APP_ENV);
  const railwayEnvironmentName = normalized(env.RAILWAY_ENVIRONMENT_NAME);
  const legacyRailwayEnvironment = normalized(env.RAILWAY_ENVIRONMENT);
  const railwayEnvironment =
    railwayEnvironmentName ??
    (legacyRailwayEnvironment === "staging" ||
    legacyRailwayEnvironment === "production"
      ? legacyRailwayEnvironment
      : undefined);
  const isRailway = Boolean(
    railwayEnvironmentName ||
    legacyRailwayEnvironment ||
    env.RAILWAY_PROJECT_ID ||
    env.RAILWAY_ENVIRONMENT_ID,
  );

  if (
    appEnvironment === "production" ||
    railwayEnvironment === "production" ||
    legacyRailwayEnvironment === "production"
  ) {
    throw new Error("Environment reset is permanently disabled in production.");
  }

  if (appEnvironment === "staging") {
    if (railwayEnvironment && railwayEnvironment !== "staging") {
      throw new Error("APP_ENV and Railway environment do not match.");
    }
    return "staging";
  }

  if (
    appEnvironment === "local" ||
    appEnvironment === "development" ||
    appEnvironment === "test"
  ) {
    if (isRailway) {
      throw new Error("Local reset cannot run inside a Railway environment.");
    }
    return "local";
  }

  throw new Error(
    "APP_ENV must be local, development, test, or staging for environment reset.",
  );
}

export function assertDistinctDatabaseTargets(
  productDatabaseUrl: string,
  auditDatabaseUrl: string,
): void {
  if (databaseTarget(productDatabaseUrl) === databaseTarget(auditDatabaseUrl)) {
    throw new Error(
      "DATABASE_URL and AUDIT_DATABASE_URL must target different databases.",
    );
  }
}

function databaseTarget(value: string): string {
  const url = new URL(value);
  const databaseName = url.pathname.replace(/^\/+/, "");
  if (!url.hostname || !databaseName) {
    throw new Error("Database URL must contain a host and database name.");
  }
  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port}/${databaseName}`;
}

function normalized(value: string | undefined): string | undefined {
  const result = value?.trim().toLowerCase();
  return result || undefined;
}
