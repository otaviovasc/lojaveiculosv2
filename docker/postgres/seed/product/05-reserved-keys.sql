-- Fail atomically when a developer row already owns a seed-reserved natural
-- key with another id. Downstream fixtures intentionally use stable UUIDs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tenants
    WHERE slug = 'test-tenant'
      AND id <> '77777777-7777-4777-8777-777777777777'
  ) THEN
    RAISE EXCEPTION 'seed preflight: tenant slug test-tenant is reserved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stores
    WHERE public_slug = 'test-store'
      AND id <> '66666666-6666-4666-8666-666666666666'
  ) THEN
    RAISE EXCEPTION 'seed preflight: store slug test-store is reserved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users existing_user
    INNER JOIN (VALUES
      ('88888888-8888-4888-8888-888888888888'::uuid, 'clerk_test_user'),
      ('99999999-9999-4999-8999-999999999999'::uuid, 'clerk_test_salesman'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'clerk_test_supervisor'),
      ('01010101-0101-4101-8101-010101010101'::uuid, 'clerk_seed_agency'),
      ('02020202-0202-4202-8202-020202020202'::uuid, 'clerk_seed_owner'),
      ('03030303-0303-4303-8303-030303030303'::uuid, 'clerk_seed_supervisor'),
      ('04040404-0404-4404-8404-040404040404'::uuid, 'clerk_seed_salesman'),
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 'clerk_test_investor'),
      ('aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'clerk_platform_admin')
    ) AS seed_user(id, clerk_user_id)
      ON seed_user.clerk_user_id = existing_user.clerk_user_id
    WHERE existing_user.id <> seed_user.id
  ) THEN
    RAISE EXCEPTION 'seed preflight: a Clerk id is owned by another user id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM role_templates existing_role
    INNER JOIN (VALUES
      ('22222222-2222-4222-8222-222222222222'::uuid, 'agency'),
      ('55555555-5555-4555-8555-555555555555'::uuid, 'owner'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'supervisor'),
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'salesman'),
      ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee'::uuid, 'investor')
    ) AS seed_role(id, role_key)
      ON seed_role.role_key = existing_role.role_key::text
    WHERE existing_role.id <> seed_role.id
  ) THEN
    RAISE EXCEPTION 'seed preflight: a role key is owned by another role id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM plans
    WHERE code = 'growth'
      AND catalog_version = '2026-07-v1'
      AND id <> '12121212-1212-4212-8212-121212121212'
  ) THEN
    RAISE EXCEPTION 'seed preflight: Growth plan key is owned by another id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM addons existing_addon
    INNER JOIN (VALUES
      ('15151515-1515-4515-8515-151515151515'::uuid, 'crm_whatsapp_instance'),
      ('15151515-1515-4515-8515-151515151516'::uuid, 'marketplace_connectors'),
      ('15151515-1515-4515-8515-151515151517'::uuid, 'nfe_spedy'),
      ('15151515-1515-4515-8515-151515151518'::uuid, 'public_api_access'),
      ('15151515-1515-4515-8515-151515151519'::uuid, 'simulations_pro')
    ) AS seed_addon(id, code)
      ON seed_addon.code = existing_addon.code
    WHERE existing_addon.catalog_version = '2026-07-v1'
      AND existing_addon.id <> seed_addon.id
  ) THEN
    RAISE EXCEPTION 'seed preflight: billing add-on key is owned by another id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM billing_customers
    WHERE tenant_id = '77777777-7777-4777-8777-777777777777'
      AND provider = 'asaas'
      AND id <> '13131313-1313-4313-8313-131313131313'
  ) THEN
    RAISE EXCEPTION 'seed preflight: Asaas customer key is owned by another id';
  END IF;
END $$;
