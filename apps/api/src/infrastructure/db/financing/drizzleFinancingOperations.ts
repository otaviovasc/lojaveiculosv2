import { and, eq } from "drizzle-orm";
import { financingOperationRequests } from "@lojaveiculosv2/db";
import type {
  ReserveSimulationOperationInput,
  ReserveSimulationOperationResult,
} from "../../../domains/financing/ports/financingRepository.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function reserveOperation(
  db: DrizzleFinancingClient,
  input: ReserveSimulationOperationInput,
): Promise<ReserveSimulationOperationResult> {
  const existing = await findOperation(db, input);
  if (existing?.requestFingerprint === input.requestFingerprint) {
    return {
      inquiryId: existing.inquiryId,
      kind: "duplicate",
      operationId: existing.id,
    };
  }
  if (existing) {
    return {
      kind: "conflict",
      operationId: existing.id,
      requestFingerprint: existing.requestFingerprint,
    };
  }
  const [row] = await db
    .insert(financingOperationRequests)
    .values({
      idempotencyKey: input.idempotencyKey,
      operationType: "simulation",
      provider: "credere",
      resultSummary: { requestFingerprint: input.requestFingerprint },
      status: "queued",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return { kind: "created", operationId: row.id };
  const raced = await findOperation(db, input);
  if (!raced) throw new Error("Credere operation reservation failed.");
  if (raced.requestFingerprint === input.requestFingerprint) {
    return {
      inquiryId: raced.inquiryId,
      kind: "duplicate",
      operationId: raced.id,
    };
  }
  return {
    kind: "conflict",
    operationId: raced.id,
    requestFingerprint: raced.requestFingerprint,
  };
}

async function findOperation(
  db: DrizzleFinancingClient,
  input: { idempotencyKey: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(financingOperationRequests)
    .where(
      and(
        eq(financingOperationRequests.idempotencyKey, input.idempotencyKey),
        eq(financingOperationRequests.provider, "credere"),
        eq(financingOperationRequests.storeId, input.storeId),
        eq(financingOperationRequests.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const summary = toRecord(row.resultSummary);
  return {
    id: row.id,
    inquiryId: row.inquiryId,
    requestFingerprint:
      typeof summary.requestFingerprint === "string"
        ? summary.requestFingerprint
        : "",
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
