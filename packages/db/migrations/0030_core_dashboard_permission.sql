-- The operational home dashboard is a core surface for every active store
-- role. Detailed reports remain protected by analytics.read and the analytics
-- entitlement.

INSERT INTO "role_template_permissions" (
  "permission_key",
  "role_template_id"
)
SELECT
  'dashboard.read',
  "id"
FROM "role_templates"
WHERE "role_key" IN (
  'admin',
  'agency',
  'owner',
  'supervisor',
  'salesman',
  'investor'
)
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
