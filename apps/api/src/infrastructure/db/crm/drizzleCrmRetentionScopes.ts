import { sql } from "drizzle-orm";
import type {
  CrmRetentionRepository,
  CrmRetentionScopeClaim,
} from "../../../domains/crm/ports/crmRetentionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function claimDrizzleCrmRetentionScopes(
  db: DrizzleCrmClient,
  input: Parameters<CrmRetentionRepository["claimScopes"]>[0],
): Promise<readonly CrmRetentionScopeClaim[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into crm_retention_scopes (tenant_id, store_id, next_run_at)
      select store.tenant_id, store.id, ${input.now.toISOString()}
      from stores store
      where store.is_deleted = false
        and (${input.tenantId ?? null}::uuid is null or store.tenant_id = ${input.tenantId ?? null}::uuid)
        and (${input.storeId ?? null}::uuid is null or store.id = ${input.storeId ?? null}::uuid)
      on conflict (tenant_id, store_id) do nothing
    `);
    const rows = await tx.execute(sql`
      with candidates as (
        select scope.id
        from crm_retention_scopes scope
        inner join stores store
          on store.id = scope.store_id
          and store.tenant_id = scope.tenant_id
          and store.is_deleted = false
        where scope.next_run_at <= ${input.now.toISOString()}
          and (scope.lease_expires_at is null or scope.lease_expires_at <= ${input.now.toISOString()})
          and (${input.tenantId ?? null}::uuid is null or scope.tenant_id = ${input.tenantId ?? null}::uuid)
          and (${input.storeId ?? null}::uuid is null or scope.store_id = ${input.storeId ?? null}::uuid)
        order by scope.next_run_at, scope.tenant_id, scope.store_id
        for update of scope skip locked
        limit ${input.limit}
      )
      update crm_retention_scopes scope
      set lease_owner = ${input.leaseOwner},
          lease_expires_at = ${input.leaseExpiresAt.toISOString()},
          last_started_at = ${input.now.toISOString()},
          updated_at = ${input.now.toISOString()}
      from candidates
      where scope.id = candidates.id
      returning scope.tenant_id, scope.store_id, scope.cursor
    `);
    return (
      rows as unknown as Array<{
        cursor: string | null;
        store_id: string;
        tenant_id: string;
      }>
    ).map((row) => ({
      ...(row.cursor ? { cursor: row.cursor } : {}),
      storeId: row.store_id,
      tenantId: row.tenant_id,
    }));
  });
}

export async function completeDrizzleCrmRetentionScope(
  db: DrizzleCrmClient,
  input: Parameters<CrmRetentionRepository["completeScope"]>[0],
): Promise<boolean> {
  const rows = await db.execute(sql`
    update crm_retention_scopes
    set cursor = ${input.cursor ?? null},
        next_run_at = ${input.nextRunAt.toISOString()},
        lease_owner = null,
        lease_expires_at = null,
        last_completed_at = case when ${input.succeeded} then ${input.now.toISOString()} else last_completed_at end,
        last_failed_at = case when ${input.succeeded} then last_failed_at else ${input.now.toISOString()} end,
        updated_at = ${input.now.toISOString()}
    where tenant_id = ${input.tenantId}::uuid
      and store_id = ${input.storeId}::uuid
      and lease_owner = ${input.leaseOwner}
    returning id
  `);
  return (rows as unknown as unknown[]).length === 1;
}
