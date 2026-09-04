import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres, { type TransactionSql } from "postgres";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0075_developer_admin_store_membership_invariant.sql",
    import.meta.url,
  ),
  "utf8",
);
const runRawDb =
  process.env.RUN_RAW_ADMIN_ROLE_MEMBERSHIP_INTEGRITY_TESTS === "true";
const storeRoleKeys = [
  "agency",
  "owner",
  "supervisor",
  "salesman",
  "investor",
] as const;

describe.skipIf(!runRawDb)(
  "developer-only admin identity assignment invariant on Postgres",
  () => {
    it("allows customer roles and platform admins while rejecting admin assignments", async () => {
      const sql = openDatabase();
      const rollback = new Error("rollback admin membership invariant test");

      try {
        await sql.begin(async (transaction) => {
          await transaction.unsafe(migrationSql);
          const fixture = await createFixture(transaction);

          for (const roleKey of storeRoleKeys) {
            await transaction`
              INSERT INTO store_memberships (
                role_template_id, status, store_id, tenant_id, user_id
              ) VALUES (
                ${fixture.roleIds[roleKey]}, 'active', ${fixture.storeId},
                ${fixture.tenantId}, ${fixture.userIds[roleKey]}
              )
            `;
          }

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                INSERT INTO store_memberships (
                  role_template_id, status, store_id, tenant_id, user_id
                ) VALUES (
                  ${fixture.roleIds.admin}, 'active', ${fixture.storeId},
                  ${fixture.tenantId}, ${fixture.userIds.admin}
                )
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          for (const roleKey of storeRoleKeys) {
            await transaction`
              INSERT INTO tenant_memberships (
                role_template_id, status, tenant_id, user_id
              ) VALUES (
                ${fixture.roleIds[roleKey]}, 'active', ${fixture.tenantId},
                ${fixture.userIds[roleKey]}
              )
            `;
            await transaction`
              INSERT INTO identity_invitations (
                email, role_template_id, status, store_id, tenant_id
              ) VALUES (
                ${`valid-${roleKey}-${randomUUID()}@example.test`},
                ${fixture.roleIds[roleKey]}, 'pending', ${fixture.storeId},
                ${fixture.tenantId}
              )
            `;
          }

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                INSERT INTO tenant_memberships (
                  role_template_id, status, tenant_id, user_id
                ) VALUES (
                  ${fixture.roleIds.admin}, 'active', ${fixture.tenantId},
                  ${fixture.userIds.admin}
                )
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                UPDATE tenant_memberships
                SET role_template_id = ${fixture.roleIds.admin}
                WHERE tenant_id = ${fixture.tenantId}
                  AND user_id = ${fixture.userIds.owner}
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                INSERT INTO identity_invitations (
                  email, role_template_id, status, store_id, tenant_id
                ) VALUES (
                  ${`invalid-admin-${randomUUID()}@example.test`},
                  ${fixture.roleIds.admin}, 'pending', ${fixture.storeId},
                  ${fixture.tenantId}
                )
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                UPDATE identity_invitations
                SET role_template_id = ${fixture.roleIds.admin}
                WHERE tenant_id = ${fixture.tenantId}
                  AND role_template_id = ${fixture.roleIds.owner}
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                UPDATE store_memberships
                SET role_template_id = ${fixture.roleIds.admin}
                WHERE store_id = ${fixture.storeId}
                  AND user_id = ${fixture.userIds.owner}
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          await transaction`
            INSERT INTO platform_admin_memberships (status, user_id)
            VALUES ('active', ${fixture.userIds.admin})
          `;
          const [platformAdmin] = await transaction<{ count: number }[]>`
            SELECT count(*)::integer AS count
            FROM platform_admin_memberships
            WHERE user_id = ${fixture.userIds.admin}
          `;
          expect(platformAdmin?.count).toBe(1);

          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sql.end();
      }
    });

    it("rejects promoting an assignable identity role template to admin", async () => {
      const sql = openDatabase();
      const rollback = new Error("rollback role template promotion test");

      try {
        await sql.begin(async (transaction) => {
          await transaction.unsafe(migrationSql);
          const fixture = await createFixture(transaction);
          await transaction`
            INSERT INTO store_memberships (
              role_template_id, status, store_id, tenant_id, user_id
            ) VALUES (
              ${fixture.roleIds.owner}, 'active', ${fixture.storeId},
              ${fixture.tenantId}, ${fixture.userIds.owner}
            )
          `;

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint`
                UPDATE role_templates
                SET role_key = 'admin'
                WHERE id = ${fixture.roleIds.owner}
              `;
            }),
          ).rejects.toMatchObject({ code: "23514" });

          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sql.end();
      }
    });

    it("fails migration without rewriting any existing invalid assignment", async () => {
      const sql = openDatabase();
      const rollback = new Error("rollback fail-closed migration test");

      try {
        await sql.begin(async (transaction) => {
          await removeInvariant(transaction);
          const fixture = await createFixture(transaction);
          await transaction`
            INSERT INTO store_memberships (
              role_template_id, status, store_id, tenant_id, user_id
            ) VALUES (
              ${fixture.roleIds.admin}, 'active', ${fixture.storeId},
              ${fixture.tenantId}, ${fixture.userIds.admin}
            )
          `;
          await transaction`
            INSERT INTO tenant_memberships (
              role_template_id, status, tenant_id, user_id
            ) VALUES (
              ${fixture.roleIds.admin}, 'active', ${fixture.tenantId},
              ${fixture.userIds.admin}
            )
          `;
          await transaction`
            INSERT INTO identity_invitations (
              email, role_template_id, status, store_id, tenant_id
            ) VALUES (
              ${`legacy-admin-${randomUUID()}@example.test`},
              ${fixture.roleIds.admin}, 'pending', ${fixture.storeId},
              ${fixture.tenantId}
            )
          `;

          await expect(
            transaction.savepoint(async (savepoint) => {
              await savepoint.unsafe(migrationSql);
            }),
          ).rejects.toMatchObject({ code: "23514" });

          const [invalidAssignment] = await transaction<{ count: number }[]>`
            SELECT count(*)::integer AS count
            FROM (
              SELECT role_template_id FROM store_memberships
              WHERE store_id = ${fixture.storeId}
              UNION ALL
              SELECT role_template_id FROM tenant_memberships
              WHERE tenant_id = ${fixture.tenantId}
                AND user_id = ${fixture.userIds.admin}
              UNION ALL
              SELECT role_template_id FROM identity_invitations
              WHERE tenant_id = ${fixture.tenantId}
                AND role_template_id = ${fixture.roleIds.admin}
            ) AS invalid_assignment
            WHERE role_template_id = ${fixture.roleIds.admin}
          `;
          expect(invalidAssignment?.count).toBe(3);

          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sql.end();
      }
    });
  },
);

function openDatabase() {
  expect(
    process.env.DATABASE_URL,
    "DATABASE_URL is required for raw admin role membership validation",
  ).toBeTruthy();
  return postgres(process.env.DATABASE_URL ?? "", { max: 1, prepare: false });
}

async function createFixture(transaction: TransactionSql) {
  const tenantId = randomUUID();
  const storeId = randomUUID();
  const roleKeys = [
    "admin",
    "agency",
    "owner",
    "supervisor",
    "salesman",
    "investor",
  ] as const;
  const roleRows = await transaction<{ id: string; role_key: string }[]>`
    SELECT id, role_key::text AS role_key
    FROM role_templates
    WHERE role_key::text = ANY(${roleKeys})
  `;
  const roleIds = Object.fromEntries(
    roleRows.map(({ id, role_key: roleKey }) => [roleKey, id]),
  ) as Record<(typeof roleKeys)[number], string>;
  expect(Object.keys(roleIds).sort()).toEqual([...roleKeys].sort());

  await transaction`
    INSERT INTO tenants (id, legal_name, slug, trading_name)
    VALUES (
      ${tenantId}, 'Admin invariant tenant', ${`admin-invariant-${tenantId}`},
      'Admin invariant tenant'
    )
  `;
  await transaction`
    INSERT INTO stores (id, legal_name, public_slug, tenant_id, trading_name)
    VALUES (
      ${storeId}, 'Admin invariant store', ${`admin-invariant-${storeId}`},
      ${tenantId}, 'Admin invariant store'
    )
  `;

  const userIds = {} as Record<(typeof roleKeys)[number], string>;
  for (const roleKey of roleKeys) {
    const userId = randomUUID();
    userIds[roleKey] = userId;
    await transaction`
      INSERT INTO users (clerk_user_id, email, id, name, tenant_id)
      VALUES (
        ${`clerk-admin-invariant-${userId}`},
        ${`admin-invariant-${roleKey}-${userId}@example.test`}, ${userId},
        ${`Admin invariant ${roleKey}`}, ${tenantId}
      )
    `;
  }

  return { roleIds, storeId, tenantId, userIds };
}

async function removeInvariant(transaction: TransactionSql) {
  await transaction.unsafe(`
    DROP TRIGGER IF EXISTS "store_memberships_reject_admin_role"
      ON "store_memberships";
    DROP TRIGGER IF EXISTS "tenant_memberships_reject_admin_role"
      ON "tenant_memberships";
    DROP TRIGGER IF EXISTS "identity_invitations_reject_admin_role"
      ON "identity_invitations";
    DROP TRIGGER IF EXISTS "role_templates_reject_admin_promotion"
      ON "role_templates";
    DROP FUNCTION IF EXISTS "prevent_store_membership_admin_role"();
    DROP FUNCTION IF EXISTS "prevent_identity_assignment_admin_role"();
    DROP FUNCTION IF EXISTS "prevent_role_template_admin_promotion"();
  `);
}
