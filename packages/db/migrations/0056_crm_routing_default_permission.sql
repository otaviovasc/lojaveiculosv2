-- Keep channel setup and default-route selection as distinct privileged fields.
-- Existing grants and deny overrides are projected forward without widening
-- access beyond actors who could already configure the channel connection.

INSERT INTO "role_template_permissions" (
  "created_at",
  "permission_key",
  "role_template_id",
  "updated_at"
)
SELECT
  existing."created_at",
  'crm.routing.default.manage',
  existing."role_template_id",
  now()
FROM "role_template_permissions" AS existing
WHERE existing."permission_key" = 'crm.messaging.connection.setup'
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "membership_permission_overrides" (
  "allowed",
  "created_at",
  "membership_id",
  "permission_key",
  "reason",
  "updated_at"
)
SELECT
  existing."allowed",
  existing."created_at",
  existing."membership_id",
  'crm.routing.default.manage',
  existing."reason",
  now()
FROM "membership_permission_overrides" AS existing
WHERE existing."permission_key" = 'crm.messaging.connection.setup'
ON CONFLICT ("membership_id", "permission_key") DO UPDATE SET
  "allowed" = "membership_permission_overrides"."allowed" AND EXCLUDED."allowed",
  "reason" = CASE
    WHEN EXCLUDED."allowed" = false THEN EXCLUDED."reason"
    ELSE "membership_permission_overrides"."reason"
  END,
  "updated_at" = now();
