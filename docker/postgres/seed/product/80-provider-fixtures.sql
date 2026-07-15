-- Local product seed v2.
-- External API configuration and truthful degraded provider fixtures.
-- No row in this file claims that an official provider operation occurred.

-- Remove obsolete operational-success fixtures from seed v1 without touching
-- developer-created or real sandbox evidence.
DELETE FROM api_webhook_deliveries
WHERE id = '75000000-0000-4000-8000-000000000001';

DELETE FROM api_idempotency_keys
WHERE id = '73000000-0000-4000-8000-000000000001';

DELETE FROM api_request_logs
WHERE id IN (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

DELETE FROM provider_events
WHERE id IN (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002'
);

INSERT INTO api_clients (id, name, scopes, status, store_id, tenant_id)
VALUES (
  '70000000-0000-4000-8000-000000000001',
  'ERP de homologacao (chave revogada)',
  '["inventory.read", "lead.create", "lead.read"]'::jsonb,
  'suspended',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  scopes = EXCLUDED.scopes,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO api_client_keys (
  id, client_id, expires_at, key_hash, key_prefix, revoked_at
)
VALUES (
  '71000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  now() + interval '90 days',
  'seeded-local-key-hash-do-not-use',
  'lv_seed',
  now()
)
ON CONFLICT (key_hash) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  expires_at = EXCLUDED.expires_at,
  key_prefix = EXCLUDED.key_prefix,
  revoked_at = EXCLUDED.revoked_at,
  updated_at = now();

INSERT INTO api_webhooks (
  id, client_id, events, status, store_id, target_url, tenant_id
)
VALUES (
  '74000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '["lead.created", "vehicle.updated"]'::jsonb,
  'paused',
  '66666666-6666-4666-8666-666666666666',
  'https://erp.homologacao.example/webhooks/lojaveiculos',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  events = EXCLUDED.events,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  target_url = EXCLUDED.target_url,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO integration_accounts (
  id, config, provider, status, store_id, tenant_id
)
VALUES
  (
    '80000000-0000-4000-8000-000000000001',
    '{"accountName":"Horizonte OLX","credentialStatus":"not_configured","fixture":true,"officialOperation":false,"seedVersion":2}'::jsonb,
    'olx',
    'inactive',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '{"accountName":"Horizonte Mercado Livre","credentialStatus":"validation_failed","fixture":true,"officialOperation":false,"seedVersion":2}'::jsonb,
    'mercado_livre',
    'error',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (store_id, provider) DO UPDATE SET
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('80000000-0000-4000-8000-000000000001'::uuid, 'olx'),
        ('80000000-0000-4000-8000-000000000002'::uuid, 'mercado_livre')
    ) AS expected(id, provider)
    LEFT JOIN integration_accounts actual
      ON actual.id = expected.id
      AND actual.store_id = '66666666-6666-4666-8666-666666666666'
      AND actual.provider = expected.provider
    WHERE actual.id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed provider collision: marketplace fixtures must use canonical account ids; run pnpm run db:reset';
  END IF;
END
$$;

INSERT INTO integration_jobs (
  id, account_id, completed_at, error_message, job_type, metadata,
  status, store_id, tenant_id
)
VALUES
  (
    '81000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    now() - interval '45 minutes',
    'Sincronizacao cancelada: credenciais de homologacao nao configuradas',
    'inventory_sync',
    '{"fixture":true,"officialOperation":false,"published":0}'::jsonb,
    'cancelled',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000002',
    now() - interval '30 minutes',
    'Credenciais de homologacao pendentes de validacao',
    'inventory_sync',
    '{"failed":1,"fixture":true,"officialOperation":false,"published":0}'::jsonb,
    'failed',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (id) DO UPDATE SET
  account_id = EXCLUDED.account_id,
  completed_at = EXCLUDED.completed_at,
  error_message = EXCLUDED.error_message,
  job_type = EXCLUDED.job_type,
  metadata = EXCLUDED.metadata,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO vehicle_provider_listings (
  id, account_id, external_id, listing_id, metadata, store_id, tenant_id
)
VALUES
  (
    '82000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    null,
    '10000000-0000-4000-8000-000000000001',
    '{"fixture":true,"officialOperation":false,"status":"not_submitted"}'::jsonb,
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000001',
    null,
    '10000000-0000-4000-8000-000000000002',
    '{"fixture":true,"officialOperation":false,"status":"blocked_missing_credentials"}'::jsonb,
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (account_id, listing_id) DO UPDATE SET
  external_id = EXCLUDED.external_id,
  metadata = EXCLUDED.metadata,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO fiscal_documents (
  id, access_key, document_type, issued_at, metadata, provider,
  provider_document_id, status, store_id, tenant_id
)
VALUES
  (
    '90000000-0000-4000-8000-000000000001',
    null,
    'nfe_sale',
    null,
    '{"environment":"homologation","fixture":true,"officialOperation":false,"saleId":"30000000-0000-4000-8000-000000000001"}'::jsonb,
    'spedy',
    null,
    'draft',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    null,
    'nfe_sale',
    null,
    '{"environment":"homologation","fixture":true,"officialOperation":false,"reason":"Dados fiscais incompletos"}'::jsonb,
    'spedy',
    null,
    'failed',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (id) DO UPDATE SET
  access_key = EXCLUDED.access_key,
  document_type = EXCLUDED.document_type,
  issued_at = EXCLUDED.issued_at,
  metadata = EXCLUDED.metadata,
  provider = EXCLUDED.provider,
  provider_document_id = EXCLUDED.provider_document_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO fiscal_document_links (
  id, fiscal_document_id, store_id, target_id, target_type, tenant_id
)
VALUES (
  '91000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000001',
  '66666666-6666-4666-8666-666666666666',
  '30000000-0000-4000-8000-000000000001',
  'sale',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  fiscal_document_id = EXCLUDED.fiscal_document_id,
  store_id = EXCLUDED.store_id,
  target_id = EXCLUDED.target_id,
  target_type = EXCLUDED.target_type,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO fiscal_events (
  id, event_type, fiscal_document_id, metadata, occurred_at, store_id, tenant_id
)
VALUES
  (
    '92000000-0000-4000-8000-000000000001',
    'draft_saved',
    '90000000-0000-4000-8000-000000000001',
    '{"fixture":true,"officialOperation":false}'::jsonb,
    now() - interval '10 days',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    'validation_failed',
    '90000000-0000-4000-8000-000000000002',
    '{"code":"LOCAL_REQUIRED_FIELDS","fixture":true,"officialOperation":false}'::jsonb,
    now() - interval '9 days',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777'
  )
ON CONFLICT (id) DO UPDATE SET
  event_type = EXCLUDED.event_type,
  fiscal_document_id = EXCLUDED.fiscal_document_id,
  metadata = EXCLUDED.metadata,
  occurred_at = EXCLUDED.occurred_at,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
