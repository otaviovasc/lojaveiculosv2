import {
  assert,
  assertCount,
  byKey,
  seedIds,
  seededTenantIds,
} from "./local-seed-smoke-support.mjs";

const expectedPermissionCounts = Object.freeze({
  admin: 80,
  agency: 86,
  investor: 13,
  owner: 86,
  salesman: 41,
  supervisor: 68,
});

export async function assertSeedIdentity(db) {
  const stores = await assertStoreTopology(db);
  const accounts = await assertAccountScenarios(db);
  const permissions = await assertPermissionProjection(db);
  const scopedTables = await assertTenantStoreScopes(db);
  return { accounts, permissions, scopedTables, stores };
}

async function assertStoreTopology(db) {
  const rows = await db`
    select tenant_id as "tenantId", count(*)::int as "storeCount"
    from stores
    where tenant_id in ${db(seededTenantIds)} and is_deleted = false
    group by tenant_id
    order by tenant_id
  `;
  const stores = byKey(rows, "tenantId");
  assertCount(
    stores[seedIds.primaryTenant],
    "storeCount",
    2,
    "Primary tenant stores",
  );
  assertCount(
    stores[seedIds.foreignTenant],
    "storeCount",
    1,
    "Isolation tenant stores",
  );
  return rows;
}

async function assertAccountScenarios(db) {
  const [row] = await db`
    select
      count(distinct u.id) filter (where u.clerk_user_id in (
        'clerk_seed_owner', 'clerk_seed_supervisor', 'clerk_seed_salesman',
        'clerk_seed_branch_salesman', 'clerk_seed_isolation_owner'
      ) and sm.status = 'active')::int as "activePersonas",
      count(*) filter (where u.clerk_user_id = 'clerk_seed_suspended_salesman'
        and sm.status = 'suspended')::int as "suspendedPersonas"
    from store_memberships sm
    inner join users u on u.id = sm.user_id
    where sm.tenant_id in ${db(seededTenantIds)}
  `;
  const [related] = await db`
    select
      (select count(*)::int from identity_invitations
       where id = '08080808-0808-4808-8808-080808080808'
         and status = 'pending' and clerk_invitation_id is null) as invitations,
      (select count(*)::int from membership_permission_overrides
       where id in (
         '15000000-0000-4000-8000-000000000001',
         '15000000-0000-4000-8000-000000000002',
         '15000000-0000-4000-8000-000000000003'
       )) as overrides
  `;
  assertCount(row, "activePersonas", 5, "Active store personas");
  assertCount(row, "suspendedPersonas", 1, "Suspended persona");
  assertCount(related, "invitations", 1, "Pending invitation");
  assertCount(related, "overrides", 3, "Salesperson permission overrides");
  return { ...row, ...related };
}

async function assertPermissionProjection(db) {
  const rows = await db`
    select rt.role_key as role, count(rtp.id)::int as count
    from role_templates rt
    left join role_template_permissions rtp on rtp.role_template_id = rt.id
    where rt.role_key in ('admin', 'agency', 'investor', 'owner', 'salesman', 'supervisor')
    group by rt.role_key
    order by rt.role_key
  `;
  for (const row of rows) {
    assertCount(
      row,
      "count",
      expectedPermissionCounts[row.role],
      `${row.role} permissions`,
    );
  }
  assertCount({ count: rows.length }, "count", 6, "Projected roles");
  return rows;
}

async function assertTenantStoreScopes(db) {
  const tables = await db`
    select table_name as name
    from information_schema.columns
    where table_schema = 'public' and column_name in ('store_id', 'tenant_id')
    group by table_name
    having count(distinct column_name) = 2
    order by table_name
  `;
  for (const table of tables) {
    const identifier = `"${table.name.replaceAll('"', '""')}"`;
    const [row] = await db.unsafe(
      `
      select count(*)::int as count
      from ${identifier} scoped
      inner join stores store on store.id = scoped.store_id
      where scoped.tenant_id in ($1, $2)
        and scoped.tenant_id <> store.tenant_id
    `,
      seededTenantIds,
    );
    assertCount(row, "count", 0, `${table.name} tenant/store mismatches`);
  }
  return { checked: tables.length };
}
