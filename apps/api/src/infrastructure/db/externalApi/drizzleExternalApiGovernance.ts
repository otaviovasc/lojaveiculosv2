import { and, eq, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { apiIdempotencyKeys, apiRequestLogs } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CompleteExternalApiIdempotencyInput,
  FailExternalApiIdempotencyInput,
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
}

export async function completeExternalApiIdempotencyKey(
  db: DrizzleExternalApiGovernanceClient,
  input: CompleteExternalApiIdempotencyInput,
) {
  const [updated] = await db
    .update(apiIdempotencyKeys)
    .set({
      completedAt: new Date(),
      responseBody: input.body,
      responseContentType: input.contentType,
      responseMs: input.responseMs,
      status: "completed",
      statusCode: input.statusCode,
    })
    .where(idempotencyAttemptMatches(input))
    .returning({ id: apiIdempotencyKeys.id });
  return Boolean(updated);
}

export async function failExternalApiIdempotencyKey(
  db: DrizzleExternalApiGovernanceClient,
  input: FailExternalApiIdempotencyInput,
) {
  const [updated] = await db
    .update(apiIdempotencyKeys)
    .set({
      completedAt: new Date(),
      responseMs: input.responseMs,
      status: "failed",
      statusCode: input.statusCode,
    })
    .where(idempotencyAttemptMatches(input))
    .returning({ id: apiIdempotencyKeys.id });
  return Boolean(updated);
}

export async function reserveExternalApiIdempotencyKey(
  db: DrizzleExternalApiGovernanceClient,
  input: ReserveExternalApiIdempotencyInput,
) {
  const [created] = await db
    .insert(apiIdempotencyKeys)
    .values({
      clientId: input.clientId,
      idempotencyKey: input.idempotencyKey,
      method: input.method,
      path: input.path,
      requestFingerprint: input.requestFingerprint,
      requestId: input.requestId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [apiIdempotencyKeys.clientId, apiIdempotencyKeys.idempotencyKey],
    })
    .returning({ id: apiIdempotencyKeys.id });

  if (created) return { kind: "created" as const };

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

  if (!existing) {
    throw new Error("External API idempotency reservation was not persisted.");
  }
  if (existing.requestFingerprint === input.requestFingerprint) {
    if (
      existing.status === "completed" &&
      existing.statusCode !== null &&
      existing.responseContentType
    ) {
      return {
        body: existing.responseBody,
        contentType: existing.responseContentType,
        kind: "replay" as const,
        statusCode: existing.statusCode,
      };
    }
    if (existing.status === "failed") {
      return { kind: "failed" as const, statusCode: existing.statusCode };
    }
    return { kind: "in_flight" as const };
  }
  return {
    kind: "conflict" as const,
    requestFingerprint: existing.requestFingerprint,
  };
}

function idempotencyAttemptMatches(input: {
  clientId: string;
  idempotencyKey: string;
  requestFingerprint: string;
}) {
  return and(
    eq(apiIdempotencyKeys.clientId, input.clientId),
    eq(apiIdempotencyKeys.idempotencyKey, input.idempotencyKey),
    eq(apiIdempotencyKeys.requestFingerprint, input.requestFingerprint),
    eq(apiIdempotencyKeys.status, "started"),
  );
}
