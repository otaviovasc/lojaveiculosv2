-- Local product seed v2.
-- Server-owned catalog, subscriptions, and entitlements.
-- Included by ../product-test-user.sql inside one transaction.


INSERT INTO plans (
  id, catalog_version, code, is_default, limits,
  monthly_price_cents, name, status
)
VALUES
  ('12121212-1212-4212-8212-121212121210', '2026-07-v1', 'basico', false, '{"vehicle_limit": 30, "seller_limit": 1}'::jsonb, 0, 'Básico', 'active'),
  ('12121212-1212-4212-8212-121212121211', '2026-07-v1', 'premium', false, '{"vehicle_limit": 30, "seller_limit": 1}'::jsonb, 9997, 'Premium', 'active'),
  ('12121212-1212-4212-8212-121212121213', '2026-07-v1', 'estoque', false, '{"vehicle_limit": 60, "seller_limit": 1}'::jsonb, 14999, 'Estoque', 'active'),
  ('12121212-1212-4212-8212-121212121214', '2026-07-v1', 'pro', false, '{"vehicle_limit": 100, "seller_limit": 1}'::jsonb, 17990, 'Pro', 'active'),
  ('12121212-1212-4212-8212-121212121212', '2026-07-v1', 'growth', true, '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb, 29900, 'Growth', 'active')
ON CONFLICT (code, catalog_version) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  limits = EXCLUDED.limits,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO plan_features (
  feature_key, included, included_in_trial, limit_value, plan_id, trial_limit_value
)
SELECT
  pf.feature_key, pf.included, pf.included_in_trial, pf.limit_value, plan.id, pf.trial_limit_value
FROM plans plan
JOIN (
  VALUES
    ('basico', 'subdomain', 1, true, null::integer, null::integer),
    ('basico', 'automation', 0, false, null::integer, null::integer),
    ('basico', 'plate_lookup', 0, false, null::integer, null::integer),
    ('basico', 'custom_domain', 0, false, null::integer, null::integer),
    ('basico', 'crm', 0, false, null::integer, null::integer),
    ('basico', 'external_api', 0, false, null::integer, null::integer),
    ('basico', 'marketplace', 0, false, null::integer, null::integer),
    ('basico', 'fiscal', 0, false, null::integer, null::integer),
    ('basico', 'simulations', 0, false, null::integer, null::integer),

    ('premium', 'subdomain', 1, true, null::integer, null::integer),
    ('premium', 'automation', 1, true, null::integer, null::integer),
    ('premium', 'analytics', 1, true, null::integer, null::integer),
    ('premium', 'compliance', 1, true, null::integer, null::integer),
    ('premium', 'plate_lookup', 0, false, null::integer, null::integer),
    ('premium', 'custom_domain', 0, false, null::integer, null::integer),
    ('premium', 'crm', 0, false, null::integer, null::integer),
    ('premium', 'external_api', 0, false, null::integer, null::integer),
    ('premium', 'marketplace', 0, false, null::integer, null::integer),
    ('premium', 'fiscal', 0, false, null::integer, null::integer),
    ('premium', 'simulations', 0, false, null::integer, null::integer),

    ('estoque', 'subdomain', 1, true, null::integer, null::integer),
    ('estoque', 'automation', 1, true, null::integer, null::integer),
    ('estoque', 'analytics', 1, true, null::integer, null::integer),
    ('estoque', 'compliance', 1, true, null::integer, null::integer),
    ('estoque', 'plate_lookup', 1, true, 60, 10),
    ('estoque', 'external_api', 1, true, null::integer, null::integer),
    ('estoque', 'simulations', 1, true, null::integer, null::integer),
    ('estoque', 'custom_domain', 0, false, null::integer, null::integer),
    ('estoque', 'crm', 0, false, null::integer, null::integer),
    ('estoque', 'marketplace', 0, false, null::integer, null::integer),
    ('estoque', 'fiscal', 0, false, null::integer, null::integer),

    ('pro', 'subdomain', 1, true, null::integer, null::integer),
    ('pro', 'automation', 1, true, null::integer, null::integer),
    ('pro', 'analytics', 1, true, null::integer, null::integer),
    ('pro', 'compliance', 1, true, null::integer, null::integer),
    ('pro', 'plate_lookup', 1, true, 100, 10),
    ('pro', 'external_api', 1, true, null::integer, null::integer),
    ('pro', 'custom_domain', 1, true, null::integer, null::integer),
    ('pro', 'simulations', 1, true, null::integer, null::integer),
    ('pro', 'crm', 0, false, null::integer, null::integer),
    ('pro', 'marketplace', 0, false, null::integer, null::integer),
    ('pro', 'fiscal', 0, false, null::integer, null::integer),

    ('growth', 'subdomain', 1, true, null::integer, null::integer),
    ('growth', 'automation', 1, true, null::integer, null::integer),
    ('growth', 'analytics', 1, true, null::integer, null::integer),
    ('growth', 'compliance', 1, true, null::integer, null::integer),
    ('growth', 'plate_lookup', 1, true, 300, 10),
    ('growth', 'custom_domain', 1, true, null::integer, null::integer),
    ('growth', 'crm', 0, false, null::integer, null::integer),
    ('growth', 'external_api', 0, false, null::integer, null::integer),
    ('growth', 'marketplace', 0, false, null::integer, null::integer),
    ('growth', 'fiscal', 0, false, null::integer, null::integer),
    ('growth', 'simulations', 0, false, null::integer, null::integer)
) AS pf(plan_code, feature_key, included, included_in_trial, limit_value, trial_limit_value)
  ON plan.code = pf.plan_code AND plan.catalog_version = '2026-07-v1'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  included = EXCLUDED.included,
  included_in_trial = EXCLUDED.included_in_trial,
  limit_value = EXCLUDED.limit_value,
  trial_limit_value = EXCLUDED.trial_limit_value,
  updated_at = now();

INSERT INTO addons (
  id, catalog_version, code, feature_key, included_in_trial,
  monthly_price_cents, name, status
)
VALUES
  (
    '15151515-1515-4515-8515-151515151515', '2026-07-v1',
    'crm_whatsapp_instance', 'crm', false, 24999, 'CRM WhatsApp', 'active'
  ),
  (
    '15151515-1515-4515-8515-151515151516', '2026-07-v1',
    'marketplace_connectors', 'marketplace', false, 14990,
    'Marketplaces', 'active'
  ),
  (
    '15151515-1515-4515-8515-151515151517', '2026-07-v1',
    'fiscal_spedy', 'fiscal', false, 19990, 'Fiscal NF-e + NFS-e', 'active'
  ),
  (
    '15151515-1515-4515-8515-151515151518', '2026-07-v1',
    'public_api_access', 'external_api', false, 9990, 'API Pública', 'active'
  ),
  (
    '15151515-1515-4515-8515-151515151519', '2026-07-v1',
    'simulations_pro', 'simulations', false, 4990, 'Simulações Pro', 'active'
  )
ON CONFLICT (code, catalog_version) DO UPDATE SET
  feature_key = EXCLUDED.feature_key,
  included_in_trial = EXCLUDED.included_in_trial,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO billing_customers (
  id,
  document_number,
  email,
  name,
  provider,
  provider_customer_id,
  tenant_id
)
VALUES (
  '13131313-1313-4313-8313-131313131313',
  '11222333000181',
  'financeiro@horizonte.example',
  'Grupo Horizonte Mobilidade LTDA',
  'asaas',
  'local_asaas_customer_test',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (tenant_id, provider) DO UPDATE SET
  document_number = EXCLUDED.document_number,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  provider_customer_id = EXCLUDED.provider_customer_id,
  updated_at = now();

INSERT INTO subscriptions (
  id,
  billing_customer_id,
  current_period_end,
  current_period_start,
  provider,
  provider_subscription_id,
  status,
  tenant_id
)
VALUES (
  '14141414-1414-4414-8414-141414141414',
  '13131313-1313-4313-8313-131313131313',
  date_trunc('day', now()) - interval '5 days',
  date_trunc('day', now()) - interval '35 days',
  'asaas',
  'local_seed_asaas_subscription_primary_account_past_due',
  'past_due',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  billing_customer_id = EXCLUDED.billing_customer_id,
  current_period_end = EXCLUDED.current_period_end,
  current_period_start = EXCLUDED.current_period_start,
  provider = EXCLUDED.provider,
  provider_subscription_id = EXCLUDED.provider_subscription_id,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO subscription_items (
  addon_id,
  item_type,
  plan_id,
  quantity,
  starts_at,
  store_id,
  subscription_id,
  tenant_id,
  unit_amount_cents
)
SELECT
  null,
  'plan',
  '12121212-1212-4212-8212-121212121212',
  1,
  date_trunc('day', now()) - interval '35 days',
  '66666666-6666-4666-8666-666666666666',
  '14141414-1414-4414-8414-141414141414',
  '77777777-7777-4777-8777-777777777777',
  29900
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_items
  WHERE subscription_id = '14141414-1414-4414-8414-141414141414'
    AND item_type = 'plan'
    AND store_id = '66666666-6666-4666-8666-666666666666'
);

UPDATE subscription_items
SET
  ends_at = null,
  quantity = 1,
  starts_at = date_trunc('day', now()) - interval '35 days',
  unit_amount_cents = 29900
WHERE subscription_id = '14141414-1414-4414-8414-141414141414'
  AND item_type = 'plan'
  AND store_id = '66666666-6666-4666-8666-666666666666';

INSERT INTO subscription_items (
  addon_id,
  item_type,
  plan_id,
  quantity,
  starts_at,
  store_id,
  subscription_id,
  tenant_id,
  unit_amount_cents
)
SELECT
  '15151515-1515-4515-8515-151515151515',
  'addon',
  null,
  1,
  date_trunc('day', now()) - interval '35 days',
  '66666666-6666-4666-8666-666666666666',
  '14141414-1414-4414-8414-141414141414',
  '77777777-7777-4777-8777-777777777777',
  24999
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_items
  WHERE subscription_id = '14141414-1414-4414-8414-141414141414'
    AND item_type = 'addon'
    AND addon_id = '15151515-1515-4515-8515-151515151515'
    AND store_id = '66666666-6666-4666-8666-666666666666'
);

UPDATE subscription_items
SET
  ends_at = null,
  quantity = 1,
  starts_at = date_trunc('day', now()) - interval '35 days',
  unit_amount_cents = 24999
WHERE subscription_id = '14141414-1414-4414-8414-141414141414'
  AND item_type = 'addon'
  AND addon_id = '15151515-1515-4515-8515-151515151515'
  AND store_id = '66666666-6666-4666-8666-666666666666';

INSERT INTO store_entitlements (
  feature_key, metadata, source, starts_at, ends_at, status, store_id, tenant_id
)
VALUES
  ('subdomain', '{"fixture":"local_seed","catalogVersion":"2026-07-v1","billingStatus":"past_due","dunningPolicy":"grace_period"}'::jsonb, 'billing_catalog', date_trunc('day', now()) - interval '35 days', date_trunc('day', now()) + interval '2 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('crm', '{"fixture":"local_seed","catalogVersion":"2026-07-v1","billingStatus":"past_due","dunningPolicy":"grace_period","addonCode":"crm_whatsapp_instance"}'::jsonb, 'billing_catalog', date_trunc('day', now()) - interval '35 days', date_trunc('day', now()) + interval '2 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('plate_lookup', '{"fixture":"local_seed","catalogVersion":"2026-07-v1","billingStatus":"past_due","dunningPolicy":"grace_period","limitValue":300}'::jsonb, 'billing_catalog', date_trunc('day', now()) - interval '35 days', date_trunc('day', now()) + interval '2 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('automation', '{"fixture":"local_seed","catalogVersion":"2026-07-v1","billingStatus":"past_due","dunningPolicy":"grace_period","mode":"preview_only","execution_enabled":false}'::jsonb, 'billing_catalog', date_trunc('day', now()) - interval '35 days', date_trunc('day', now()) + interval '2 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('analytics', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_product_test_capability","billingBound":false,"dashboards":["sales","finance","crm"]}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('marketplace', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_product_test_capability","billingBound":false,"providers":["olx","mercado_livre"],"officialOperation":false}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('external_api', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_product_test_capability","billingBound":false,"rateLimitPerMinute":120}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('custom_domain', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_product_test_capability","billingBound":false,"domain":"seminovos.local.test"}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('fiscal', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_homologation_capability","billingBound":false,"provider":"spedy","environment":"homologation","officialOperation":false}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (store_id, feature_key) DO UPDATE SET
  ends_at = EXCLUDED.ends_at,
  metadata = EXCLUDED.metadata,
  source = EXCLUDED.source,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO payments (
  id,
  amount_cents,
  due_at,
  external_reference,
  invoice_url,
  paid_at,
  provider,
  provider_payment_id,
  raw,
  status,
  store_id,
  subscription_id,
  tenant_id
)
VALUES
  ('60000000-0000-4000-8000-000000000001', 54899, now() - interval '3 days', 'seed-growth-cancelled', null, null, 'asaas', 'local_asaas_payment_cancelled', '{"billingType": "PIX", "fixture": true, "officialOperation": false}'::jsonb, 'cancelled', '66666666-6666-4666-8666-666666666666', '14141414-1414-4414-8414-141414141414', '77777777-7777-4777-8777-777777777777'),
  ('60000000-0000-4000-8000-000000000002', 109798, now() + interval '3 days', 'seed-growth-recovery-pending', null, null, 'asaas', 'local_asaas_payment_pending', '{"billingType": "BOLETO", "fixture": true, "officialOperation": false}'::jsonb, 'pending', null, '14141414-1414-4414-8414-141414141414', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  due_at = EXCLUDED.due_at,
  external_reference = EXCLUDED.external_reference,
  invoice_url = EXCLUDED.invoice_url,
  paid_at = EXCLUDED.paid_at,
  provider = EXCLUDED.provider,
  provider_payment_id = EXCLUDED.provider_payment_id,
  raw = EXCLUDED.raw,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  subscription_id = EXCLUDED.subscription_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO store_entitlement_events (
  id,
  actor_id,
  feature_key,
  metadata,
  next_status,
  previous_status,
  reason,
  source,
  store_id,
  tenant_id
)
VALUES
  ('61000000-0000-4000-8000-000000000001', 'local_seed', 'external_api', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","billingBound":false}'::jsonb, 'active', 'inactive', 'Local product-test override; no external operation occurred', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('61000000-0000-4000-8000-000000000002', 'local_seed', 'fiscal', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","officialOperation":false,"provider":"spedy"}'::jsonb, 'active', 'inactive', 'Local homologation override; no fiscal document was issued', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('61000000-0000-4000-8000-000000000003', 'local_seed', 'custom_domain', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","billingBound":false}'::jsonb, 'active', 'inactive', 'Local product-test override for domain workflows', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('61000000-0000-4000-8000-000000000004', 'local_seed', 'analytics', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","billingBound":false}'::jsonb, 'active', 'inactive', 'Local product-test override for analytics workflows', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('61000000-0000-4000-8000-000000000005', 'local_seed', 'marketplace', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","officialOperation":false}'::jsonb, 'active', 'inactive', 'Local preview override; no marketplace operation occurred', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  actor_id = EXCLUDED.actor_id,
  feature_key = EXCLUDED.feature_key,
  metadata = EXCLUDED.metadata,
  next_status = EXCLUDED.next_status,
  previous_status = EXCLUDED.previous_status,
  reason = EXCLUDED.reason,
  source = EXCLUDED.source,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
