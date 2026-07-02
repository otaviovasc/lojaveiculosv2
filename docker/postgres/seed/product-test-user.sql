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
    '01010101-0101-4101-8101-010101010101',
    'clerk_seed_agency',
    'agency.seed@lojaveiculos.com.br',
    'Seed Agency',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '02020202-0202-4202-8202-020202020202',
    'clerk_seed_owner',
    'owner.seed@lojaveiculos.com.br',
    'Seed Owner',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '03030303-0303-4303-8303-030303030303',
    'clerk_seed_supervisor',
    'supervisor.seed@lojaveiculos.com.br',
    'Seed Supervisor',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '04040404-0404-4404-8404-040404040404',
    'clerk_seed_salesman',
    'salesman.seed@lojaveiculos.com.br',
    'Seed Salesman',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'clerk_test_investor',
    'investor@lojaveiculos.com.br',
    'Test Investor',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    'clerk_platform_admin',
    'platform@lojaveiculos.com.br',
    'Platform Admin',
    null
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
ON CONFLICT (user_id) DO NOTHING;

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
ON CONFLICT (tenant_id, user_id) DO NOTHING;

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
ON CONFLICT (tenant_id, user_id) DO NOTHING;

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
  ('55555555-5555-4555-8555-555555555555', 'inventory.checklist_read'),
  ('55555555-5555-4555-8555-555555555555', 'inventory.checklist_update'),
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
  ('55555555-5555-4555-8555-555555555555', 'analytics.read'),
  ('55555555-5555-4555-8555-555555555555', 'audit.read'),
  ('55555555-5555-4555-8555-555555555555', 'billing.manage'),
  ('55555555-5555-4555-8555-555555555555', 'compliance.manage'),
  ('55555555-5555-4555-8555-555555555555', 'documents.download'),
  ('55555555-5555-4555-8555-555555555555', 'documents.preview'),
  ('55555555-5555-4555-8555-555555555555', 'documents.read'),
  ('55555555-5555-4555-8555-555555555555', 'documents.regenerate'),
  ('55555555-5555-4555-8555-555555555555', 'documents.template_update'),
  ('55555555-5555-4555-8555-555555555555', 'documents.void'),
  ('55555555-5555-4555-8555-555555555555', 'external_api.manage'),
  ('55555555-5555-4555-8555-555555555555', 'fiscal.manage'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.inventory_sync'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.lead_sync'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.listing_publish'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.listing_unpublish'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.listing_update'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.manage'),
  ('55555555-5555-4555-8555-555555555555', 'marketplace.read'),
  ('55555555-5555-4555-8555-555555555555', 'store.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store_profile.manage'),
  ('55555555-5555-4555-8555-555555555555', 'store_public_site.manage'),
  ('55555555-5555-4555-8555-555555555555', 'tenant.manage'),
  ('55555555-5555-4555-8555-555555555555', 'users.manage')
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
ON CONFLICT (store_id) DO UPDATE SET
  address_city = EXCLUDED.address_city,
  address_line_1 = EXCLUDED.address_line_1,
  address_state = EXCLUDED.address_state,
  address_zip_code = EXCLUDED.address_zip_code,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  document_number = EXCLUDED.document_number,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  updated_at = now();

INSERT INTO store_public_site_settings (
  hero_image_url,
  is_published,
  layout_key,
  seo_description,
  seo_title,
  store_id,
  tenant_id,
  theme
)
VALUES (
  'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407812109-dada8899-642c-410c-964d-7bca6d0b845e-bmw-m3-verde-3.jpg',
  true,
  'showroom',
  'Estoque revisado, pronta entrega e atendimento direto pelo WhatsApp.',
  'Loja Teste - Veiculos seminovos em Sao Paulo',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '{
    "badgeLabel": "Curadoria Loja Teste",
    "ctaLabel": "Chamar no WhatsApp",
    "headline": "Seminovos selecionados para compra segura",
    "sections": ["featured", "financing", "trust", "contact"],
    "tone": "premium"
  }'::jsonb
)
ON CONFLICT (store_id) DO UPDATE SET
  hero_image_url = EXCLUDED.hero_image_url,
  is_published = EXCLUDED.is_published,
  layout_key = EXCLUDED.layout_key,
  seo_description = EXCLUDED.seo_description,
  seo_title = EXCLUDED.seo_title,
  theme = EXCLUDED.theme,
  updated_at = now();

