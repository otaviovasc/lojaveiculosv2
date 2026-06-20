INSERT INTO tenants (id, legal_name, slug, trading_name)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  'Loja Teste LTDA',
  'test-tenant',
  'Loja Teste'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO stores (id, legal_name, primary_domain, public_slug, tenant_id, trading_name)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  'Loja Teste LTDA',
  'test-store.lojaveiculos.com.br',
  'test-store',
  '77777777-7777-4777-8777-777777777777',
  'Loja Teste'
)
ON CONFLICT (public_slug) DO NOTHING;

INSERT INTO users (id, clerk_user_id, email, name, tenant_id)
VALUES
  (
    '88888888-8888-4888-8888-888888888888',
    'clerk_test_user',
    'test@lojaveiculos.com.br',
    'Test Owner',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'clerk_test_salesman',
    'seller@lojaveiculos.com.br',
    'Test Salesman',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'clerk_test_supervisor',
    'supervisor@lojaveiculos.com.br',
    'Test Supervisor',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'clerk_test_investor',
    'investor@lojaveiculos.com.br',
    'Test Investor',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (clerk_user_id) DO NOTHING;

INSERT INTO role_templates (id, description, is_system, name, role_key)
VALUES
  (
    '22222222-2222-4222-8222-222222222222',
    'Agency role with full cross-store administration.',
    true,
    'Agency',
    'agency'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Store owner with full store administration.',
    true,
    'Owner',
    'owner'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Supervisor role for operational management.',
    true,
    'Supervisor',
    'supervisor'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Sales role for inventory and CRM execution.',
    true,
    'Salesman',
    'salesman'
  ),
  (
    'eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee',
    'Investor role for read-only financial and operational visibility.',
    true,
    'Investor',
    'investor'
  )
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO store_memberships (
  id,
  role_template_id,
  status,
  store_id,
  tenant_id,
  user_id
)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  'active',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
)
ON CONFLICT (store_id, user_id) DO NOTHING;

INSERT INTO store_memberships (
  id,
  role_template_id,
  status,
  store_id,
  tenant_id,
  user_id
)
VALUES
  (
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '99999999-9999-4999-8999-999999999999'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    'eeeeeeee-2222-4eee-8eee-eeeeeeeeeeee',
    'eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  )
ON CONFLICT (store_id, user_id) DO NOTHING;

INSERT INTO store_entitlements (feature_key, source, status, store_id, tenant_id)
VALUES
  (
    'subdomain',
    'local_seed',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'crm',
    'local_seed',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'plate_lookup',
    'local_seed',
    'trialing',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'external_api',
    'local_seed',
    'inactive',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'custom_domain',
    'local_seed',
    'inactive',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'nfe',
    'local_seed',
    'inactive',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (store_id, feature_key) DO NOTHING;

INSERT INTO plans (id, code, limits, monthly_price_cents, name, status)
VALUES (
  '12121212-1212-4212-8212-121212121212',
  'growth',
  '{"vehicle_limit": 300, "seller_limit": 8}'::jsonb,
  29900,
  'Growth',
  'active'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO plan_features (feature_key, included, limit_value, plan_id)
VALUES
  ('subdomain', 1, null, '12121212-1212-4212-8212-121212121212'),
  ('crm', 1, null, '12121212-1212-4212-8212-121212121212'),
  ('plate_lookup', 1, 300, '12121212-1212-4212-8212-121212121212'),
  ('custom_domain', 0, null, '12121212-1212-4212-8212-121212121212'),
  ('external_api', 0, null, '12121212-1212-4212-8212-121212121212'),
  ('nfe', 0, null, '12121212-1212-4212-8212-121212121212')
ON CONFLICT (plan_id, feature_key) DO NOTHING;

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
  '00000000000100',
  'billing-test@lojaveiculos.com.br',
  'Loja Teste LTDA',
  'asaas',
  'local_asaas_customer_test',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (tenant_id, provider) DO NOTHING;

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
  now() + interval '30 days',
  now(),
  'asaas',
  'local_asaas_subscription_test',
  'trialing',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (provider, provider_subscription_id) DO NOTHING;

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
  now(),
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

INSERT INTO role_template_permissions (role_template_id, permission_key)
VALUES
  ('55555555-5555-4555-8555-555555555555', 'inventory.catalog_sync'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.cost_create'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.read'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.create'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.document_attach'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.media_delete'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.media_update'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.reserve'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.sell'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_description'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_price'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_status'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_unit'),
  ('55555555-5555-4555-8555-555555555555', 'finance.attach_document'),
  ('55555555-5555-4555-8555-555555555555', 'finance.create'),
  ('55555555-5555-4555-8555-555555555555', 'finance.read'),
  ('55555555-5555-4555-8555-555555555555', 'finance.update'),
  ('55555555-5555-4555-8555-555555555555', 'lead.create'),
  ('55555555-5555-4555-8555-555555555555', 'lead.read'),
  ('55555555-5555-4555-8555-555555555555', 'lead.update'),
  ('55555555-5555-4555-8555-555555555555', 'crm.access'),
  ('55555555-5555-4555-8555-555555555555', 'crm.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store_profile.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store_public_site.manage')
ON CONFLICT (role_template_id, permission_key) DO NOTHING;

INSERT INTO store_profiles (
  address_city,
  address_line_1,
  address_state,
  address_zip_code,
  contact_email,
  contact_phone,
  document_number,
  store_id,
  tenant_id,
  whatsapp_phone
)
VALUES (
  'Sao Paulo',
  'Avenida Loja V2, 1000',
  'SP',
  '01000-000',
  'test@lojaveiculos.com.br',
  '+5511999999999',
  '00000000000100',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '+5511999999999'
)
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO store_public_site_settings (
  is_published,
  layout_key,
  seo_description,
  seo_title,
  store_id,
  tenant_id
)
VALUES (
  true,
  'default',
  'Estoque selecionado da Loja Teste.',
  'Loja Teste - Veiculos',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (store_id) DO NOTHING;
