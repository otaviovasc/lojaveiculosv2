import { and, eq } from "drizzle-orm";
import { fiscalProviderConnections } from "@lojaveiculosv2/db";
import type {
  FiscalConnection,
  FiscalConnectionRepository,
  UpsertFiscalConnectionInput,
} from "../../../domains/fiscal/ports/fiscalConnectionRepository.js";
import type { FiscalCredentialCodec } from "../../fiscal/fiscalCredentialCodec.js";
import type { DrizzleFiscalClient } from "./drizzleFiscalRepository.js";

export function createDrizzleFiscalConnectionRepository(
  db: DrizzleFiscalClient,
  credentialCodec: FiscalCredentialCodec,
): FiscalConnectionRepository {
  return {
    async findByCompanyId(companyId) {
      const [row] = await db
        .select()
        .from(fiscalProviderConnections)
        .where(
          and(
            eq(fiscalProviderConnections.provider, "spedy"),
            eq(fiscalProviderConnections.companyId, companyId),
          ),
        )
        .limit(1);
      return row ? toConnection(row) : null;
    },
    async get(input) {
      const [row] = await db
        .select()
        .from(fiscalProviderConnections)
        .where(scopedConnection(input))
        .limit(1);
      return row ? toConnection(row) : null;
    },
    async getCompanyApiKey(input) {
      const [row] = await db
        .select({
          credentialCiphertext: fiscalProviderConnections.credentialCiphertext,
        })
        .from(fiscalProviderConnections)
        .where(scopedConnection(input))
        .limit(1);
      return row?.credentialCiphertext
        ? credentialCodec.decrypt(row.credentialCiphertext)
        : null;
    },
    upsert: (input) => upsertConnection(db, credentialCodec, input),
  };
}

async function upsertConnection(
  db: DrizzleFiscalClient,
  credentialCodec: FiscalCredentialCodec,
  input: UpsertFiscalConnectionInput,
) {
  const values = {
    ...(input.capabilities ? { capabilities: input.capabilities } : {}),
    ...(input.certificateExpiresAt !== undefined
      ? { certificateExpiresAt: input.certificateExpiresAt }
      : {}),
    ...(input.companyApiKey
      ? { credentialCiphertext: credentialCodec.encrypt(input.companyApiKey) }
      : {}),
    ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
    ...(input.defaultsConfirmedAt !== undefined
      ? { defaultsConfirmedAt: input.defaultsConfirmedAt }
      : {}),
    ...(input.defaultsConfirmedBy !== undefined
      ? { defaultsConfirmedBy: input.defaultsConfirmedBy }
      : {}),
    ...(input.defaultsStatus ? { defaultsStatus: input.defaultsStatus } : {}),
    ...(input.issuerProfile ? { issuerProfile: input.issuerProfile } : {}),
    ...(input.lastErrorCode !== undefined
      ? { lastErrorCode: input.lastErrorCode }
      : {}),
    ...(input.lastSyncedAt !== undefined
      ? { lastSyncedAt: input.lastSyncedAt }
      : {}),
    provider: "spedy" as const,
    ...(input.status ? { status: input.status } : {}),
    storeId: input.storeId,
    ...(input.taxDefaults ? { taxDefaults: input.taxDefaults } : {}),
    tenantId: input.tenantId,
    ...(input.webhookRegisteredAt !== undefined
      ? { webhookRegisteredAt: input.webhookRegisteredAt }
      : {}),
  };
  const [row] = await db
    .insert(fiscalProviderConnections)
    .values(values)
    .onConflictDoUpdate({
      set: values,
      target: [
        fiscalProviderConnections.storeId,
        fiscalProviderConnections.provider,
      ],
    })
    .returning();
  if (!row) throw new Error("Fiscal provider connection was not persisted.");
  return toConnection(row);
}

function scopedConnection(input: { storeId: string; tenantId: string }) {
  return and(
    eq(fiscalProviderConnections.provider, "spedy"),
    eq(fiscalProviderConnections.storeId, input.storeId),
    eq(fiscalProviderConnections.tenantId, input.tenantId),
  );
}

function toConnection(
  row: typeof fiscalProviderConnections.$inferSelect,
): FiscalConnection {
  return {
    capabilities: toRecord(row.capabilities),
    certificateExpiresAt: row.certificateExpiresAt,
    companyId: row.companyId,
    defaultsConfirmedAt: row.defaultsConfirmedAt,
    defaultsConfirmedBy: row.defaultsConfirmedBy,
    defaultsStatus: row.defaultsStatus,
    issuerProfile: toRecord(row.issuerProfile),
    lastErrorCode: row.lastErrorCode,
    lastSyncedAt: row.lastSyncedAt,
    provider: "spedy",
    status: row.status,
    storeId: row.storeId,
    taxDefaults: toRecord(row.taxDefaults),
    tenantId: row.tenantId,
    webhookRegisteredAt: row.webhookRegisteredAt,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
