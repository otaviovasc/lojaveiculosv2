-- Local product seed v2.
-- Leads, visits, pipelines, and CRM sandbox references.
-- Included by ../product-test-user.sql inside one transaction.

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
  ('20000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', 'ana.silva@example.com', 'Ana Silva', '+5511988881111', now() - interval '2 hours', '{"fixture": true, "score": 82, "channel": "site", "budgetCents": 13000000}'::jsonb, 'public_site', 'negotiating', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('20000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', 'marcos.lima@example.com', 'Marcos Lima', '+5511977772222', now() - interval '1 day', '{"fixture": true, "score": 68, "channel": "whatsapp", "budgetCents": 10000000}'::jsonb, 'whatsapp', 'qualified', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('20000000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', 'carla.rocha@example.com', 'Carla Rocha', '+5511966663333', now() - interval '12 days', '{"fixture": true, "score": 91, "channel": "loja", "payment": "financing"}'::jsonb, 'manual', 'won', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  buyer_email = EXCLUDED.buyer_email,
  buyer_name = EXCLUDED.buyer_name,
  buyer_phone = EXCLUDED.buyer_phone,
  last_interaction_at = EXCLUDED.last_interaction_at,
  metadata = EXCLUDED.metadata,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  ('21000000-0000-4000-8000-000000000001', 'whatsapp', 'Cliente pediu simulacao com entrada de R$ 40.000.', '04040404-0404-4404-8404-040404040404', 'outbound', '20000000-0000-4000-8000-000000000001', now() - interval '2 hours', 2, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('21000000-0000-4000-8000-000000000002', 'call', 'Ligacao agendada para validar troca no usado.', '04040404-0404-4404-8404-040404040404', 'internal', '20000000-0000-4000-8000-000000000002', now() - interval '1 day', 1, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('21000000-0000-4000-8000-000000000003', 'status_change', 'Lead convertido em venda.', '03030303-0303-4303-8303-030303030303', 'internal', '20000000-0000-4000-8000-000000000003', now() - interval '12 days', 3, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  activity_type = EXCLUDED.activity_type,
  content = EXCLUDED.content,
  created_by_user_id = EXCLUDED.created_by_user_id,
  direction = EXCLUDED.direction,
  lead_id = EXCLUDED.lead_id,
  occurred_at = EXCLUDED.occurred_at,
  priority = EXCLUDED.priority,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  ('23000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', '20000000-0000-4000-8000-000000000001', 'Test drive do Audi A4 com avaliacao de troca.', now() + interval '1 day', 'scheduled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('23000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', '20000000-0000-4000-8000-000000000002', 'Enviar proposta de financiamento antes da visita.', now() + interval '3 days', 'scheduled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  lead_id = EXCLUDED.lead_id,
  notes = EXCLUDED.notes,
  scheduled_at = EXCLUDED.scheduled_at,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_connections (
  id,
  credentials_ref,
  display_name,
  external_connection_id,
  external_instance_id,
  metadata,
  phone,
  provider,
  status,
  store_id,
  tenant_id,
  webhook_url
)
VALUES (
  '24000000-0000-4000-8000-000000000101',
  '{
    "mode": "env",
    "env": {
      "apiBaseUrl": "CRM_ZAPI_API_BASE_URL",
      "instanceId": "CRM_ZAPI_TEST_INSTANCE_ID",
      "instanceToken": "CRM_ZAPI_TEST_INSTANCE_TOKEN",
      "clientToken": "CRM_ZAPI_TEST_CLIENT_TOKEN"
    }
  }'::jsonb,
  'ZAPI Test Connection',
  null,
  null,
  '{
    "fixture": true,
    "officialOperation": false,
    "purpose": "crm_whatsapp_migration_rehearsal",
    "migrationUnit": "test-store-zapi",
    "runRealE2EFlag": "RUN_ZAPI_E2E",
    "safeToReset": true,
    "source": "local_seed"
  }'::jsonb,
  null,
  'zapi',
  'sandbox',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  null
)
ON CONFLICT (store_id, provider, display_name) DO UPDATE SET
  credentials_ref = EXCLUDED.credentials_ref,
  external_connection_id = EXCLUDED.external_connection_id,
  external_instance_id = EXCLUDED.external_instance_id,
  metadata = EXCLUDED.metadata,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  webhook_url = EXCLUDED.webhook_url,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM crm_connections
    WHERE id = '24000000-0000-4000-8000-000000000101'
      AND store_id = '66666666-6666-4666-8666-666666666666'
      AND provider = 'zapi'
      AND display_name = 'ZAPI Test Connection'
  ) THEN
    RAISE EXCEPTION 'seed CRM collision: the shared ZAPI fixture must use its canonical connection id; run pnpm run db:reset';
  END IF;
END
$$;

-- Seed v1 used processed provider-like sync events. Remove only those fixture ids;
-- real sandbox evidence is created by the explicit ZAPI rehearsal command.
DELETE FROM crm_sync_events
WHERE id IN (
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000002'
);
