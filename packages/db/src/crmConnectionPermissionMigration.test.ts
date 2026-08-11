import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const legacyPermission = "crm.whatsapp.connection.manage";
const replacementPermissions = [
  "crm.messaging.connection.setup",
  "crm.messaging.connection.pair",
] as const;

const migration = readMigration("0024_split_crm_connection_permissions.sql");
const initialProjection = readMigration("0002_seed_role_templates.sql");
const localProjection = readFileSync(
  new URL(
    "../../../docker/postgres/seed/product/16-role-permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const runRawDb = process.env.RUN_RAW_CRM_PERMISSION_MIGRATION_TESTS === "true";

describe("CRM connection permission migration", () => {
  it("projects both replacement grants before removing the legacy grant", () => {
    expect(migration).toContain('FROM "role_template_permissions" AS legacy');
    for (const permission of replacementPermissions) {
      expect(migration).toContain(`('${permission}')`);
    }
    expect(
      migration.indexOf('INSERT INTO "role_template_permissions"'),
    ).toBeLessThan(
      migration.indexOf('DELETE FROM "role_template_permissions"'),
    );
  });

  it("copies allow and deny overrides to both replacements before cleanup", () => {
    expect(migration).toContain(
      'FROM "membership_permission_overrides" AS legacy',
    );
    expect(migration).toContain('legacy."allowed"');
    expect(migration).toContain('legacy."reason"');
    expect(migration).toContain(
      '"membership_permission_overrides"."allowed" AND EXCLUDED."allowed"',
    );
    expect(
      migration.indexOf('INSERT INTO "membership_permission_overrides"'),
    ).toBeLessThan(
      migration.indexOf('DELETE FROM "membership_permission_overrides"'),
    );
  });

  it("keeps fresh-install and local-seed projections free of the legacy key", () => {
    for (const projection of [initialProjection, localProjection]) {
      expect(projection).not.toContain(legacyPermission);
      for (const permission of replacementPermissions) {
        expect(projection).toContain(permission);
      }
    }
  });
});

describe.skipIf(!runRawDb)(
  "CRM connection permission migration on Postgres",
  () => {
    it("splits grants and overrides with deny-wins before removing legacy rows", async () => {
      expect(
        process.env.DATABASE_URL,
        "DATABASE_URL is required for raw CRM permission migration validation",
      ).toBeTruthy();

      const sql = postgres(process.env.DATABASE_URL ?? "", {
        max: 1,
        prepare: false,
      });
      const rollback = new Error(
        "rollback CRM permission migration validation",
      );

      try {
        await sql.begin(async (transaction) => {
          await transaction.unsafe(`
          CREATE TEMP TABLE "role_template_permissions" (
            "created_at" timestamptz NOT NULL,
            "permission_key" text NOT NULL,
            "role_template_id" uuid NOT NULL,
            "updated_at" timestamptz NOT NULL,
            UNIQUE ("role_template_id", "permission_key")
          );
          CREATE TEMP TABLE "membership_permission_overrides" (
            "allowed" boolean NOT NULL,
            "created_at" timestamptz NOT NULL,
            "membership_id" uuid NOT NULL,
            "permission_key" text NOT NULL,
            "reason" text,
            "updated_at" timestamptz NOT NULL,
            UNIQUE ("membership_id", "permission_key")
          );
        `);

          const roleTemplateId = randomUUID();
          const splitAllowId = randomUUID();
          const splitDenyId = randomUUID();
          const allowThenDenyId = randomUUID();
          const denyThenAllowId = randomUUID();

          await transaction`
          INSERT INTO "role_template_permissions" (
            "created_at", "permission_key", "role_template_id", "updated_at"
          ) VALUES (
            now(), ${legacyPermission}, ${roleTemplateId}, now()
          )
        `;
          await transaction`
          INSERT INTO "membership_permission_overrides" (
            "allowed", "created_at", "membership_id", "permission_key", "reason", "updated_at"
          ) VALUES
            (true, now(), ${splitAllowId}, ${legacyPermission}, 'legacy allow', now()),
            (false, now(), ${splitDenyId}, ${legacyPermission}, 'legacy deny', now()),
            (false, now(), ${allowThenDenyId}, ${legacyPermission}, 'legacy deny wins', now()),
            (true, now(), ${denyThenAllowId}, ${legacyPermission}, 'legacy allow loses', now()),
            (true, now(), ${allowThenDenyId}, ${replacementPermissions[0]}, 'existing allow', now()),
            (true, now(), ${allowThenDenyId}, ${replacementPermissions[1]}, 'existing allow', now()),
            (false, now(), ${denyThenAllowId}, ${replacementPermissions[0]}, 'existing deny', now()),
            (false, now(), ${denyThenAllowId}, ${replacementPermissions[1]}, 'existing deny', now())
        `;

          await transaction.unsafe(migration);

          const roleGrants = await transaction<{ permission_key: string }[]>`
          SELECT "permission_key"
          FROM "role_template_permissions"
          WHERE "role_template_id" = ${roleTemplateId}
          ORDER BY "permission_key"
        `;
          expect(roleGrants.map((row) => row.permission_key)).toEqual([
            replacementPermissions[1],
            replacementPermissions[0],
          ]);

          const overrides = await transaction<
            {
              allowed: boolean;
              membership_id: string;
              permission_key: string;
              reason: string | null;
            }[]
          >`
          SELECT "allowed", "membership_id", "permission_key", "reason"
          FROM "membership_permission_overrides"
          ORDER BY "membership_id", "permission_key"
        `;
          expect(overridesFor(overrides, splitAllowId)).toEqual([
            [replacementPermissions[1], true, "legacy allow"],
            [replacementPermissions[0], true, "legacy allow"],
          ]);
          expect(overridesFor(overrides, splitDenyId)).toEqual([
            [replacementPermissions[1], false, "legacy deny"],
            [replacementPermissions[0], false, "legacy deny"],
          ]);
          expect(overridesFor(overrides, allowThenDenyId)).toEqual([
            [replacementPermissions[1], false, "legacy deny wins"],
            [replacementPermissions[0], false, "legacy deny wins"],
          ]);
          expect(overridesFor(overrides, denyThenAllowId)).toEqual([
            [replacementPermissions[1], false, "existing deny"],
            [replacementPermissions[0], false, "existing deny"],
          ]);

          const [retiredRows] = await transaction<
            { override_count: number; role_count: number }[]
          >`
          SELECT
            (SELECT count(*)::integer FROM "membership_permission_overrides"
              WHERE "permission_key" = ${legacyPermission}) AS "override_count",
            (SELECT count(*)::integer FROM "role_template_permissions"
              WHERE "permission_key" = ${legacyPermission}) AS "role_count"
        `;
          expect(retiredRows).toEqual({ override_count: 0, role_count: 0 });

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

function overridesFor(
  rows: {
    allowed: boolean;
    membership_id: string;
    permission_key: string;
    reason: string | null;
  }[],
  membershipId: string,
) {
  return rows
    .filter((row) => row.membership_id === membershipId)
    .map((row) => [row.permission_key, row.allowed, row.reason]);
}

function readMigration(name: string) {
  return readFileSync(
    new URL(`../migrations/${name}`, import.meta.url),
    "utf8",
  );
}
