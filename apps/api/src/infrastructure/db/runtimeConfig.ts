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

export function createAuditDb(env: Record<string, string | undefined>) {
  const auditDatabaseUrl = env.AUDIT_DATABASE_URL;

  if (!auditDatabaseUrl || auditDatabaseUrl.startsWith("${{")) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(
        "AUDIT_DATABASE_URL must be configured before starting DB-backed API runtime outside local/test.",
      );
    }

    return null;
  }

  const client = postgres(auditDatabaseUrl, {
    max: Number(env.AUDIT_DB_POOL_MAX ?? env.DB_POOL_MAX ?? 5),
  });

  return drizzle(client, { schema: auditSchema });
}

export function createRuntimeIdentityVerifier(
  env: Record<string, string | undefined>,
) {
  const secretKey = env.CLERK_SECRET_KEY;

  if (!secretKey) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(
        "CLERK_SECRET_KEY must be configured before starting DB-backed API runtime outside local/test.",
      );
    }

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
