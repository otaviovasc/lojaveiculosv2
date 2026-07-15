-- Local product seed v2.
-- Multi-store, tenant-isolation, invitation, suspension, and override fixtures.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO tenants (
  id,
  legal_name,
  slug,
  trading_name
)
VALUES (
  '77777777-7777-4777-8777-777777777778',
  'Rota 27 Comercio de Veiculos LTDA',
  'isolation-tenant',
  'Rota 27 Seminovos'
)
ON CONFLICT (id) DO UPDATE SET
  deleted_at = null,
  is_deleted = false,
  legal_name = EXCLUDED.legal_name,
  slug = EXCLUDED.slug,
  trading_name = EXCLUDED.trading_name,
  updated_at = now();

INSERT INTO stores (
  id,
  legal_name,
  primary_domain,
  public_slug,
  tenant_id,
  trading_name
)
VALUES
  (
    '66666666-6666-4666-8666-666666666667',
    'Horizonte Seminovos Sorocaba LTDA',
    'test-store-sorocaba.example.test',
    'test-store-sorocaba',
    '77777777-7777-4777-8777-777777777777',
    'Horizonte Seminovos Sorocaba'
  ),
  (
    '66666666-6666-4666-8666-666666666668',
    'Rota 27 Comercio de Veiculos LTDA',
    'isolation-store.example.test',
    'isolation-store',
    '77777777-7777-4777-8777-777777777778',
    'Rota 27 Seminovos'
  )
ON CONFLICT (id) DO UPDATE SET
  deleted_at = null,
  is_deleted = false,
  legal_name = EXCLUDED.legal_name,
  primary_domain = EXCLUDED.primary_domain,
  public_slug = EXCLUDED.public_slug,
  tenant_id = EXCLUDED.tenant_id,
  trading_name = EXCLUDED.trading_name,
  updated_at = now();

INSERT INTO users (
  id,
  clerk_user_id,
  email,
  name,
  tenant_id
)
VALUES
  (
    '05050505-0505-4505-8505-050505050505',
    'clerk_seed_branch_salesman',
    'camila.ribeiro@example.test',
    'Camila Ribeiro',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '06060606-0606-4606-8606-060606060606',
    'clerk_seed_isolation_owner',
    'rafael.martins@example.test',
    'Rafael Martins',
    '77777777-7777-4777-8777-777777777778'
  ),
  (
    '07070707-0707-4707-8707-070707070707',
    'clerk_seed_suspended_salesman',
    'bruno.almeida@example.test',
    'Bruno Almeida',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (id) DO UPDATE SET
  clerk_user_id = EXCLUDED.clerk_user_id,
  deleted_at = null,
  email = EXCLUDED.email,
  is_deleted = false,
  name = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO tenant_memberships (
  id,
  role_template_id,
  status,
  tenant_id,
  user_id
)
VALUES (
  '06060606-2222-4606-8606-060606060606',
  '55555555-5555-4555-8555-555555555555',
  'active',
  '77777777-7777-4777-8777-777777777778',
  '06060606-0606-4606-8606-060606060606'
)
ON CONFLICT (id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
  user_id = EXCLUDED.user_id,
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
    '02020202-3333-4202-8202-020202020203',
    '55555555-5555-4555-8555-555555555555',
    'active',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777',
    '02020202-0202-4202-8202-020202020202'
  ),
  (
    '05050505-3333-4505-8505-050505050505',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'active',
    '66666666-6666-4666-8666-666666666667',
    '77777777-7777-4777-8777-777777777777',
    '05050505-0505-4505-8505-050505050505'
  ),
  (
    '06060606-3333-4606-8606-060606060606',
    '55555555-5555-4555-8555-555555555555',
    'active',
    '66666666-6666-4666-8666-666666666668',
    '77777777-7777-4777-8777-777777777778',
    '06060606-0606-4606-8606-060606060606'
  ),
  (
    '07070707-3333-4707-8707-070707070707',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'suspended',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '07070707-0707-4707-8707-070707070707'
  )
ON CONFLICT (id) DO UPDATE SET
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  user_id = EXCLUDED.user_id,
  updated_at = now();

INSERT INTO identity_invitations (
  id,
  accepted_at,
  clerk_invitation_id,
  email,
  expires_at,
  invited_by_user_id,
  metadata,
  role_template_id,
  status,
  store_id,
  tenant_id
)
VALUES (
  '08080808-0808-4808-8808-080808080808',
  null,
  null,
  'larissa.gomes@example.test',
  date_trunc('day', now()) + interval '14 days',
  '02020202-0202-4202-8202-020202020202',
  '{"fixture":"local_seed","scenario":"pending_branch_invitation","provider_operation":"not_requested"}'::jsonb,
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'pending',
  '66666666-6666-4666-8666-666666666667',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  accepted_at = EXCLUDED.accepted_at,
  clerk_invitation_id = EXCLUDED.clerk_invitation_id,
  email = EXCLUDED.email,
  expires_at = EXCLUDED.expires_at,
  invited_by_user_id = EXCLUDED.invited_by_user_id,
  metadata = EXCLUDED.metadata,
  role_template_id = EXCLUDED.role_template_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO membership_permission_overrides (
  id,
  allowed,
  membership_id,
  permission_key,
  reason
)
VALUES
  (
    '15000000-0000-4000-8000-000000000001',
    true,
    (
      SELECT id
      FROM store_memberships
      WHERE store_id = '66666666-6666-4666-8666-666666666666'
        AND user_id = '04040404-0404-4404-8404-040404040404'
    ),
    'inventory.update_price',
    'Local seed: senior seller may negotiate and update advertised prices.'
  ),
  (
    '15000000-0000-4000-8000-000000000002',
    false,
    (
      SELECT id
      FROM store_memberships
      WHERE store_id = '66666666-6666-4666-8666-666666666666'
        AND user_id = '04040404-0404-4404-8404-040404040404'
    ),
    'inventory.create',
    'Local seed: stock intake remains a supervisor responsibility.'
  ),
  (
    '15000000-0000-4000-8000-000000000003',
    true,
    (
      SELECT id
      FROM store_memberships
      WHERE store_id = '66666666-6666-4666-8666-666666666667'
        AND user_id = '05050505-0505-4505-8505-050505050505'
    ),
    'inventory.update_price',
    'Local seed: branch salesperson owns day-to-day advertised price updates.'
  )
ON CONFLICT (membership_id, permission_key) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  reason = EXCLUDED.reason,
  updated_at = now();
