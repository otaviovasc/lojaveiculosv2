-- Local product seed v3.
-- Every store receives one permanent Free contract. Older catalogs, provider
-- evidence, and ended allocations remain historical; no add-on is effective.
-- Included by ../product-test-user.sql inside one transaction.

UPDATE addons
SET status = 'archived', updated_at = now()
WHERE status = 'active';

INSERT INTO plans (
  id, catalog_version, code, is_default, limits,
  monthly_price_cents, name, published_at, status
)
VALUES
  ('83262608-0000-4000-8000-000000000001', '2026-08-v3', 'free', true, '{"capabilities":["storefront_builder","vehicle_listing_control","public_interest_capture","basic_lead_inbox"],"checkout_mode":"free","selection_rank":1,"vehicle_limit":10,"seller_limit":1}'::jsonb, 0, 'Free', '2026-08-25T03:00:00.000Z', 'active'),
  ('83262608-0000-4000-8000-000000000002', '2026-08-v3', 'essencial', false, '{"capabilities":["storefront_builder","vehicle_listing_control","public_interest_capture","basic_lead_inbox","custom_domain","reservations_and_sales","customers","internal_financing_workflow","connected_financing_when_verified"],"checkout_mode":"checkout","selection_rank":2,"vehicle_limit":75,"seller_limit":3}'::jsonb, 19700, 'Essencial', '2026-08-25T03:00:00.000Z', 'active'),
  ('83262608-0000-4000-8000-000000000003', '2026-08-v3', 'operacao', false, '{"capabilities":["storefront_builder","vehicle_listing_control","public_interest_capture","basic_lead_inbox","custom_domain","reservations_and_sales","customers","internal_financing_workflow","connected_financing_when_verified","full_crm","official_channels","byok_zapi","document_workspace","document_templates"],"checkout_mode":"checkout","selection_rank":3,"vehicle_limit":150,"seller_limit":5}'::jsonb, 39700, 'Operação', '2026-08-25T03:00:00.000Z', 'active'),
  ('83262608-0000-4000-8000-000000000004', '2026-08-v3', 'gestao', false, '{"capabilities":["storefront_builder","vehicle_listing_control","public_interest_capture","basic_lead_inbox","custom_domain","reservations_and_sales","customers","internal_financing_workflow","connected_financing_when_verified","full_crm","official_channels","byok_zapi","document_workspace","document_templates","fiscal","finance","commissions","analytics","compliance","checklists","finance_auto_entry_rules"],"checkout_mode":"checkout","selection_rank":4,"vehicle_limit":300,"seller_limit":10}'::jsonb, 59700, 'Gestão', '2026-08-25T03:00:00.000Z', 'active'),
  ('83262608-0000-4000-8000-000000000005', '2026-08-v3', 'escala', false, '{"capabilities":["storefront_builder","vehicle_listing_control","public_interest_capture","basic_lead_inbox","custom_domain","reservations_and_sales","customers","internal_financing_workflow","connected_financing_when_verified","full_crm","official_channels","byok_zapi","document_workspace","document_templates","fiscal","finance","commissions","analytics","compliance","checklists","finance_auto_entry_rules","marketplaces","public_api_and_webhooks","advanced_automation","ai_studio","resale_analysis_ai"],"checkout_mode":"quote_required","selection_rank":5,"vehicle_limit":null,"seller_limit":null}'::jsonb, 89700, 'Escala', '2026-08-25T03:00:00.000Z', 'active')
ON CONFLICT (code, catalog_version) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  limits = EXCLUDED.limits,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  name = EXCLUDED.name,
  published_at = EXCLUDED.published_at,
  status = EXCLUDED.status,
  updated_at = now();

