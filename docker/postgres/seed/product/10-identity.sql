-- Local product seed v2.
-- Identity, memberships, and role reference data.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO tenants (id, legal_name, slug, trading_name)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  'Grupo Horizonte Mobilidade LTDA',
  'test-tenant',
  'Grupo Horizonte'
)
ON CONFLICT (slug) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  trading_name = EXCLUDED.trading_name,
  deleted_at = null,
  is_deleted = false,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM tenants
    WHERE id = '77777777-7777-4777-8777-777777777777'
      AND slug = 'test-tenant'
  ) THEN
    RAISE EXCEPTION 'seed identity collision: test-tenant must use the canonical fixture id; run pnpm run db:reset';
  END IF;
END
$$;

INSERT INTO stores (id, legal_name, primary_domain, public_slug, tenant_id, trading_name)
VALUES (
  '66666666-6666-4666-8666-666666666666',
  'Horizonte Seminovos Campinas LTDA',
  'test-store.local.test',
  'test-store',
  '77777777-7777-4777-8777-777777777777',
  'Horizonte Seminovos Campinas'
)
ON CONFLICT (public_slug) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  primary_domain = EXCLUDED.primary_domain,
  tenant_id = EXCLUDED.tenant_id,
  trading_name = EXCLUDED.trading_name,
  deleted_at = null,
  is_deleted = false,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM stores
    WHERE id = '66666666-6666-4666-8666-666666666666'
      AND public_slug = 'test-store'
  ) THEN
    RAISE EXCEPTION 'seed identity collision: test-store must use the canonical fixture id; run pnpm run db:reset';
  END IF;
END
$$;

INSERT INTO users (id, clerk_user_id, email, name, tenant_id)
VALUES
  (
    '88888888-8888-4888-8888-888888888888',
    'clerk_test_user',
    'test@lojaveiculos.com.br',
    'Paulo Andrade',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'clerk_test_salesman',
    'seller@lojaveiculos.com.br',
    'Camila Rezende',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'clerk_test_supervisor',
    'supervisor@lojaveiculos.com.br',
    'Diego Martins',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '01010101-0101-4101-8101-010101010101',
    'clerk_seed_agency',
    'agency.seed@lojaveiculos.com.br',
    'Marina Costa',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '02020202-0202-4202-8202-020202020202',
    'clerk_seed_owner',
    'owner.seed@lojaveiculos.com.br',
    'Rafael Nogueira',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '03030303-0303-4303-8303-030303030303',
    'clerk_seed_supervisor',
    'supervisor.seed@lojaveiculos.com.br',
    'Beatriz Almeida',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '04040404-0404-4404-8404-040404040404',
    'clerk_seed_salesman',
    'salesman.seed@lojaveiculos.com.br',
    'Lucas Fernandes',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'clerk_test_investor',
    'investor@lojaveiculos.com.br',
    'Helena Prado',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    'clerk_platform_admin',
    'platform@lojaveiculos.com.br',
    'Suporte Plataforma',
    null
  )
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id,
  deleted_at = null,
  is_deleted = false,
  updated_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('88888888-8888-4888-8888-888888888888'::uuid, 'clerk_test_user'),
        ('99999999-9999-4999-8999-999999999999'::uuid, 'clerk_test_salesman'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'clerk_test_supervisor'),
        ('01010101-0101-4101-8101-010101010101'::uuid, 'clerk_seed_agency'),
        ('02020202-0202-4202-8202-020202020202'::uuid, 'clerk_seed_owner'),
        ('03030303-0303-4303-8303-030303030303'::uuid, 'clerk_seed_supervisor'),
        ('04040404-0404-4404-8404-040404040404'::uuid, 'clerk_seed_salesman'),
        ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 'clerk_test_investor'),
        ('aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'clerk_platform_admin')
    ) AS expected(id, clerk_user_id)
    LEFT JOIN users actual
      ON actual.id = expected.id
      AND actual.clerk_user_id = expected.clerk_user_id
    WHERE actual.id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed identity collision: Clerk fixture users must use canonical ids; run pnpm run db:reset';
  END IF;
END
$$;

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
ON CONFLICT (role_key) DO UPDATE SET
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  name = EXCLUDED.name,
  updated_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('22222222-2222-4222-8222-222222222222'::uuid, 'agency'::role_template_key),
        ('55555555-5555-4555-8555-555555555555'::uuid, 'owner'::role_template_key),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'supervisor'::role_template_key),
        ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'salesman'::role_template_key),
        ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee'::uuid, 'investor'::role_template_key)
    ) AS expected(id, role_key)
    LEFT JOIN role_templates actual
      ON actual.id = expected.id
      AND actual.role_key = expected.role_key
    WHERE actual.id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed identity collision: role templates must use canonical ids; run pnpm run db:reset';
  END IF;
END
$$;

INSERT INTO platform_admin_memberships (
  id,
  status,
  user_id
)
VALUES (
  'abababab-abab-4aba-8aba-abababababab',
  'active',
  'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
)
ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO tenant_memberships (
  id,
  role_template_id,
  status,
  tenant_id,
  user_id
)
VALUES (
  '1212abab-1212-4aba-8aba-1212abab1212',
  '55555555-5555-4555-8555-555555555555',
  'active',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO tenant_memberships (
  id,
  role_template_id,
  status,
  tenant_id,
  user_id
)
VALUES
  (
    '01010101-2222-4101-8101-010101010101',
    '22222222-2222-4222-8222-222222222222',
    'active',
    '77777777-7777-4777-8777-777777777777',
    '01010101-0101-4101-8101-010101010101'
  ),
  (
    '02020202-2222-4202-8202-020202020202',
    '55555555-5555-4555-8555-555555555555',
    'active',
    '77777777-7777-4777-8777-777777777777',
    '02020202-0202-4202-8202-020202020202'
  )
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  updated_at = now();

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
ON CONFLICT (store_id, user_id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  ),
  (
    '02020202-3333-4202-8202-020202020202',
    '55555555-5555-4555-8555-555555555555',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '02020202-0202-4202-8202-020202020202'
  ),
  (
    '03030303-3333-4303-8303-030303030303',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '03030303-0303-4303-8303-030303030303'
  ),
  (
    '04040404-3333-4404-8404-040404040404',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'active',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '04040404-0404-4404-8404-040404040404'
  )
ON CONFLICT (store_id, user_id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
