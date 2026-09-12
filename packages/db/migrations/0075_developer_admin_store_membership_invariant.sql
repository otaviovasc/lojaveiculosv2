-- Staging preflight (read-only; returns counts only and never changes data):
-- SELECT assignment_source, count(*) AS invalid_assignment_count
-- FROM (
--   SELECT 'store_memberships' AS assignment_source, role_template_id FROM store_memberships
--   UNION ALL
--   SELECT 'tenant_memberships', role_template_id FROM tenant_memberships
--   UNION ALL
--   SELECT 'identity_invitations', role_template_id FROM identity_invitations
-- ) AS assignment
-- INNER JOIN role_templates ON role_templates.id = assignment.role_template_id
-- WHERE role_templates.role_key = 'admin'
-- GROUP BY assignment_source
-- ORDER BY assignment_source;

DO $$
DECLARE
  invalid_assignment_count bigint;
  invalid_assignment_sources text;
BEGIN
  SELECT count(*), string_agg(DISTINCT assignment."assignment_source", ', ' ORDER BY assignment."assignment_source")
  INTO invalid_assignment_count, invalid_assignment_sources
  FROM (
    SELECT 'store_memberships' AS "assignment_source", membership."role_template_id"
    FROM "store_memberships" AS membership
    UNION ALL
    SELECT 'tenant_memberships', membership."role_template_id"
    FROM "tenant_memberships" AS membership
    UNION ALL
    SELECT 'identity_invitations', invitation."role_template_id"
    FROM "identity_invitations" AS invitation
  ) AS assignment
  INNER JOIN "role_templates" AS role_template
    ON role_template."id" = assignment."role_template_id"
  WHERE role_template."role_key" = 'admin';

  IF invalid_assignment_count > 0 THEN
    RAISE EXCEPTION
      'Developer admin assignment invariant blocked: % invalid assignment(s) found in %',
      invalid_assignment_count,
      invalid_assignment_sources
      USING
        ERRCODE = '23514',
        HINT = 'Run the read-only staging preflight query in migration 0075, audit the affected assignments, and remove them explicitly. Platform developers belong only in platform_admin_memberships.';
  END IF;
END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "store_memberships_reject_admin_role" ON "store_memberships";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "tenant_memberships_reject_admin_role" ON "tenant_memberships";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "identity_invitations_reject_admin_role" ON "identity_invitations";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "prevent_store_membership_admin_role"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_identity_assignment_admin_role"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_role_key text;
BEGIN
  SELECT role_template."role_key"::text
  INTO assigned_role_key
  FROM "role_templates" AS role_template
  WHERE role_template."id" = NEW."role_template_id"
  FOR KEY SHARE;

  IF assigned_role_key = 'admin' THEN
    RAISE EXCEPTION
      'The developer-only admin role cannot be assigned through %', TG_TABLE_NAME
      USING
        ERRCODE = '23514',
        HINT = 'Use owner or agency for customer access. Use platform_admin_memberships for platform developers.';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "store_memberships_reject_admin_role"
BEFORE INSERT OR UPDATE OF "role_template_id"
ON "store_memberships"
FOR EACH ROW
EXECUTE FUNCTION "prevent_identity_assignment_admin_role"();
--> statement-breakpoint
CREATE TRIGGER "tenant_memberships_reject_admin_role"
BEFORE INSERT OR UPDATE OF "role_template_id"
ON "tenant_memberships"
FOR EACH ROW
EXECUTE FUNCTION "prevent_identity_assignment_admin_role"();
--> statement-breakpoint
CREATE TRIGGER "identity_invitations_reject_admin_role"
BEFORE INSERT OR UPDATE OF "role_template_id"
ON "identity_invitations"
FOR EACH ROW
EXECUTE FUNCTION "prevent_identity_assignment_admin_role"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_role_template_admin_promotion"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."role_key" = 'admin' AND OLD."role_key" IS DISTINCT FROM NEW."role_key" THEN
    RAISE EXCEPTION
      'An assignable identity role template cannot be promoted to the developer-only admin role'
      USING
        ERRCODE = '23514',
        HINT = 'Keep admin as the dedicated system template and use platform_admin_memberships for platform developers.';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "role_templates_reject_admin_promotion" ON "role_templates";
--> statement-breakpoint
CREATE TRIGGER "role_templates_reject_admin_promotion"
BEFORE UPDATE OF "role_key"
ON "role_templates"
FOR EACH ROW
EXECUTE FUNCTION "prevent_role_template_admin_promotion"();