WITH feature_matrix(plan_code, included_features, plate_limit) AS (
  VALUES
    ('free', ARRAY['storefront','inventory','lead_capture','plate_lookup']::text[], 3),
    ('essencial', ARRAY['storefront','inventory','lead_capture','plate_lookup','custom_domain','sales','financing']::text[], 25),
    ('operacao', ARRAY['storefront','inventory','lead_capture','plate_lookup','custom_domain','sales','financing','crm','documents']::text[], 75),
    ('gestao', ARRAY['storefront','inventory','lead_capture','plate_lookup','custom_domain','sales','financing','crm','documents','fiscal','finance','commissions','analytics','compliance','checklists']::text[], 150),
    ('escala', ARRAY['storefront','inventory','lead_capture','plate_lookup','custom_domain','sales','financing','crm','documents','fiscal','finance','commissions','analytics','compliance','checklists','marketplace','external_api','automation','ai']::text[], null::integer)
), feature_keys(feature_key) AS (
  VALUES
    ('storefront'), ('inventory'), ('lead_capture'), ('sales'), ('financing'),
    ('documents'), ('finance'), ('commissions'), ('checklists'), ('ai'),
    ('custom_domain'), ('crm'), ('automation'), ('analytics'), ('compliance'),
    ('external_api'), ('marketplace'), ('plate_lookup'), ('fiscal')
)
INSERT INTO plan_features (
  feature_key, included, included_in_trial, limit_value, plan_id,
  trial_limit_value
)
SELECT
  feature.feature_key,
  CASE WHEN feature.feature_key = ANY(matrix.included_features) THEN 1 ELSE 0 END,
  false,
  CASE WHEN feature.feature_key = 'plate_lookup' THEN matrix.plate_limit ELSE null END,
  plan.id,
  null
FROM feature_matrix matrix
JOIN plans plan
  ON plan.code = matrix.plan_code AND plan.catalog_version = '2026-08-v3'
CROSS JOIN feature_keys feature
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  included = EXCLUDED.included,
  included_in_trial = false,
  limit_value = EXCLUDED.limit_value,
  trial_limit_value = null,
  updated_at = now();

UPDATE billing_catalog_versions
SET status = 'superseded', updated_at = now()
WHERE status = 'active' AND version <> '2026-08-v3';

WITH catalog_definition AS (
  SELECT jsonb_build_object(
    'addons', '[]'::jsonb,
    'plans', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'capabilities', plan.limits->'capabilities',
          'checkoutMode', plan.limits->>'checkout_mode',
          'code', plan.code,
          'features', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'featureKey', feature.feature_key,
                'included', feature.included = 1,
                'includedInTrial', feature.included_in_trial,
                'limitValue', feature.limit_value,
                'trialLimitValue', feature.trial_limit_value
              ) ORDER BY feature.feature_key
            )
            FROM plan_features feature
            WHERE feature.plan_id = plan.id
          ),
          'id', plan.id,
          'isDefault', plan.is_default,
          'limits', jsonb_build_object(
            'sellerLimit', (plan.limits->>'seller_limit')::integer,
            'vehicleLimit', (plan.limits->>'vehicle_limit')::integer
          ),
          'monthlyPriceCents', plan.monthly_price_cents,
          'name', plan.name,
          'selectionRank', (plan.limits->>'selection_rank')::integer,
          'status', plan.status
        ) ORDER BY plan.code
      )
      FROM plans plan
      WHERE plan.catalog_version = '2026-08-v3'
    ),
    'publishedAt', '2026-08-25T03:00:00.000Z',
    'version', '2026-08-v3'
  ) AS definition
)
INSERT INTO billing_catalog_versions (
  activated_at, checksum, definition, published_at, status, version
)
SELECT
  now(),
  '32d2f1fe963c01124ffe5469ad166c68bc569c052409861ef12216065ed1ff3d',
  definition,
  '2026-08-25T03:00:00.000Z',
  'active',
  '2026-08-v3'
FROM catalog_definition
ON CONFLICT (version) DO UPDATE SET
  activated_at = COALESCE(billing_catalog_versions.activated_at, now()),
  checksum = EXCLUDED.checksum,
  definition = EXCLUDED.definition,
  published_at = EXCLUDED.published_at,
  status = 'active',
  updated_at = now();

INSERT INTO billing_customers (
  id, document_number, email, name, provider, provider_customer_id, tenant_id
)
VALUES
  ('13131313-1313-4313-8313-131313131313', '11222333000181', 'financeiro@horizonte.example', 'Grupo Horizonte Mobilidade LTDA', 'asaas', null, '77777777-7777-4777-8777-777777777777'),
  ('25000000-0000-4000-8000-000000000001', '60701190000104', 'financeiro@rota27.example.test', 'Rota 27 Comercio de Veiculos LTDA', 'asaas', null, '77777777-7777-4777-8777-777777777778')
ON CONFLICT (tenant_id, provider) DO UPDATE SET
  document_number = EXCLUDED.document_number,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  provider_customer_id = COALESCE(
    billing_customers.provider_customer_id,
    EXCLUDED.provider_customer_id
  ),
  updated_at = now();

