import { and, eq, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { apiIdempotencyKeys, apiRequestLogs } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  RecordExternalApiRequestInput,
  ReserveExternalApiIdempotencyInput,
} from "../../../domains/externalApi/ports/externalApiRepository.js";

export type DrizzleExternalApiGovernanceClient = PostgresJsDatabase<
  typeof schema
>;

export async function countRecentExternalApiRequests(
  db: DrizzleExternalApiGovernanceClient,
  input: { clientId: string; since: Date },
): Promise<number> {
  const rows = await db
    .select({ id: apiRequestLogs.id })
    .from(apiRequestLogs)
    .where(
      and(
        eq(apiRequestLogs.clientId, input.clientId),
        gte(apiRequestLogs.createdAt, input.since),
      ),
    )
    .limit(1000);
  return rows.length;
}

export async function recordExternalApiRequest(
  db: DrizzleExternalApiGovernanceClient,
  input: RecordExternalApiRequestInput,
): Promise<void> {
  await db.insert(apiRequestLogs).values({
    clientId: input.clientId,
    method: input.method,
    path: input.path,
    requestId: input.requestId,
    responseMs: input.responseMs,
    statusCode: input.statusCode,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });

  if (input.idempotencyKey) {
    await updateIdempotencyStatus(db, {
      ...input,
      idempotencyKey: input.idempotencyKey,
    });
  }
}

export async function reserveExternalApiIdempotencyKey(
  db: DrizzleExternalApiGovernanceClient,
  input: ReserveExternalApiIdempotencyInput,
) {
  const [existing] = await db
    .select()
    .from(apiIdempotencyKeys)
    .where(
      and(
        eq(apiIdempotencyKeys.clientId, input.clientId),
        eq(apiIdempotencyKeys.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (existing?.requestFingerprint === input.requestFingerprint) {
    return { kind: "duplicate" as const, statusCode: existing.statusCode };
  }
  if (existing) {
    return {
      kind: "conflict" as const,
      requestFingerprint: existing.requestFingerprint,
    };
  }

  await db.insert(apiIdempotencyKeys).values({
    clientId: input.clientId,
    idempotencyKey: input.idempotencyKey,
    method: input.method,
    path: input.path,
    requestFingerprint: input.requestFingerprint,
    requestId: input.requestId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });

  return { kind: "created" as const };
}

async function updateIdempotencyStatus(
  db: DrizzleExternalApiGovernanceClient,
  input: RecordExternalApiRequestInput & { idempotencyKey: string },
) {
  await db
    .update(apiIdempotencyKeys)
    .set({
      completedAt: new Date(),
      responseMs: input.responseMs,
      status: input.statusCode >= 500 ? "failed" : "completed",
      statusCode: input.statusCode,
    })
    .where(
      and(
        eq(apiIdempotencyKeys.clientId, input.clientId),
        eq(apiIdempotencyKeys.idempotencyKey, input.idempotencyKey),
      ),
    );
}
