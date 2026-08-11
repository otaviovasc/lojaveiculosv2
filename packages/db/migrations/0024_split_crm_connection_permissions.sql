-- Split the legacy provider-specific connection permission into explicit
-- provider-neutral setup and pairing capabilities. Existing deny overrides
-- remain deny-by-default when a partially rolled-out target override conflicts.

INSERT INTO "role_template_permissions" (
  "created_at",
  "permission_key",
  "role_template_id",
  "updated_at"
)
SELECT
  legacy."created_at",
  replacement."permission_key",
  legacy."role_template_id",
  now()
FROM "role_template_permissions" AS legacy
CROSS JOIN (
  VALUES
    ('crm.messaging.connection.setup'),
    ('crm.messaging.connection.pair')
) AS replacement("permission_key")
WHERE legacy."permission_key" = 'crm.whatsapp.connection.manage'
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
  legacy."allowed",
  legacy."created_at",
  legacy."membership_id",
  replacement."permission_key",
  legacy."reason",
  now()
FROM "membership_permission_overrides" AS legacy
CROSS JOIN (
  VALUES
    ('crm.messaging.connection.setup'),
    ('crm.messaging.connection.pair')
) AS replacement("permission_key")
WHERE legacy."permission_key" = 'crm.whatsapp.connection.manage'
ON CONFLICT ("membership_id", "permission_key") DO UPDATE SET
  "allowed" = "membership_permission_overrides"."allowed" AND EXCLUDED."allowed",
  "reason" = CASE
    WHEN EXCLUDED."allowed" = false THEN EXCLUDED."reason"
    ELSE "membership_permission_overrides"."reason"
  END,
  "updated_at" = now();
--> statement-breakpoint

DELETE FROM "membership_permission_overrides"
WHERE "permission_key" = 'crm.whatsapp.connection.manage';
--> statement-breakpoint

DELETE FROM "role_template_permissions"
WHERE "permission_key" = 'crm.whatsapp.connection.manage';