INSERT INTO subscriptions (
  id, billing_customer_id, current_period_end, current_period_start,
  provider, provider_subscription_id, status, store_id, tenant_id
)
VALUES
  ('14141414-1414-4414-8414-141414141414', '13131313-1313-4313-8313-131313131313', null, date_trunc('day', now()), 'asaas', null, 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('14141414-1414-4414-8414-141414141415', '13131313-1313-4313-8313-131313131313', null, date_trunc('day', now()), 'asaas', null, 'active', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('25000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-000000000001', null, date_trunc('day', now()), 'asaas', null, 'active', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778')
ON CONFLICT (id) DO UPDATE SET
  billing_customer_id = EXCLUDED.billing_customer_id,
  current_period_end = null,
  current_period_start = EXCLUDED.current_period_start,
  provider_subscription_id = COALESCE(
    subscriptions.provider_subscription_id,
    EXCLUDED.provider_subscription_id
  ),
  status = 'active',
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

UPDATE subscription_items
SET
  ends_at = COALESCE(
    ends_at,
    GREATEST(now(), starts_at + interval '1 microsecond')
  ),
  updated_at = now()
WHERE tenant_id IN (
  '77777777-7777-4777-8777-777777777777',
  '77777777-7777-4777-8777-777777777778'
);

INSERT INTO subscription_items (
  id, addon_id, ends_at, item_type, plan_id, quantity, starts_at, store_id,
  subscription_id, tenant_id, unit_amount_cents
)
SELECT
  CASE store.id
    WHEN '66666666-6666-4666-8666-666666666666'::uuid THEN '20000000-0000-4000-8000-000000000001'::uuid
    WHEN '66666666-6666-4666-8666-666666666667'::uuid THEN '20000000-0000-4000-8000-000000000002'::uuid
    ELSE '20000000-0000-4000-8000-000000000003'::uuid
  END,
  null,
  null,
  'plan',
  '83262608-0000-4000-8000-000000000001',
  1,
  date_trunc('day', now()),
  store.id,
  CASE store.id
    WHEN '66666666-6666-4666-8666-666666666666'::uuid THEN '14141414-1414-4414-8414-141414141414'::uuid
    WHEN '66666666-6666-4666-8666-666666666667'::uuid THEN '14141414-1414-4414-8414-141414141415'::uuid
    ELSE '25000000-0000-4000-8000-000000000003'::uuid
  END,
  store.tenant_id,
  0
FROM stores store
WHERE store.id IN (
  '66666666-6666-4666-8666-666666666666',
  '66666666-6666-4666-8666-666666666667',
  '66666666-6666-4666-8666-666666666668'
)
ON CONFLICT (id) DO UPDATE SET
  addon_id = null,
  ends_at = null,
  item_type = 'plan',
  plan_id = EXCLUDED.plan_id,
  quantity = 1,
  starts_at = EXCLUDED.starts_at,
  store_id = EXCLUDED.store_id,
  subscription_id = EXCLUDED.subscription_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_amount_cents = 0,
  updated_at = now();

UPDATE store_entitlements
SET
  ends_at = COALESCE(ends_at, date_trunc('day', now())),
  status = 'inactive',
  updated_at = now()
WHERE tenant_id IN (
  '77777777-7777-4777-8777-777777777777',
  '77777777-7777-4777-8777-777777777778'
);

INSERT INTO store_entitlements (
  feature_key, metadata, source, starts_at, ends_at, status, store_id, tenant_id
)
SELECT
  feature.feature_key,
  jsonb_build_object(
    'billingStatus', 'active',
    'catalogVersion', '2026-08-v3',
    'fixture', 'local_seed',
    'limitValue', CASE WHEN feature.feature_key = 'plate_lookup' THEN 3 ELSE null END,
    'planCode', 'free'
  ),
  'billing_catalog',
  date_trunc('day', now()),
  null,
  'active',
  store.id,
  store.tenant_id
FROM stores store
CROSS JOIN (
  VALUES ('storefront'), ('inventory'), ('lead_capture'), ('plate_lookup')
) AS feature(feature_key)
WHERE store.id IN (
  '66666666-6666-4666-8666-666666666666',
  '66666666-6666-4666-8666-666666666667',
  '66666666-6666-4666-8666-666666666668'
)
ON CONFLICT (store_id, feature_key) DO UPDATE SET
  ends_at = null,
  metadata = EXCLUDED.metadata,
  source = 'billing_catalog',
  starts_at = EXCLUDED.starts_at,
  status = 'active',
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