INSERT INTO store_entitlements (feature_key, metadata, source, status, store_id, tenant_id)
VALUES
  ('analytics', '{"dashboards": ["sales", "finance", "crm"]}'::jsonb, 'local_seed', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('marketplace', '{"providers": ["olx", "mercado_livre"]}'::jsonb, 'local_seed', 'trialing', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('external_api', '{"rate_limit_per_minute": 120}'::jsonb, 'local_seed', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('custom_domain', '{"domain": "seminovos.local.test"}'::jsonb, 'local_seed', 'trialing', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('nfe', '{"provider": "spedy", "environment": "homologation"}'::jsonb, 'local_seed', 'trialing', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (store_id, feature_key) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO vehicle_listings (
  id,
  asking_price_cents,
  condition,
  description,
  doors,
  engine_displacement,
  fuel_type,
  is_visible_on_public_site,
  manufacture_year,
  metadata,
  mileage_km,
  model_year,
  public_slug,
  status,
  store_id,
  tenant_id,
  title,
  transmission,
  trim_name
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 18990000, 'used', 'Sedan preto com pacote Prestige Plus, interior conservado, revisoes em dia e garantia de procedencia.', 4, '2.0', 'gasoline', true, 2021, '{"catalog": {"brandCode": "6", "brandLogoUrl": "https://upload.wikimedia.org/wikipedia/commons/7/7f/Audi_logo_detail.svg", "brandName": "Audi", "modelCode": "8771", "modelName": "A4 Prestige Plus 2.0 TFSI 190cv S tronic", "modelYear": 2022, "source": "fipe", "vehicleType": "cars", "yearCode": "2022-1", "yearName": "2022 Gasolina"}}'::jsonb, 32000, 2022, 'audi-a4-prestige-plus-preto-2022', 'published', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Audi A4 Prestige Plus 2.0 TFSI 2022', 'automatic', 'Prestige Plus'),
  ('10000000-0000-4000-8000-000000000002', 75990000, 'new', 'BMW M3 Competition M com unidades em preto e verde, 3.0 Bi-TB 510cv, pronta entrega e configuracao para testar estoque multiunidade.', 4, '3.0', 'gasoline', true, 2025, '{"catalog": {"brandCode": "7", "brandLogoUrl": "https://upload.wikimedia.org/wikipedia/commons/6/66/BMW_logo_%28white_%2B_grey_background_circle%29.svg", "brandName": "BMW", "modelCode": "9482", "modelName": "M3 Competition M 3.0 Bi-TB 510cv", "modelYear": 2025, "source": "fipe", "vehicleType": "cars", "yearCode": "2025-1", "yearName": "2025 Gasolina"}}'::jsonb, 0, 2025, 'bmw-m3-competition-m-2025', 'published', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'BMW M3 Competition M 2025', 'automatic', 'Competition M'),
  ('10000000-0000-4000-8000-000000000003', 6850000, 'used', 'Hatch economico para giro rapido de estoque, laudo aprovado.', 4, '1.0', 'flex', false, 2020, '{"catalog": {"brandName": "Hyundai", "modelName": "HB20", "modelYear": 2021, "source": "fipe", "vehicleType": "cars"}}'::jsonb, 52000, 2021, 'hyundai-hb20-comfort-2021', 'published', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Hyundai HB20 Comfort 2021', 'manual', 'Comfort'),
  ('10000000-0000-4000-8000-000000000004', 14990000, 'used', 'Pickup vendida no piloto local, mantendo historico para documentos e comissao.', 4, '2.8', 'diesel', false, 2020, '{"catalog": {"brandName": "Toyota", "modelName": "Hilux", "modelYear": 2021, "source": "fipe", "vehicleType": "cars"}}'::jsonb, 69000, 2021, 'toyota-hilux-srx-2021', 'sold_out', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Toyota Hilux SRX 2021', 'automatic', 'SRX')
ON CONFLICT (id) DO UPDATE SET
  asking_price_cents = EXCLUDED.asking_price_cents,
  condition = EXCLUDED.condition,
  description = EXCLUDED.description,
  doors = EXCLUDED.doors,
  engine_displacement = EXCLUDED.engine_displacement,
  fuel_type = EXCLUDED.fuel_type,
  is_visible_on_public_site = EXCLUDED.is_visible_on_public_site,
  manufacture_year = EXCLUDED.manufacture_year,
  metadata = EXCLUDED.metadata,
  mileage_km = EXCLUDED.mileage_km,
  model_year = EXCLUDED.model_year,
  public_slug = EXCLUDED.public_slug,
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  transmission = EXCLUDED.transmission,
  trim_name = EXCLUDED.trim_name,
  updated_at = now();

INSERT INTO vehicle_units (
  id,
  acquisition_date,
  acquisition_price_cents,
  color_name,
  listing_id,
  plate,
  status,
  stock_number,
  store_id,
  tenant_id,
  vin
)
VALUES
  ('11000000-0000-4000-8000-000000000001', now() - interval '45 days', 17100000, 'Preto', '10000000-0000-4000-8000-000000000001', 'ABC1D23', 'available', 'LV-A4-PRETO', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'WAU00000000000001'),
  ('11000000-0000-4000-8000-000000000002', now() - interval '10 days', 68900000, 'Preto', '10000000-0000-4000-8000-000000000002', null, 'reserved', 'LV-M3-PRETO', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'WBS00000000000002'),
  ('11000000-0000-4000-8000-000000000003', now() - interval '22 days', 6100000, 'Branco', '10000000-0000-4000-8000-000000000003', 'GHI7J89', 'reserved', 'LV-0003', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BD00000000000003'),
  ('11000000-0000-4000-8000-000000000004', now() - interval '70 days', 13200000, 'Preto', '10000000-0000-4000-8000-000000000004', 'JKL0M12', 'sold', 'LV-0004', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BD00000000000004'),
  ('11000000-0000-4000-8000-000000000005', now() - interval '8 days', 69200000, 'Verde', '10000000-0000-4000-8000-000000000002', null, 'available', 'LV-M3-VERDE', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'WBS00000000000005')
ON CONFLICT (id) DO UPDATE SET
  acquisition_date = EXCLUDED.acquisition_date,
  acquisition_price_cents = EXCLUDED.acquisition_price_cents,
  color_name = EXCLUDED.color_name,
  listing_id = EXCLUDED.listing_id,
  plate = EXCLUDED.plate,
  status = EXCLUDED.status,
  stock_number = EXCLUDED.stock_number,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  vin = EXCLUDED.vin,
  updated_at = now();

INSERT INTO vehicle_media (
  id,
  alt_text,
  display_order,
  is_public,
  kind,
  unit_id,
  metadata,
  storage_key,
  store_id,
  tenant_id,
  url
)
VALUES
  ('12000000-0000-4000-8000-000000000001', 'Audi A4 preto dianteira', 0, true, 'photo', '11000000-0000-4000-8000-000000000001', '{"contentType": "image/jpeg", "fileName": "audi-a4-preto-1.jpg", "sizeBytes": 144488, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg'),
  ('12000000-0000-4000-8000-000000000002', 'Audi A4 preto lateral', 1, true, 'photo', '11000000-0000-4000-8000-000000000001', '{"contentType": "image/jpeg", "fileName": "audi-a4-preto-2.jpeg", "sizeBytes": 15701, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407803425-e5dab261-c732-4a7e-8ada-75768d00c2a9-audi-a4-preto-2.jpeg', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407803425-e5dab261-c732-4a7e-8ada-75768d00c2a9-audi-a4-preto-2.jpeg'),
  ('12000000-0000-4000-8000-000000000003', 'Audi A4 preto traseira', 2, true, 'photo', '11000000-0000-4000-8000-000000000001', '{"contentType": "image/jpeg", "fileName": "audi-a4-preto-3.jpeg", "sizeBytes": 43445, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407804841-d61696ef-372f-4701-8910-86fd8e487813-audi-a4-preto-3.jpeg', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407804841-d61696ef-372f-4701-8910-86fd8e487813-audi-a4-preto-3.jpeg'),
  ('12000000-0000-4000-8000-000000000004', 'BMW M3 preto dianteira', 0, true, 'photo', '11000000-0000-4000-8000-000000000002', '{"contentType": "image/webp", "fileName": "bmw-m3-preto-1.webp", "sizeBytes": 84376, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407806409-bb4385a0-3929-4af3-a4c3-a67f6b9b4f79-bmw-m3-preto-1.webp', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407806409-bb4385a0-3929-4af3-a4c3-a67f6b9b4f79-bmw-m3-preto-1.webp'),
  ('12000000-0000-4000-8000-000000000005', 'BMW M3 preto lateral', 1, true, 'photo', '11000000-0000-4000-8000-000000000002', '{"contentType": "image/jpeg", "fileName": "bmw-m3-preto-2.jpg", "sizeBytes": 37252, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407807717-58d02b8c-b2e7-4993-ba01-14995bc1b757-bmw-m3-preto-2.jpg', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407807717-58d02b8c-b2e7-4993-ba01-14995bc1b757-bmw-m3-preto-2.jpg'),
  ('12000000-0000-4000-8000-000000000006', 'BMW M3 verde dianteira', 0, true, 'photo', '11000000-0000-4000-8000-000000000005', '{"contentType": "image/webp", "fileName": "bmw-m3-verde-1.webp", "sizeBytes": 66148, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407809307-81ecf89e-b6b5-4184-9fa9-c8426567ba60-bmw-m3-verde-1.webp', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407809307-81ecf89e-b6b5-4184-9fa9-c8426567ba60-bmw-m3-verde-1.webp'),
  ('12000000-0000-4000-8000-000000000007', 'BMW M3 verde detalhe', 1, true, 'photo', '11000000-0000-4000-8000-000000000005', '{"contentType": "image/avif", "fileName": "bmw-m3-verde-2.avif", "sizeBytes": 36664, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407810773-8eae51e7-2cd8-4706-af1b-e0b668549a43-bmw-m3-verde-2.avif', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407810773-8eae51e7-2cd8-4706-af1b-e0b668549a43-bmw-m3-verde-2.avif'),
  ('12000000-0000-4000-8000-000000000008', 'BMW M3 verde traseira', 2, true, 'photo', '11000000-0000-4000-8000-000000000005', '{"contentType": "image/jpeg", "fileName": "bmw-m3-verde-3.jpg", "sizeBytes": 219260, "source": "r2_seed"}'::jsonb, 'tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407812109-dada8899-642c-410c-964d-7bca6d0b845e-bmw-m3-verde-3.jpg', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://assets-v2.lojaveiculos.com.br/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000005/photo/1782407812109-dada8899-642c-410c-964d-7bca6d0b845e-bmw-m3-verde-3.jpg')
ON CONFLICT (id) DO UPDATE SET
  alt_text = EXCLUDED.alt_text,
  display_order = EXCLUDED.display_order,
  is_public = EXCLUDED.is_public,
  kind = EXCLUDED.kind,
  unit_id = EXCLUDED.unit_id,
  metadata = EXCLUDED.metadata,
  storage_key = EXCLUDED.storage_key,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  url = EXCLUDED.url,
  updated_at = now();

INSERT INTO vehicle_costs (
  id,
  amount_cents,
  cost_date,
  description,
  kind,
  store_id,
  tenant_id,
  unit_id
)
VALUES
  ('13000000-0000-4000-8000-000000000001', 185000, now() - interval '20 days', 'Revisao completa pre-venda', 'preparation', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000002', 92000, now() - interval '14 days', 'Polimento tecnico e higienizacao', 'repair', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000002'),
  ('13000000-0000-4000-8000-000000000003', 45000, now() - interval '7 days', 'Transferencia e vistoria', 'fee', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_price_history (
  id,
  actor_user_id,
  changed_at,
  listing_id,
  new_price_cents,
  old_price_cents,
  reason,
  store_id,
  tenant_id
)
VALUES
  ('14000000-0000-4000-8000-000000000001', '88888888-8888-4888-8888-888888888888', now() - interval '5 days', '10000000-0000-4000-8000-000000000001', 12690000, 12990000, 'Ajuste para campanha de fim de semana', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('14000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '9 days', '10000000-0000-4000-8000-000000000002', 9870000, 10190000, 'Reposicionamento por pesquisa FIPE', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_status_history (
  id,
  actor_user_id,
  changed_at,
  from_status,
  listing_id,
  reason,
  store_id,
  target,
  tenant_id,
  to_status,
  unit_id
)
VALUES
  ('15000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', now() - interval '3 days', 'available', '10000000-0000-4000-8000-000000000003', 'Sinal recebido de lead qualificado', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'reserved', '11000000-0000-4000-8000-000000000003'),
  ('15000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', now() - interval '11 days', 'reserved', '10000000-0000-4000-8000-000000000004', 'Venda concluida no atendimento presencial', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'sold', '11000000-0000-4000-8000-000000000004'),
  ('15000000-0000-4000-8000-000000000003', '99999999-9999-4999-8999-999999999999', now() - interval '1 day', 'available', '10000000-0000-4000-8000-000000000002', 'Sinal recebido para unidade BMW M3 preta', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'reserved', '11000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  changed_at = EXCLUDED.changed_at,
  from_status = EXCLUDED.from_status,
  listing_id = EXCLUDED.listing_id,
  reason = EXCLUDED.reason,
  store_id = EXCLUDED.store_id,
  target = EXCLUDED.target,
  tenant_id = EXCLUDED.tenant_id,
  to_status = EXCLUDED.to_status,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

INSERT INTO vehicle_checklists (
  id,
  completed_at,
  completed_by_user_id,
  items,
  name,
  status,
  store_id,
  tenant_id,
  unit_id
)
VALUES
  ('16000000-0000-4000-8000-000000000001', now() - interval '18 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '[{"label": "Laudo cautelar", "done": true}, {"label": "Higienizacao", "done": true}, {"label": "Fotos publicas", "done": true}]'::jsonb, 'Preparacao para publicacao', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000001'),
  ('16000000-0000-4000-8000-000000000002', null, null, '[{"label": "Contrato de reserva", "done": true}, {"label": "Pagamento do sinal", "done": true}, {"label": "Entrega tecnica", "done": false}]'::jsonb, 'Reserva HB20', 'in_progress', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (
  id,
  assigned_user_id,
  buyer_email,
  buyer_name,
  buyer_phone,
  last_interaction_at,
  metadata,
  source,
  status,
  store_id,
  tenant_id
)
VALUES
  ('20000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', 'ana.silva@example.com', 'Ana Silva', '+5511988881111', now() - interval '2 hours', '{"score": 82, "channel": "site", "budgetCents": 13000000}'::jsonb, 'public_site', 'negotiating', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('20000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', 'marcos.lima@example.com', 'Marcos Lima', '+5511977772222', now() - interval '1 day', '{"score": 68, "channel": "whatsapp", "budgetCents": 10000000}'::jsonb, 'whatsapp', 'qualified', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('20000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'carla.rocha@example.com', 'Carla Rocha', '+5511966663333', now() - interval '12 days', '{"score": 91, "channel": "loja", "payment": "financing"}'::jsonb, 'manual', 'won', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_activities (
  id,
  activity_type,
  content,
  created_by_user_id,
  direction,
  lead_id,
  occurred_at,
  priority,
  store_id,
  tenant_id
)
VALUES
  ('21000000-0000-4000-8000-000000000001', 'whatsapp', 'Cliente pediu simulacao com entrada de R$ 40.000.', '99999999-9999-4999-8999-999999999999', 'outbound', '20000000-0000-4000-8000-000000000001', now() - interval '2 hours', 2, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('21000000-0000-4000-8000-000000000002', 'call', 'Ligacao agendada para validar troca no usado.', '99999999-9999-4999-8999-999999999999', 'internal', '20000000-0000-4000-8000-000000000002', now() - interval '1 day', 1, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('21000000-0000-4000-8000-000000000003', 'status_change', 'Lead convertido em venda.', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'internal', '20000000-0000-4000-8000-000000000003', now() - interval '12 days', 3, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_vehicle_interests (id, lead_id, listing_id, store_id, tenant_id, unit_id)
VALUES
  ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000001'),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000002'),
  ('22000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO UPDATE SET
  lead_id = EXCLUDED.lead_id,
  listing_id = EXCLUDED.listing_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

INSERT INTO lead_visits (
  id,
  assigned_user_id,
  lead_id,
  notes,
  scheduled_at,
  status,
  store_id,
  tenant_id
)
VALUES
  ('23000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', '20000000-0000-4000-8000-000000000001', 'Test drive do Audi A4 com avaliacao de troca.', now() + interval '1 day', 'scheduled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('23000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', '20000000-0000-4000-8000-000000000002', 'Enviar proposta de financiamento antes da visita.', now() + interval '3 days', 'scheduled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  lead_id = EXCLUDED.lead_id,
  notes = EXCLUDED.notes,
  scheduled_at = EXCLUDED.scheduled_at,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_connection_mappings (
  id,
  last_seen_at,
  repasses_connection_id,
  status,
  store_id,
  tenant_id
)
VALUES (
  '24000000-0000-4000-8000-000000000001',
  now() - interval '10 minutes',
  'repasses_conn_test_store',
  'active',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (store_id) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO crm_agent_mappings (
  id,
  repasses_agent_id,
  role,
  store_id,
  tenant_id,
  user_id
)
VALUES
  ('25000000-0000-4000-8000-000000000001', 'repasses_agent_owner', 'owner', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '88888888-8888-4888-8888-888888888888'),
  ('25000000-0000-4000-8000-000000000002', 'repasses_agent_salesman', 'salesman', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '99999999-9999-4999-8999-999999999999')
ON CONFLICT (store_id, user_id) DO NOTHING;

INSERT INTO crm_lead_mappings (
  id,
  channel,
  lead_id,
  repasses_contact_id,
  repasses_session_id,
  store_id,
  tenant_id
)
VALUES
  ('26000000-0000-4000-8000-000000000001', 'whatsapp', '20000000-0000-4000-8000-000000000001', 'contact_ana_silva', 'session_ana_a4', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26000000-0000-4000-8000-000000000002', 'whatsapp', '20000000-0000-4000-8000-000000000002', 'contact_marcos_lima', 'session_marcos_m3', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  channel = EXCLUDED.channel,
  lead_id = EXCLUDED.lead_id,
  repasses_contact_id = EXCLUDED.repasses_contact_id,
  repasses_session_id = EXCLUDED.repasses_session_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_tag_mappings (
  id,
  is_column,
  local_key,
  name,
  repasses_tag_id,
  store_id,
  tenant_id
)
VALUES
  ('27000000-0000-4000-8000-000000000001', 1, 'new', 'Novos', 'tag_new', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('27000000-0000-4000-8000-000000000002', 1, 'negotiating', 'Negociacao', 'tag_negotiating', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('27000000-0000-4000-8000-000000000003', 1, 'won', 'Vendidos', 'tag_won', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (store_id, local_key) DO NOTHING;

INSERT INTO crm_sync_events (
  id,
  event_key,
  event_type,
  payload,
  processed_at,
  status,
  store_id,
  tenant_id
)
VALUES
  ('28000000-0000-4000-8000-000000000001', 'seed.session.ana_a4', 'session.updated', '{"sessionId": "session_ana_a4", "status": "open"}'::jsonb, now() - interval '2 hours', 'processed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('28000000-0000-4000-8000-000000000002', 'seed.lead.marcos_m3', 'lead.created', '{"sessionId": "session_marcos_m3", "source": "whatsapp"}'::jsonb, now() - interval '1 day', 'processed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  event_key = EXCLUDED.event_key,
  event_type = EXCLUDED.event_type,
  payload = EXCLUDED.payload,
  processed_at = EXCLUDED.processed_at,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO sales (
  id,
  buyer_snapshot,
  closed_at,
  lead_id,
  listing_snapshot,
  sale_price_cents,
  sale_source_snapshot,
  selected_document_kinds,
  seller_user_id,
  status,
  store_id,
  tenant_id,
  unit_id
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '{"name": "Carla Rocha", "phone": "+5511966663333", "document": "123.456.789-09"}'::jsonb,
  now() - interval '11 days',
  '20000000-0000-4000-8000-000000000003',
  '{"listingId": "10000000-0000-4000-8000-000000000004", "title": "Toyota Hilux SRX 2021", "plate": "JKL0M12", "stockNumber": "LV-0004"}'::jsonb,
  14650000,
  '{"listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "workflow": "vehicle_sale"}'::jsonb,
  '["sale_contract", "sale_receipt", "delivery_term", "power_of_attorney"]'::jsonb,
  '99999999-9999-4999-8999-999999999999',
  'closed',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '11000000-0000-4000-8000-000000000004'
)
ON CONFLICT (id) DO UPDATE SET
  buyer_snapshot = EXCLUDED.buyer_snapshot,
  closed_at = EXCLUDED.closed_at,
  lead_id = EXCLUDED.lead_id,
  listing_snapshot = EXCLUDED.listing_snapshot,
  sale_price_cents = EXCLUDED.sale_price_cents,
  sale_source_snapshot = EXCLUDED.sale_source_snapshot,
  selected_document_kinds = EXCLUDED.selected_document_kinds,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

INSERT INTO sale_items (id, amount_cents, item_type, metadata, sale_id, store_id, tenant_id)
VALUES
  ('31000000-0000-4000-8000-000000000001', 14650000, 'vehicle', '{"description": "Toyota Hilux SRX 2021"}'::jsonb, '30000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('31000000-0000-4000-8000-000000000002', -120000, 'discount', '{"reason": "Negociacao presencial"}'::jsonb, '30000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sale_payments (
  id,
  amount_cents,
  method,
  paid_at,
  provider_payment_id,
  sale_id,
  status,
  store_id,
  tenant_id
)
VALUES
  ('32000000-0000-4000-8000-000000000001', 4000000, 'pix', now() - interval '12 days', 'local_pix_signal_hilux', '30000000-0000-4000-8000-000000000001', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('32000000-0000-4000-8000-000000000002', 10650000, 'financing', now() - interval '10 days', 'local_financing_hilux', '30000000-0000-4000-8000-000000000001', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance_entries (
  id,
  amount_cents,
  category,
  due_at,
  metadata,
  name,
  paid_at,
  seller_user_id,
  status,
  store_id,
  tenant_id,
  type
)
VALUES
  ('40000000-0000-4000-8000-000000000001', 14650000, 'vehicle_sale', now() - interval '10 days', '{"paymentMethod": "pix_financing"}'::jsonb, 'Venda Toyota Hilux SRX', now() - interval '10 days', '99999999-9999-4999-8999-999999999999', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue'),
  ('40000000-0000-4000-8000-000000000002', 185000, 'preparation', now() - interval '20 days', '{"vendor": "Oficina parceira"}'::jsonb, 'Revisao Audi A4', now() - interval '19 days', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('40000000-0000-4000-8000-000000000003', 219750, 'sales_commission', now() + interval '5 days', '{"basis": "1.5% sobre venda Hilux"}'::jsonb, 'Comissao venda Hilux', null, '99999999-9999-4999-8999-999999999999', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'commission'),
  ('40000000-0000-4000-8000-000000000004', 75990000, 'vehicle_sale', now() + interval '7 days', '{"leadId": "20000000-0000-4000-8000-000000000002"}'::jsonb, 'Proposta BMW M3 Competition M', null, '99999999-9999-4999-8999-999999999999', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  category = EXCLUDED.category,
  due_at = EXCLUDED.due_at,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  paid_at = EXCLUDED.paid_at,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  updated_at = now();

INSERT INTO finance_entry_links (id, entry_id, target_id, target_type, store_id, tenant_id)
VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'sale', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'sale', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'lead', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000002', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  entry_id = EXCLUDED.entry_id,
  target_id = EXCLUDED.target_id,
  target_type = EXCLUDED.target_type,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO finance_recurring_entries (
  id,
  amount_cents,
  category,
  day_of_month,
  frequency,
  metadata,
  name,
  next_due_at,
  seller_user_id,
  status,
  store_id,
  tenant_id,
  type
)
VALUES
  ('42000000-0000-4000-8000-000000000001', 850000, 'rent', 5, 'monthly', '{"costCenter": "loja"}'::jsonb, 'Aluguel loja', date_trunc('month', now()) + interval '1 month 4 days', null, 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('42000000-0000-4000-8000-000000000002', 350000, 'traffic', 15, 'monthly', '{"channel": "meta_ads"}'::jsonb, 'Midia performance estoque', date_trunc('month', now()) + interval '1 month 14 days', null, 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense')
ON CONFLICT (id) DO NOTHING;

INSERT INTO commission_rules (
  id,
  category,
  fixed_amount_cents,
  metadata,
  name,
  percentage_basis_points,
  seller_user_id,
  status,
  store_id,
  tenant_id,
  type
)
VALUES
  ('43000000-0000-4000-8000-000000000001', 'vehicle_sale', null, '{"appliesTo": "seminovos"}'::jsonb, 'Comissao padrao vendedor', 150, '99999999-9999-4999-8999-999999999999', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'percentage'),
  ('43000000-0000-4000-8000-000000000002', 'financing', 50000, '{"trigger": "financing_approved"}'::jsonb, 'Bonus financiamento aprovado', null, '99999999-9999-4999-8999-999999999999', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'fixed_amount')
ON CONFLICT (id) DO NOTHING;

INSERT INTO commissions (
  id,
  amount_cents,
  entry_id,
  metadata,
  sale_id,
  seller_user_id,
  status,
  store_id,
  tenant_id
)
VALUES (
  '44000000-0000-4000-8000-000000000001',
  219750,
  '40000000-0000-4000-8000-000000000003',
  '{"ruleId": "43000000-0000-4000-8000-000000000001"}'::jsonb,
  '30000000-0000-4000-8000-000000000001',
  '99999999-9999-4999-8999-999999999999',
  'pending',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO financing_inquiries (
  id,
  completed_at,
  lead_id,
  listing_id,
  metadata,
  provider,
  provider_inquiry_id,
  status,
  store_id,
  tenant_id,
  unit_id
)
VALUES (
  '45000000-0000-4000-8000-000000000001',
  now() - interval '1 hour',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '{"downPaymentCents": 4000000}'::jsonb,
  'banco_demo',
  'fin_seed_ana_a4',
  'approved',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '11000000-0000-4000-8000-000000000001'
)
ON CONFLICT (id) DO UPDATE SET
  completed_at = EXCLUDED.completed_at,
  lead_id = EXCLUDED.lead_id,
  listing_id = EXCLUDED.listing_id,
  metadata = EXCLUDED.metadata,
  provider = EXCLUDED.provider,
  provider_inquiry_id = EXCLUDED.provider_inquiry_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

INSERT INTO financing_conditions (
  id,
  bank_name,
  inquiry_id,
  installments,
  metadata,
  status,
  summary,
  total_amount_cents
)
VALUES
  ('46000000-0000-4000-8000-000000000001', 'Banco Demo', '45000000-0000-4000-8000-000000000001', 48, '{"monthlyPaymentCents": 246000}'::jsonb, 'approved', 'Entrada de R$ 40.000 e 48 parcelas estimadas.', 11808000),
  ('46000000-0000-4000-8000-000000000002', 'Banco Parceiro', '45000000-0000-4000-8000-000000000001', 60, '{"monthlyPaymentCents": 216000}'::jsonb, 'review', 'Opcao em revisao manual.', 12960000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_templates (
  id,
  clauses,
  is_enabled,
  kind,
  store_id,
  tenant_id,
  title,
  updated_by_user_id
)
VALUES
  ('50000000-0000-4000-8000-000000000001', '[{"title": "Entrega", "body": "Comprador declara vistoria e recebimento do veiculo."}]'::jsonb, true, 'delivery_term', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Termo de entrega padrao', '88888888-8888-4888-8888-888888888888'),
  ('50000000-0000-4000-8000-000000000002', '[{"title": "Pagamento", "body": "Valores e condicoes constam no recibo assinado."}]'::jsonb, true, 'sale_contract', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Contrato de venda padrao', '88888888-8888-4888-8888-888888888888'),
  ('50000000-0000-4000-8000-000000000003', '[{"title": "Quitacao", "body": "Vendedor declara recebimento conforme condicoes registradas."}]'::jsonb, true, 'sale_receipt', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de venda padrao', '88888888-8888-4888-8888-888888888888'),
  ('50000000-0000-4000-8000-000000000004', '[{"title": "Poderes", "body": "Comprador outorga poderes para atos de transferencia veicular."}]'::jsonb, true, 'power_of_attorney', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Procuracao padrao', '88888888-8888-4888-8888-888888888888'),
  ('50000000-0000-4000-8000-000000000005', '[{"title": "Sinal", "body": "Reserva condicionada ao recebimento do sinal e dados do comprador."}]'::jsonb, true, 'reservation_receipt', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de sinal padrao', '88888888-8888-4888-8888-888888888888')
ON CONFLICT (store_id, kind) DO UPDATE SET
  clauses = EXCLUDED.clauses,
  is_enabled = EXCLUDED.is_enabled,
  title = EXCLUDED.title,
  updated_by_user_id = EXCLUDED.updated_by_user_id,
  updated_at = now();

INSERT INTO documents (
  id,
  created_by_user_id,
  file_name,
  file_size_bytes,
  kind,
  metadata,
  mime_type,
  status,
  storage_key,
  store_id,
  tenant_id,
  title,
  uploaded_at
)
VALUES
  ('51000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', 'contrato-hilux.pdf', 248000, 'sale_contract', '{"saleId": "30000000-0000-4000-8000-000000000001", "saleTitle": "Venda Toyota Hilux SRX", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "sale_contract"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/sale_contract.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Contrato de venda Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', 'recibo-sinal-hb20.pdf', 142000, 'reservation_receipt', '{"listingId": "10000000-0000-4000-8000-000000000003", "listingTitle": "Hyundai HB20 Comfort 2021", "unitId": "11000000-0000-4000-8000-000000000003", "vehicleTitle": "Hyundai HB20 Comfort 2021", "plate": "GHI7J89", "leadId": "20000000-0000-4000-8000-000000000002", "leadName": "Marcos Lima", "documentType": "reservation_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000003/reservation_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de reserva HB20', now() - interval '3 days'),
  ('51000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'laudo-audi-a4.pdf', 184000, 'inspection', '{"unitId": "11000000-0000-4000-8000-000000000001", "unitTitle": "Audi A4 Prestige Plus 2.0 TFSI 2022", "plate": "ABC1D23", "buyerName": "Ana Silva", "documentType": "Laudo cautelar"}'::jsonb, 'application/pdf', 'signed', 'seed/documents/laudo-audi-a4.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Laudo cautelar Audi A4', now() - interval '19 days'),
  ('51000000-0000-4000-8000-000000000004', '88888888-8888-4888-8888-888888888888', 'documento-loja.pdf', 124000, 'internal', '{"documentCategory": "Documento geral", "reference": "Documento interno de oficina", "notes": "Importado em grupo geral."}'::jsonb, 'application/pdf', 'issued', 'seed/documents/documento-loja.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Protocolo interno', now() - interval '4 days'),
  ('51000000-0000-4000-8000-000000000005', '99999999-9999-4999-8999-999999999999', 'recibo-pagamento-hilux.pdf', 132000, 'finance_receipt', '{"paymentId": "32000000-0000-4000-8000-000000000001", "financeTitle": "Pagamento de entrada", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "plate": "JKL0M12", "method": "Pix"}'::jsonb, 'application/pdf', 'issued', 'seed/documents/recibo-pagamento-hilux.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Comprovante de pagamento', now() - interval '2 days'),
  ('51000000-0000-4000-8000-000000000006', '99999999-9999-4999-8999-999999999999', 'recibo-venda-hilux.pdf', 132000, 'sale_receipt', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "sale_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/sale_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de venda Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000007', '99999999-9999-4999-8999-999999999999', 'termo-entrega-hilux.pdf', 150000, 'delivery_term', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "delivery_term"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/delivery_term.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Termo de entrega Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000008', '99999999-9999-4999-8999-999999999999', 'procuracao-hilux.pdf', 156000, 'power_of_attorney', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "power_of_attorney"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/power_of_attorney.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Procuracao Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000009', '99999999-9999-4999-8999-999999999999', 'recibo-sinal-bmw-m3-preto.pdf', 145000, 'reservation_receipt', '{"listingId": "10000000-0000-4000-8000-000000000002", "listingTitle": "BMW M3 Competition M 2025", "unitId": "11000000-0000-4000-8000-000000000002", "vehicleTitle": "BMW M3 Competition M 2025", "stockNumber": "LV-M3-PRETO", "leadId": "20000000-0000-4000-8000-000000000002", "leadName": "Marcos Lima", "documentType": "reservation_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000002/reservation_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de reserva BMW M3 Preto', now() - interval '1 day')
ON CONFLICT (id) DO UPDATE SET
  created_by_user_id = EXCLUDED.created_by_user_id,
  file_name = EXCLUDED.file_name,
  file_size_bytes = EXCLUDED.file_size_bytes,
  kind = EXCLUDED.kind,
  metadata = EXCLUDED.metadata,
  mime_type = EXCLUDED.mime_type,
  status = EXCLUDED.status,
  storage_key = EXCLUDED.storage_key,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  title = EXCLUDED.title,
  uploaded_at = EXCLUDED.uploaded_at,
  updated_at = now();

INSERT INTO document_links (id, document_id, link_role, store_id, target_id, target_type, tenant_id)
VALUES
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'sale_contract', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'reservation_receipt', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000003', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000003', 'inspection', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000001', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000004', 'primary', '66666666-6666-4666-8666-666666666666', '66666666-6666-4666-8666-666666666666', 'store', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000005', '51000000-0000-4000-8000-000000000005', 'primary', '66666666-6666-4666-8666-666666666666', '32000000-0000-4000-8000-000000000001', 'sale_payment', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000006', '51000000-0000-4000-8000-000000000006', 'sale_receipt', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000007', '51000000-0000-4000-8000-000000000007', 'delivery_term', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000008', '51000000-0000-4000-8000-000000000008', 'power_of_attorney', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '77777777-7777-4777-8777-777777777777'),
  ('52000000-0000-4000-8000-000000000009', '51000000-0000-4000-8000-000000000009', 'reservation_receipt', '66666666-6666-4666-8666-666666666666', '11000000-0000-4000-8000-000000000002', 'vehicle_unit', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  document_id = EXCLUDED.document_id,
  link_role = EXCLUDED.link_role,
  store_id = EXCLUDED.store_id,
  target_id = EXCLUDED.target_id,
  target_type = EXCLUDED.target_type,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO document_versions (
  id,
  created_by_user_id,
  document_id,
  file_name,
  file_size_bytes,
  mime_type,
  storage_key,
  store_id,
  tenant_id,
  version_number
)
VALUES
  ('53000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000001', 'contrato-hilux-v1.pdf', 248000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/sale_contract-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000002', 'recibo-sinal-hb20-v1.pdf', 142000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000003/versions/reservation_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000003', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000006', 'recibo-venda-hilux-v1.pdf', 132000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/sale_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000004', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000007', 'termo-entrega-hilux-v1.pdf', 150000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/delivery_term-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000005', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000008', 'procuracao-hilux-v1.pdf', 156000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/power_of_attorney-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000006', '99999999-9999-4999-8999-999999999999', '51000000-0000-4000-8000-000000000009', 'recibo-sinal-bmw-m3-preto-v1.pdf', 145000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000002/versions/reservation_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1)
ON CONFLICT (document_id, version_number) DO UPDATE SET
  created_by_user_id = EXCLUDED.created_by_user_id,
  file_name = EXCLUDED.file_name,
  file_size_bytes = EXCLUDED.file_size_bytes,
  mime_type = EXCLUDED.mime_type,
  storage_key = EXCLUDED.storage_key,
  store_id = EXCLUDED.store_id,
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
  ('60000000-0000-4000-8000-000000000001', 29900, now() - interval '3 days', 'seed-growth-current', 'https://billing.local/invoices/seed-growth-current', now() - interval '2 days', 'asaas', 'local_asaas_payment_paid', '{"billingType": "PIX"}'::jsonb, 'paid', '66666666-6666-4666-8666-666666666666', '14141414-1414-4414-8414-141414141414', '77777777-7777-4777-8777-777777777777'),
  ('60000000-0000-4000-8000-000000000002', 29900, now() + interval '27 days', 'seed-growth-next', 'https://billing.local/invoices/seed-growth-next', null, 'asaas', 'local_asaas_payment_pending', '{"billingType": "BOLETO"}'::jsonb, 'pending', '66666666-6666-4666-8666-666666666666', '14141414-1414-4414-8414-141414141414', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

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
  ('61000000-0000-4000-8000-000000000001', 'local_seed', 'external_api', '{"plan": "growth"}'::jsonb, 'active', 'inactive', 'Seeded local API access', 'local_seed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('61000000-0000-4000-8000-000000000002', 'local_seed', 'nfe', '{"provider": "spedy"}'::jsonb, 'trialing', 'inactive', 'Seeded fiscal trial', 'local_seed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_clients (
  id,
  name,
  scopes,
  status,
  store_id,
  tenant_id
)
VALUES (
  '70000000-0000-4000-8000-000000000001',
  'Integracao ERP local',
  '["inventory.read", "lead.create", "lead.read"]'::jsonb,
  'active',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_client_keys (
  id,
  client_id,
  expires_at,
  key_hash,
  key_prefix
)
VALUES (
  '71000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  now() + interval '90 days',
  'seeded-local-key-hash-do-not-use',
  'lv_test'
)
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO api_request_logs (
  id,
  client_id,
  method,
  path,
  request_id,
  response_ms,
  status_code,
  store_id,
  tenant_id
)
VALUES
  ('72000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'GET', '/api/v1/public/inventory', 'req_seed_inventory', 42, 200, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('72000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'POST', '/api/v1/public/leads', 'req_seed_lead', 87, 201, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_idempotency_keys (
  id,
  client_id,
  completed_at,
  idempotency_key,
  method,
  path,
  request_fingerprint,
  request_id,
  response_ms,
  status,
  status_code,
  store_id,
  tenant_id
)
VALUES (
  '73000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  now() - interval '1 day',
  'seed-create-lead-001',
  'POST',
  '/api/v1/public/leads',
  'fingerprint_seed_lead_001',
  'req_seed_lead',
  87,
  'completed',
  201,
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (client_id, idempotency_key) DO NOTHING;

INSERT INTO api_webhooks (
  id,
  client_id,
  events,
  status,
  store_id,
  target_url,
  tenant_id
)
VALUES (
  '74000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '["lead.created", "vehicle.updated"]'::jsonb,
  'active',
  '66666666-6666-4666-8666-666666666666',
  'https://erp.local.test/webhooks/lojaveiculos',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_webhook_deliveries (
  id,
  attempt_count,
  event_key,
  last_status_code,
  next_attempt_at,
  payload,
  webhook_id
)
VALUES (
  '75000000-0000-4000-8000-000000000001',
  1,
  'seed.lead.created.20000000-0000-4000-8000-000000000001',
  200,
  null,
  '{"leadId": "20000000-0000-4000-8000-000000000001"}'::jsonb,
  '74000000-0000-4000-8000-000000000001'
)
ON CONFLICT (webhook_id, event_key) DO NOTHING;

INSERT INTO integration_accounts (
  id,
  config,
  provider,
  status,
  store_id,
  tenant_id
)
VALUES
  ('80000000-0000-4000-8000-000000000001', '{"accountName": "Loja Teste OLX", "city": "Sao Paulo"}'::jsonb, 'olx', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('80000000-0000-4000-8000-000000000002', '{"accountName": "Loja Teste Mercado Livre", "city": "Sao Paulo"}'::jsonb, 'mercado_livre', 'inactive', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (store_id, provider) DO UPDATE SET
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO integration_jobs (
  id,
  account_id,
  completed_at,
  error_message,
  job_type,
  metadata,
  status,
  store_id,
  tenant_id
)
VALUES
  ('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', now() - interval '45 minutes', null, 'inventory_sync', '{"published": 2, "failed": 0}'::jsonb, 'succeeded', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('81000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002', null, 'Credenciais pendentes de validacao', 'inventory_sync', '{"published": 0, "failed": 1}'::jsonb, 'failed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle_provider_listings (
  id,
  account_id,
  external_id,
  listing_id,
  metadata,
  store_id,
  tenant_id
)
VALUES
  ('82000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'olx_seed_audi_a4', '10000000-0000-4000-8000-000000000001', '{"status": "published"}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('82000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'olx_seed_bmw_m3', '10000000-0000-4000-8000-000000000002', '{"status": "published"}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (account_id, listing_id) DO UPDATE SET
  external_id = EXCLUDED.external_id,
  metadata = EXCLUDED.metadata,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO fiscal_documents (
  id,
  access_key,
  document_type,
  issued_at,
  metadata,
  provider,
  provider_document_id,
  status,
  store_id,
  tenant_id
)
VALUES
  ('90000000-0000-4000-8000-000000000001', '35260600000000000100550010000000011000000010', 'nfe_sale', now() - interval '10 days', '{"saleId": "30000000-0000-4000-8000-000000000001", "environment": "homologation"}'::jsonb, 'spedy', 'spedy_seed_nfe_hilux', 'issued', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('90000000-0000-4000-8000-000000000002', null, 'nfe_sale', null, '{"saleId": "30000000-0000-4000-8000-000000000001", "reason": "cancel simulation"}'::jsonb, 'spedy', 'spedy_seed_nfe_failed', 'failed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (provider, provider_document_id) DO NOTHING;

INSERT INTO fiscal_document_links (
  id,
  fiscal_document_id,
  store_id,
  target_id,
  target_type,
  tenant_id
)
VALUES (
  '91000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000001',
  '66666666-6666-4666-8666-666666666666',
  '30000000-0000-4000-8000-000000000001',
  'sale',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fiscal_events (
  id,
  event_type,
  fiscal_document_id,
  metadata,
  occurred_at,
  store_id,
  tenant_id
)
VALUES
  ('92000000-0000-4000-8000-000000000001', 'authorized', '90000000-0000-4000-8000-000000000001', '{"protocol": "135250000000001"}'::jsonb, now() - interval '10 days', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('92000000-0000-4000-8000-000000000002', 'rejected', '90000000-0000-4000-8000-000000000002', '{"code": "539", "message": "Duplicidade simulada"}'::jsonb, now() - interval '9 days', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_events (
  id,
  environment,
  event_type,
  payload,
  processed_at,
  provider,
  provider_event_id,
  status,
  store_id,
  tenant_id
)
VALUES
  ('93000000-0000-4000-8000-000000000001', 'local', 'payment.confirmed', '{"paymentId": "local_asaas_payment_paid"}'::jsonb, now() - interval '2 days', 'asaas', 'evt_seed_payment_paid', 'processed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('93000000-0000-4000-8000-000000000002', 'local', 'nfe.authorized', '{"documentId": "spedy_seed_nfe_hilux"}'::jsonb, now() - interval '10 days', 'spedy', 'evt_seed_nfe_authorized', 'processed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (provider, environment, provider_event_id) DO NOTHING;
