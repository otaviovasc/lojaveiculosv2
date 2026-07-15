INSERT INTO "plan_features" (
  "feature_key", "included", "included_in_trial", "limit_value", "plan_id"
)
SELECT feature.feature_key, 0, false, null::integer, plan.id
FROM "plans" AS plan
CROSS JOIN (
  VALUES ('crm'), ('external_api'), ('marketplace'), ('nfe'), ('simulations')
) AS feature(feature_key)
WHERE plan.code = 'growth' AND plan.catalog_version = '2026-07-v1'
ON CONFLICT ("plan_id", "feature_key") DO UPDATE SET
  "included" = EXCLUDED."included",
  "included_in_trial" = EXCLUDED."included_in_trial",
  "limit_value" = EXCLUDED."limit_value",
  "updated_at" = now();

INSERT INTO "addons" (
  "code", "catalog_version", "feature_key", "included_in_trial",
  "monthly_price_cents", "name", "status"
)
VALUES
  (
    'crm_whatsapp_instance', '2026-07-v1', 'crm', false,
    24999, 'CRM WhatsApp', 'active'
  ),
  (
    'marketplace_connectors', '2026-07-v1', 'marketplace', false,
    14990, 'Marketplaces', 'active'
  ),
  (
    'nfe_spedy', '2026-07-v1', 'nfe', false,
    19990, 'NF-e integrada', 'active'
  ),
  (
    'public_api_access', '2026-07-v1', 'external_api', false,
    9990, 'API Pública', 'active'
  ),
  (
    'simulations_pro', '2026-07-v1', 'simulations', false,
    4990, 'Simulações Pro', 'active'
  )
ON CONFLICT ("code", "catalog_version") DO UPDATE SET
  "feature_key" = EXCLUDED."feature_key",
  "included_in_trial" = EXCLUDED."included_in_trial",
  "monthly_price_cents" = EXCLUDED."monthly_price_cents",
  "name" = EXCLUDED."name",
  "status" = EXCLUDED."status",
  "updated_at" = now();
