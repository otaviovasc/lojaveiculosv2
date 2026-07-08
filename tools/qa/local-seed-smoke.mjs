import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import { loadLocalEnv, requireEnv } from "../storage/storageScriptEnv.mjs";

const seedTenantId = "77777777-7777-4777-8777-777777777777";
const seedStoreId = "66666666-6666-4666-8666-666666666666";
const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

loadLocalEnv();
assertSafeLocalDatabaseOperation("qa:seed:local", ["DATABASE_URL"]);

const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });
const r2Config = readR2Config();
const r2 = r2Config
  ? new S3Client({
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      endpoint: r2Config.endpoint,
      forcePathStyle: true,
      region: process.env.R2_REGION ?? "auto",
    })
  : null;

try {
  const summary = {
    accounts: await assertAccounts(),
    billing: await assertBilling(),
    documents: await assertDocuments(),
    media: await assertVehicleMedia(),
    ownership: await assertOwnership(),
    stores: await assertStores(),
  };

  console.info(JSON.stringify(summary, null, 2));
} finally {
  await db.end({ timeout: 5 });
  r2?.destroy();
}

async function assertAccounts() {
  const rows = await db`
    select
      u.clerk_user_id as "clerkUserId",
      rt.role_key as role,
      tm.status,
      tm.tenant_id as "tenantId"
    from users u
    inner join tenant_memberships tm on tm.user_id = u.id
    inner join role_templates rt on rt.id = tm.role_template_id
    where u.clerk_user_id in ('clerk_seed_agency', 'clerk_seed_owner')
    order by u.clerk_user_id
  `;
  expectRow(
    rows,
    (row) =>
      row.clerkUserId === "clerk_seed_agency" &&
      row.role === "agency" &&
      row.status === "active" &&
      row.tenantId === seedTenantId,
    "clerk_seed_agency must be an active agency tenant member.",
  );
  expectRow(
    rows,
    (row) =>
      row.clerkUserId === "clerk_seed_owner" &&
      row.role === "owner" &&
      row.status === "active" &&
      row.tenantId === seedTenantId,
    "clerk_seed_owner must be an active owner tenant member.",
  );
  return rows;
}

async function assertStores() {
  const rows = await db`
    select id, public_slug as "publicSlug", tenant_id as "tenantId"
    from stores
    where tenant_id = ${seedTenantId}
      and is_deleted = false
    order by public_slug
  `;
  assert(
    rows.length === 1,
    "Agency seed tenant must manage exactly one store.",
  );
  assert(
    rows[0].id === seedStoreId,
    "Seed store id must match the seed tenant.",
  );
  assert(
    rows[0].publicSlug === "test-store",
    "Seed store slug must be test-store.",
  );
  return rows;
}

async function assertOwnership() {
  const rows = await db`
    select *
    from (
      select 'documents' as table_name, count(*)::int as mismatches
      from documents
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'finance_entries', count(*)::int
      from finance_entries
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'leads', count(*)::int
      from leads
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'sales', count(*)::int
      from sales
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'store_entitlements', count(*)::int
      from store_entitlements
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'vehicle_listings', count(*)::int
      from vehicle_listings
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'vehicle_media', count(*)::int
      from vehicle_media
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
      union all
      select 'vehicle_units', count(*)::int
      from vehicle_units
      where tenant_id != ${seedTenantId} or store_id != ${seedStoreId}
    ) ownership_checks
    order by table_name
  `;
  const broken = rows.filter((row) => row.mismatches > 0);
  assert(!broken.length, `Seed ownership mismatch: ${JSON.stringify(broken)}`);
  return rows;
}

async function assertBilling() {
  const [row] = await db`
    select
      count(*)::int as "itemCount",
      coalesce(sum(quantity * unit_amount_cents), 0)::int as "monthlyTotal"
    from subscription_items
    where tenant_id = ${seedTenantId}
      and store_id = ${seedStoreId}
      and ends_at is null
  `;
  assert(
    row.itemCount === 2,
    "Seed store must have one plan and one addon item.",
  );
  assert(row.monthlyTotal === 54899, "Seed billing total must be 54899 cents.");
  return row;
}

async function assertDocuments() {
  const [row] = await db`
    select count(*)::int as count
    from document_templates
    where tenant_id = ${seedTenantId}
      and store_id = ${seedStoreId}
      and template_key is not null
  `;
  assert(
    row.count === 5,
    "Seed store must have five document template overrides.",
  );
  return row;
}

async function assertVehicleMedia() {
  const rows = await db`
    select storage_key as "storageKey", url
    from vehicle_media
    where tenant_id = ${seedTenantId}
      and store_id = ${seedStoreId}
    order by display_order, id
  `;
  assert(rows.length === 8, "Seed store must have eight vehicle media rows.");
  for (const row of rows) {
    assert(
      row.url.includes(row.storageKey),
      `Seed media URL must point at storage key ${row.storageKey}.`,
    );
  }
  if (r2 && r2Config) {
    for (const row of rows) {
      await r2.send(
        new HeadObjectCommand({
          Bucket: r2Config.bucketName,
          Key: row.storageKey,
        }),
      );
    }
  }
  return { checkedR2: Boolean(r2), count: rows.length };
}

function expectRow(rows, predicate, message) {
  assert(rows.some(predicate), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readR2Config() {
  const hasAnyConfig = [
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ].some((key) => Boolean(process.env[key]));
  if (!hasAnyConfig) return null;

  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    endpoint: requireEnv("R2_ENDPOINT"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}
