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
VALUES (
  '88888888-8888-4888-8888-888888888888',
  'clerk_test_user',
  'test@lojaveiculos.com.br',
  'Test Owner',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (clerk_user_id) DO NOTHING;

INSERT INTO role_templates (id, description, is_system, name, role_key)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  'Local development owner role',
  true,
  'Owner',
  'owner'
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
  )
ON CONFLICT (store_id, feature_key) DO NOTHING;

INSERT INTO role_template_permissions (role_template_id, permission_key)
VALUES
  ('55555555-5555-4555-8555-555555555555', 'inventory.read'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.create'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_description'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_price'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.update_status'),
  ('55555555-5555-4555-8555-555555555555', 'crm.access'),
  ('55555555-5555-4555-8555-555555555555', 'crm.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store.manage')
ON CONFLICT (role_template_id, permission_key) DO NOTHING;
