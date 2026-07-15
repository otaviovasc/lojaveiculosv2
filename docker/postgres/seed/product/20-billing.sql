-- Local product seed v2.
-- Server-owned catalog, subscriptions, and entitlements.
-- Included by ../product-test-user.sql inside one transaction.


INSERT INTO plans (
  id, catalog_version, code, is_default, limits,
  monthly_price_cents, name, status
)
VALUES (
  '12121212-1212-4212-8212-121212121212',
  '2026-07-v1',
  'growth',
  true,
  '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb,
  29900,
  'Growth',
  'active'
)
ON CONFLICT (code, catalog_version) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  limits = EXCLUDED.limits,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO plan_features (feature_key, included, limit_value, plan_id)
VALUES
  ('subdomain', 1, null, '12121212-1212-4212-8212-121212121212'),
  ('automation', 1, null, '12121212-1212-4212-8212-121212121212'),
  ('plate_lookup', 1, 300, '12121212-1212-4212-8212-121212121212'),
  ('custom_domain', 0, null, '12121212-1212-4212-8212-121212121212'),
  ('external_api', 0, null, '12121212-1212-4212-8212-121212121212'),
  ('nfe', 0, null, '12121212-1212-4212-8212-121212121212')
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  included = EXCLUDED.included,
  limit_value = EXCLUDED.limit_value,
  updated_at = now();

INSERT INTO addons (
  id, catalog_version, code, feature_key, included_in_trial,
  monthly_price_cents, name, status
)
VALUES (
  '15151515-1515-4515-8515-151515151515',
  '2026-07-v1',
  'crm_whatsapp_instance',
  'crm',
  true,
  24999,
  'CRM WhatsApp',
  'active'
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
  ('nfe', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","reason":"local_homologation_capability","billingBound":false,"provider":"spedy","environment":"homologation","officialOperation":false}'::jsonb, 'local_seed_override', date_trunc('day', now()), date_trunc('day', now()) + interval '30 days', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
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
  ('61000000-0000-4000-8000-000000000002', 'local_seed', 'nfe', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","officialOperation":false,"provider":"spedy"}'::jsonb, 'active', 'inactive', 'Local homologation override; no fiscal document was issued', 'local_seed_override', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
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
