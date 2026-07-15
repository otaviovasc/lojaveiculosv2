-- Local product seed v2.
-- Shared-account dunning and isolated-trial fixtures using the server-owned
-- 2026-07-v1 catalog.
-- Provider identifiers below are local placeholders; no provider call succeeded.
-- Included by ../product-test-user.sql inside one transaction.

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
  '25000000-0000-4000-8000-000000000001',
  '60701190000104',
  'financeiro@rota27.example.test',
  'Rota 27 Comercio de Veiculos LTDA',
  'asaas',
  'local_seed_asaas_customer_isolation',
  '77777777-7777-4777-8777-777777777778'
)
ON CONFLICT (id) DO UPDATE SET
  document_number = EXCLUDED.document_number,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  provider_customer_id = EXCLUDED.provider_customer_id,
  tenant_id = EXCLUDED.tenant_id,
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
  '25000000-0000-4000-8000-000000000003',
  '25000000-0000-4000-8000-000000000001',
  date_trunc('day', now()) + interval '14 days',
  date_trunc('day', now()),
  'asaas',
  'local_seed_asaas_subscription_isolation_trial',
  'trialing',
  '77777777-7777-4777-8777-777777777778'
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

DELETE FROM payments
WHERE id = '25000000-0000-4000-8000-000000000022';

DELETE FROM subscription_items
WHERE id IN (
  '25000000-0000-4000-8000-000000000013',
  '25000000-0000-4000-8000-000000000014'
);

INSERT INTO subscription_items (
  id,
  addon_id,
  ends_at,
  item_type,
  plan_id,
  quantity,
  starts_at,
  store_id,
  subscription_id,
  tenant_id,
  unit_amount_cents
)
VALUES
  (
    '25000000-0000-4000-8000-000000000011',
    null,
    null,
    'plan',
    '12121212-1212-4212-8212-121212121212',
    1,
    date_trunc('day', now()) - interval '35 days',
    '66666666-6666-4666-8666-666666666667',
    '14141414-1414-4414-8414-141414141414',
    '77777777-7777-4777-8777-777777777777',
    29900
  ),
  (
    '25000000-0000-4000-8000-000000000012',
    '15151515-1515-4515-8515-151515151515',
    null,
    'addon',
    null,
    1,
    date_trunc('day', now()) - interval '35 days',
    '66666666-6666-4666-8666-666666666667',
    '14141414-1414-4414-8414-141414141414',
    '77777777-7777-4777-8777-777777777777',
    24999
  )
ON CONFLICT (id) DO UPDATE SET
  addon_id = EXCLUDED.addon_id,
  ends_at = EXCLUDED.ends_at,
  item_type = EXCLUDED.item_type,
  plan_id = EXCLUDED.plan_id,
  quantity = EXCLUDED.quantity,
  starts_at = EXCLUDED.starts_at,
  store_id = EXCLUDED.store_id,
  subscription_id = EXCLUDED.subscription_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  updated_at = now();

INSERT INTO store_entitlements (
  feature_key,
  metadata,
  source,
  starts_at,
  ends_at,
  status,
  store_id,
  tenant_id
)
VALUES
  (
    'subdomain',
    '{"fixture":"local_seed","catalogVersion":"2026-07-v1","scenario":"past_due_grace_period","billingStatus":"past_due","dunningPolicy":"grace_period"}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()) - interval '35 days',
    date_trunc('day', now()) + interval '2 days',
    'active',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'crm',
    '{"fixture":"local_seed","catalogVersion":"2026-07-v1","scenario":"dunning_suspension","billingStatus":"past_due","addonCode":"crm_whatsapp_instance"}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()) - interval '35 days',
    null,
    'suspended',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'automation',
    '{"fixture":"local_seed","catalogVersion":"2026-07-v1","scenario":"dunning_suspension","billingStatus":"past_due","mode":"preview_only","execution_enabled":false}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()) - interval '35 days',
    null,
    'suspended',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'plate_lookup',
    '{"fixture":"local_seed","catalogVersion":"2026-07-v1","scenario":"dunning_suspension","billingStatus":"past_due","limitValue":300}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()) - interval '35 days',
    null,
    'suspended',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'marketplace',
    '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","scenario":"dunning_suspension","reason":"local_preview_override_suspended","billingBound":false,"officialOperation":false}'::jsonb,
    'local_seed_override',
    date_trunc('day', now()) - interval '35 days',
    null,
    'suspended',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'subdomain',
    '{"fixture":"local_seed","scenario":"growth_trial","catalogVersion":"2026-07-v1","sourceDetail":"safe_trial_catalog"}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '14 days',
    'trialing',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778'
  ),
  (
    'automation',
    '{"fixture":"local_seed","scenario":"growth_trial","catalogVersion":"2026-07-v1","sourceDetail":"safe_trial_catalog","mode":"preview_only","execution_enabled":false}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '14 days',
    'trialing',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778'
  ),
  (
    'analytics',
    '{"fixture":"local_seed","scenario":"growth_trial","catalogVersion":"2026-07-v1","sourceDetail":"safe_trial_catalog"}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '14 days',
    'trialing',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778'
  ),
  (
    'compliance',
    '{"fixture":"local_seed","scenario":"growth_trial","catalogVersion":"2026-07-v1","sourceDetail":"safe_trial_catalog"}'::jsonb,
    'billing_catalog',
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '14 days',
    'trialing',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778'
  ),
  (
    'marketplace',
    '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","scenario":"growth_trial","reason":"not_in_catalog_selection","billingBound":false}'::jsonb,
    'local_seed_override',
    null,
    null,
    'inactive',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778'
  )
ON CONFLICT (store_id, feature_key) DO UPDATE SET
  ends_at = EXCLUDED.ends_at,
  metadata = EXCLUDED.metadata,
  source = EXCLUDED.source,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
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
  (
    '25000000-0000-4000-8000-000000000021',
    109798,
    date_trunc('day', now()) - interval '7 days',
    'local-seed-branch-overdue',
    'https://billing.example.test/invoices/branch-overdue',
    null,
    'asaas',
    'local_seed_asaas_payment_branch_overdue',
    '{"fixture":"local_seed","billing_type":"BOLETO","official_provider_operation":false}'::jsonb,
    'overdue',
    null,
    '14141414-1414-4414-8414-141414141414',
    '77777777-7777-4777-8777-777777777777'
  )
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
  ('25000000-0000-4000-8000-000000000031', 'local_seed', 'crm', '{"fixture":"local_seed","billingStatus":"past_due","catalogVersion":"2026-07-v1"}'::jsonb, 'suspended', 'active', 'Shared subscription entered dunning; branch CRM access was suspended', 'billing_catalog', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('25000000-0000-4000-8000-000000000032', 'local_seed', 'automation', '{"fixture":"local_seed","billingStatus":"past_due","catalogVersion":"2026-07-v1"}'::jsonb, 'suspended', 'active', 'Shared subscription entered dunning; branch automation was suspended', 'billing_catalog', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('25000000-0000-4000-8000-000000000033', 'local_seed', 'plate_lookup', '{"fixture":"local_seed","billingStatus":"past_due","catalogVersion":"2026-07-v1"}'::jsonb, 'suspended', 'active', 'Shared subscription entered dunning; branch paid lookups were suspended', 'billing_catalog', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('25000000-0000-4000-8000-000000000034', 'local_seed', 'marketplace', '{"fixture":"local_seed","overrideContractVersion":"2026-07-capability-v1","officialOperation":false}'::jsonb, 'suspended', 'active', 'Local marketplace preview override was suspended during dunning', 'local_seed_override', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777')
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
