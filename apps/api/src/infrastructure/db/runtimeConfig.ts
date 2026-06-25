import * as auditSchema from "@lojaveiculosv2/audit-db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClerkHttpIdentityVerifier } from "../auth/clerkHttpIdentityVerifier.js";

export class RuntimeDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeDatabaseConfigError";
  }
}

export function allowsMemoryRuntimeFallback(
  env: Record<string, string | undefined>,
): boolean {
  return (
    env.APP_ENV === "local" ||
    env.NODE_ENV === "test" ||
    (!env.APP_ENV && env.NODE_ENV !== "production")
  );
}

export function resolveRuntimeDatabaseUrl(
  env: Record<string, string | undefined>,
  variableName: "AUDIT_DATABASE_URL" | "DATABASE_URL",
  missingMessage: string,
): string | null {
  const databaseUrl = env[variableName];

  if (!databaseUrl || databaseUrl.startsWith("${{")) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(missingMessage);
    }

    return null;
  }

  return databaseUrl;
}

export function assertRuntimeIdentityVerifierConfig(
  env: Record<string, string | undefined>,
): void {
  if (!env.CLERK_SECRET_KEY && !allowsMemoryRuntimeFallback(env)) {
    throw new RuntimeDatabaseConfigError(
      "CLERK_SECRET_KEY must be configured before starting DB-backed API runtime outside local/test.",
    );
  }
}

export function readDbCloseTimeoutSeconds(
  env: Record<string, string | undefined>,
): number {
  const configured = Number(env.DB_CLOSE_TIMEOUT_SECONDS ?? 5);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

export function createAuditDb(env: Record<string, string | undefined>) {
  const auditDatabaseUrl = resolveRuntimeDatabaseUrl(
    env,
    "AUDIT_DATABASE_URL",
    "AUDIT_DATABASE_URL must be configured before starting DB-backed API runtime outside local/test.",
  );

  if (!auditDatabaseUrl) return null;

  const client = postgres(auditDatabaseUrl, {
    max: Number(env.AUDIT_DB_POOL_MAX ?? env.DB_POOL_MAX ?? 5),
  });

  return {
    close: () => client.end({ timeout: readDbCloseTimeoutSeconds(env) }),
    db: drizzle(client, { schema: auditSchema }),
    name: "audit-db",
  };
}

export function createRuntimeIdentityVerifier(
  env: Record<string, string | undefined>,
) {
  const secretKey = env.CLERK_SECRET_KEY;

  if (!secretKey) {
    assertRuntimeIdentityVerifierConfig(env);
    return null;
  }

  return createClerkHttpIdentityVerifier({
    ...(env.CLERK_AUDIENCE
      ? { audience: parseCsvEnv(env.CLERK_AUDIENCE) }
      : {}),
    ...(env.CLERK_AUTHORIZED_PARTIES
      ? { authorizedParties: parseCsvEnv(env.CLERK_AUTHORIZED_PARTIES) }
      : {}),
    ...(env.CLERK_JWT_KEY ? { jwtKey: env.CLERK_JWT_KEY } : {}),
    secretKey,
  });
}

function parseCsvEnv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
