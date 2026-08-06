INSERT INTO "plans" (
  "code", "catalog_version", "is_default", "limits",
  "monthly_price_cents", "name", "status"
)
VALUES
  (
    'basico', '2026-07-v1', false,
    '{"vehicle_limit": 30, "seller_limit": 1}'::jsonb,
    0, 'Básico', 'active'
  ),
  (
    'premium', '2026-07-v1', false,
    '{"vehicle_limit": 30, "seller_limit": 1}'::jsonb,
    9997, 'Premium', 'active'
  ),
  (
    'estoque', '2026-07-v1', false,
    '{"vehicle_limit": 60, "seller_limit": 1}'::jsonb,
    14999, 'Estoque', 'active'
  ),
  (
    'pro', '2026-07-v1', false,
    '{"vehicle_limit": 100, "seller_limit": 1}'::jsonb,
    17990, 'Pro', 'active'
  ),
  (
    'growth', '2026-07-v1', true,
    '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb,
    29900, 'Growth', 'active'
  )
ON CONFLICT ("code", "catalog_version") DO UPDATE SET
  "is_default" = EXCLUDED."is_default",
  "limits" = EXCLUDED."limits",
  "monthly_price_cents" = EXCLUDED."monthly_price_cents",
  "name" = EXCLUDED."name",
  "status" = EXCLUDED."status",
  "updated_at" = now();

INSERT INTO "plan_features" (
  "feature_key", "included", "included_in_trial", "limit_value", "plan_id"
)
SELECT
  pf.feature_key,
  pf.included,
  pf.included_in_trial,
  pf.limit_value,
  plan.id
FROM "plans" AS plan
JOIN (
  VALUES
    ('basico', 'subdomain', 1, true, null::integer),
    ('basico', 'automation', 0, false, null::integer),
    ('basico', 'plate_lookup', 0, false, null::integer),
    ('basico', 'custom_domain', 0, false, null::integer),
    ('basico', 'crm', 0, false, null::integer),
    ('basico', 'external_api', 0, false, null::integer),
    ('basico', 'marketplace', 0, false, null::integer),
    ('basico', 'fiscal', 0, false, null::integer),
    ('basico', 'simulations', 0, false, null::integer),

    ('premium', 'subdomain', 1, true, null::integer),
    ('premium', 'automation', 1, true, null::integer),
    ('premium', 'analytics', 1, true, null::integer),
    ('premium', 'compliance', 1, true, null::integer),
    ('premium', 'plate_lookup', 0, false, null::integer),
    ('premium', 'custom_domain', 0, false, null::integer),
    ('premium', 'crm', 0, false, null::integer),
    ('premium', 'external_api', 0, false, null::integer),
    ('premium', 'marketplace', 0, false, null::integer),
    ('premium', 'fiscal', 0, false, null::integer),
    ('premium', 'simulations', 0, false, null::integer),

    ('estoque', 'subdomain', 1, true, null::integer),
    ('estoque', 'automation', 1, true, null::integer),
    ('estoque', 'analytics', 1, true, null::integer),
    ('estoque', 'compliance', 1, true, null::integer),
    ('estoque', 'plate_lookup', 1, true, 60),
    ('estoque', 'external_api', 1, true, null::integer),
    ('estoque', 'simulations', 1, true, null::integer),
    ('estoque', 'custom_domain', 0, false, null::integer),
    ('estoque', 'crm', 0, false, null::integer),
    ('estoque', 'marketplace', 0, false, null::integer),
    ('estoque', 'fiscal', 0, false, null::integer),

    ('pro', 'subdomain', 1, true, null::integer),
    ('pro', 'automation', 1, true, null::integer),
    ('pro', 'analytics', 1, true, null::integer),
    ('pro', 'compliance', 1, true, null::integer),
    ('pro', 'plate_lookup', 1, true, 100),
    ('pro', 'external_api', 1, true, null::integer),
    ('pro', 'custom_domain', 1, true, null::integer),
    ('pro', 'simulations', 1, true, null::integer),
    ('pro', 'crm', 0, false, null::integer),
    ('pro', 'marketplace', 0, false, null::integer),
    ('pro', 'fiscal', 0, false, null::integer),

    ('growth', 'subdomain', 1, true, null::integer),
    ('growth', 'automation', 1, true, null::integer),
    ('growth', 'analytics', 1, true, null::integer),
    ('growth', 'compliance', 1, true, null::integer),
    ('growth', 'plate_lookup', 1, true, 300),
    ('growth', 'custom_domain', 1, true, null::integer),
    ('growth', 'crm', 0, false, null::integer),
    ('growth', 'external_api', 0, false, null::integer),
    ('growth', 'marketplace', 0, false, null::integer),
    ('growth', 'fiscal', 0, false, null::integer),
    ('growth', 'simulations', 0, false, null::integer)
) AS pf(plan_code, feature_key, included, included_in_trial, limit_value)
  ON plan.code = pf.plan_code AND plan.catalog_version = '2026-07-v1'
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
    24900, 'CRM WhatsApp', 'active'
  ),
  (
    'custom_domain_addon', '2026-07-v1', 'custom_domain', false,
    2000, 'Domínio Próprio', 'active'
  ),
  (
    'marketplace_connectors', '2026-07-v1', 'marketplace', false,
    14990, 'Marketplaces', 'active'
  ),
  (
    'fiscal_spedy', '2026-07-v1', 'fiscal', false,
    3500, 'Fiscal NF-e + NFS-e', 'active'
  ),
  (
    'public_api_access', '2026-07-v1', 'external_api', false,
    5000, 'API & Integrações', 'active'
  ),
  (
    'auto_placa_lookup', '2026-07-v1', 'plate_lookup', false,
    3000, 'Consulta de Placas', 'active'
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

