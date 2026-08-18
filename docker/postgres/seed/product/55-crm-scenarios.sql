-- Local product seed v2.
-- CRM pipeline and read-safe WhatsApp fixtures. No provider operation is implied.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO crm_pipelines (
  id, description, is_default, name, rotation_active, store_id, tenant_id
)
VALUES (
  '25000000-0000-4000-8000-000000000001',
  'Jornada da primeira resposta ate o fechamento, com reserva explicita.',
  true,
  'Vendas de veiculos',
  true,
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  deleted_at = null,
  description = EXCLUDED.description,
  is_default = EXCLUDED.is_default,
  is_deleted = false,
  name = EXCLUDED.name,
  rotation_active = EXCLUDED.rotation_active,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_pipeline_stages (
  id, color, is_system, lead_status, name, pipeline_id, sla_days,
  sort_order, status, store_id, tenant_id
)
VALUES
  ('25100000-0000-4000-8000-000000000001', '#2563eb', true, 'new', 'Novo interesse', '25000000-0000-4000-8000-000000000001', 1, 10, 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000002', '#0891b2', false, 'contacted', 'Primeiro contato', '25000000-0000-4000-8000-000000000001', 1, 20, 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000003', '#7c3aed', false, 'qualified', 'Qualificado', '25000000-0000-4000-8000-000000000001', 2, 30, 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000004', '#d97706', false, 'negotiating', 'Em negociacao', '25000000-0000-4000-8000-000000000001', 3, 40, 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000005', '#ea580c', false, 'negotiating', 'Reserva em andamento', '25000000-0000-4000-8000-000000000001', 2, 50, 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000006', '#16a34a', true, 'won', 'Venda concluida', '25000000-0000-4000-8000-000000000001', null, 60, 'won', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25100000-0000-4000-8000-000000000007', '#64748b', true, 'lost', 'Perdido', '25000000-0000-4000-8000-000000000001', null, 70, 'lost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  color = EXCLUDED.color,
  deleted_at = null,
  is_deleted = false,
  is_system = EXCLUDED.is_system,
  lead_status = EXCLUDED.lead_status,
  name = EXCLUDED.name,
  pipeline_id = EXCLUDED.pipeline_id,
  sla_days = EXCLUDED.sla_days,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

UPDATE leads
SET
  assigned_user_id = CASE id
    WHEN '20000000-0000-4000-8000-000000000001' THEN '04040404-0404-4404-8404-040404040404'::uuid
    WHEN '20000000-0000-4000-8000-000000000002' THEN '04040404-0404-4404-8404-040404040404'::uuid
    WHEN '20000000-0000-4000-8000-000000000003' THEN '03030303-0303-4303-8303-030303030303'::uuid
  END,
  pipeline_id = '25000000-0000-4000-8000-000000000001',
  pipeline_stage_id = CASE id
    WHEN '20000000-0000-4000-8000-000000000001' THEN '25100000-0000-4000-8000-000000000004'::uuid
    WHEN '20000000-0000-4000-8000-000000000002' THEN '25100000-0000-4000-8000-000000000005'::uuid
    WHEN '20000000-0000-4000-8000-000000000003' THEN '25100000-0000-4000-8000-000000000006'::uuid
  END,
  status = CASE id
    WHEN '20000000-0000-4000-8000-000000000001' THEN 'negotiating'::lead_status
    WHEN '20000000-0000-4000-8000-000000000002' THEN 'negotiating'::lead_status
    WHEN '20000000-0000-4000-8000-000000000003' THEN 'won'::lead_status
  END,
  updated_at = now()
WHERE id IN (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003'
);

INSERT INTO crm_tags (
  id, color, connection_id, emoji, name, sort_order, store_id, tenant_id
)
VALUES
  ('25200000-0000-4000-8000-000000000001', '#2563eb', '24000000-0000-4000-8000-000000000101', '💬', 'Atendimento ativo', 10, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25200000-0000-4000-8000-000000000002', '#7c3aed', '24000000-0000-4000-8000-000000000101', '🚗', 'Visita agendada', 20, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25200000-0000-4000-8000-000000000003', '#ea580c', '24000000-0000-4000-8000-000000000101', '📝', 'Reserva ativa', 30, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('25200000-0000-4000-8000-000000000004', '#16a34a', '24000000-0000-4000-8000-000000000101', '🤝', 'Cliente da loja', 40, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  color = EXCLUDED.color,
  connection_id = EXCLUDED.connection_id,
  emoji = EXCLUDED.emoji,
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO contacts (
  id, display_name, primary_phone, metadata, store_id, tenant_id
)
VALUES
  ('26800000-0000-4000-8000-000000000001', 'Ana Silva', '5511988881111', '{"fixture": true, "source": "local_seed"}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26800000-0000-4000-8000-000000000002', 'Marcos Lima', '5511977772222', '{"fixture": true, "source": "local_seed"}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26800000-0000-4000-8000-000000000003', 'Carla Rocha', '5511966663333', '{"fixture": true, "source": "local_seed"}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  primary_phone = EXCLUDED.primary_phone,
  metadata = EXCLUDED.metadata,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO opportunities (
  id, assigned_user_id, contact_id, last_interaction_at, legacy_lead_id,
  metadata, source, stage_key, state, store_id, tenant_id
)
VALUES
  ('26900000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', '26800000-0000-4000-8000-000000000001', now() - interval '2 hours', '20000000-0000-4000-8000-000000000001', '{"fixture": true, "source": "local_seed"}'::jsonb, 'site', 'negotiating', 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26900000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', '26800000-0000-4000-8000-000000000002', now() - interval '20 hours', '20000000-0000-4000-8000-000000000002', '{"fixture": true, "source": "local_seed"}'::jsonb, 'manual', 'negotiating', 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26900000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', '26800000-0000-4000-8000-000000000003', now() - interval '11 days', '20000000-0000-4000-8000-000000000003', '{"fixture": true, "source": "local_seed"}'::jsonb, 'manual', 'won', 'won', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  contact_id = EXCLUDED.contact_id,
  last_interaction_at = EXCLUDED.last_interaction_at,
  legacy_lead_id = EXCLUDED.legacy_lead_id,
  metadata = EXCLUDED.metadata,
  source = EXCLUDED.source,
  stage_key = EXCLUDED.stage_key,
  state = EXCLUDED.state,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_conversation_threads (
  id, channel, channel_metadata, contact_id, customer_display_name,
  customer_phone, external_thread_id, last_message_at, metadata,
  provider_connection_id, source, state, store_id, tenant_id
)
VALUES
  ('26000000-0000-4000-8000-000000000001', 'whatsapp', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '26800000-0000-4000-8000-000000000001', 'Ana Silva', '5511988881111', 'phone:5511988881111', now() - interval '2 hours', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, '24000000-0000-4000-8000-000000000101', 'public_site', 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26000000-0000-4000-8000-000000000002', 'whatsapp', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '26800000-0000-4000-8000-000000000002', 'Marcos Lima', '5511977772222', 'phone:5511977772222', now() - interval '20 hours', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "scenario": "parallel_reservation_release"}'::jsonb, '24000000-0000-4000-8000-000000000101', 'whatsapp', 'open', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26000000-0000-4000-8000-000000000003', 'whatsapp', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '26800000-0000-4000-8000-000000000003', 'Carla Rocha', '5511966663333', 'phone:5511966663333', now() - interval '11 days', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, '24000000-0000-4000-8000-000000000101', 'manual', 'resolved', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  channel_metadata = EXCLUDED.channel_metadata,
  contact_id = EXCLUDED.contact_id,
  customer_display_name = EXCLUDED.customer_display_name,
  customer_phone = EXCLUDED.customer_phone,
  external_thread_id = EXCLUDED.external_thread_id,
  last_message_at = EXCLUDED.last_message_at,
  metadata = EXCLUDED.metadata,
  provider_connection_id = EXCLUDED.provider_connection_id,
  source = EXCLUDED.source,
  state = EXCLUDED.state,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_conversation_cycles (
  id, assigned_user_id, closed_at, first_handled_at, fresh_lead_at,
  last_customer_read_at, last_message_at, last_message_content, last_read_at,
  message_count, metadata, opportunity_id, state, thread_id, store_id, tenant_id
)
VALUES
  ('26600000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', null, now() - interval '2 hours 50 minutes', now() - interval '3 hours', now() - interval '2 hours 15 minutes', now() - interval '2 hours', 'Pode separar a simulacao para a visita de amanha?', now() - interval '2 hours 10 minutes', 3, '{"fixture": true, "source": "local_seed"}'::jsonb, '26900000-0000-4000-8000-000000000001', 'active', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26600000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', null, now() - interval '1 day 1 hour', now() - interval '1 day 2 hours', null, now() - interval '20 hours', 'Vou confirmar qual reserva manter depois da avaliacao.', now() - interval '21 hours', 4, '{"fixture": true, "source": "local_seed"}'::jsonb, '26900000-0000-4000-8000-000000000002', 'active', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26600000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', now() - interval '11 days', now() - interval '13 days', now() - interval '14 days', now() - interval '11 days', now() - interval '11 days', 'Atendimento local encerrado sem envio pelo provedor.', now() - interval '11 days', 2, '{"fixture": true, "source": "local_seed"}'::jsonb, '26900000-0000-4000-8000-000000000003', 'completed', '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  closed_at = EXCLUDED.closed_at,
  first_handled_at = EXCLUDED.first_handled_at,
  fresh_lead_at = EXCLUDED.fresh_lead_at,
  last_customer_read_at = EXCLUDED.last_customer_read_at,
  last_message_at = EXCLUDED.last_message_at,
  last_message_content = EXCLUDED.last_message_content,
  last_read_at = EXCLUDED.last_read_at,
  message_count = EXCLUDED.message_count,
  metadata = EXCLUDED.metadata,
  opportunity_id = EXCLUDED.opportunity_id,
  state = EXCLUDED.state,
  thread_id = EXCLUDED.thread_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_conversation_attendances (
  id, assigned_at, assigned_user_id, changed_at, cycle_id,
  handling_started_at, history_started_at, state, state_version,
  thread_id, store_id, tenant_id
)
VALUES
  ('26700000-0000-4000-8000-000000000001', now() - interval '2 hours 55 minutes', '04040404-0404-4404-8404-040404040404', now() - interval '2 hours 50 minutes', '26600000-0000-4000-8000-000000000001', now() - interval '2 hours 50 minutes', now() - interval '3 hours', 'human_active', 1, '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26700000-0000-4000-8000-000000000002', now() - interval '1 day 1 hour', '04040404-0404-4404-8404-040404040404', now() - interval '1 day 1 hour', '26600000-0000-4000-8000-000000000002', null, now() - interval '1 day 2 hours', 'bot_active', 0, '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26700000-0000-4000-8000-000000000003', now() - interval '13 days', '03030303-0303-4303-8303-030303030303', now() - interval '11 days', '26600000-0000-4000-8000-000000000003', null, now() - interval '14 days', 'bot_active', 0, '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_at = EXCLUDED.assigned_at,
  assigned_user_id = EXCLUDED.assigned_user_id,
  changed_at = EXCLUDED.changed_at,
  cycle_id = EXCLUDED.cycle_id,
  handling_started_at = EXCLUDED.handling_started_at,
  history_started_at = EXCLUDED.history_started_at,
  state = EXCLUDED.state,
  state_version = EXCLUDED.state_version,
  thread_id = EXCLUDED.thread_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_messages (
  id, created_at, content, cycle_id, direction, message_type, metadata,
  occurred_at, provider, provider_connection_id, sender, sender_origin,
  status, thread_id, store_id, tenant_id
)
VALUES
  ('26100000-0000-4000-8000-000000000001', now() - interval '3 hours', 'Tenho interesse no Audi e gostaria de avaliar meu usado.', '26600000-0000-4000-8000-000000000001', 'inbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, now() - interval '3 hours', 'zapi', '24000000-0000-4000-8000-000000000101', 'customer', 'customer', 'delivered', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000002', now() - interval '2 hours 40 minutes', 'Separei os dados do veiculo e a agenda para o test drive.', '26600000-0000-4000-8000-000000000001', 'outbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, now() - interval '2 hours 40 minutes', 'zapi', '24000000-0000-4000-8000-000000000101', 'human', 'human_crm', 'pending', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000003', now() - interval '2 hours', 'Pode separar a simulacao para a visita de amanha?', '26600000-0000-4000-8000-000000000001', 'inbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, now() - interval '2 hours', 'zapi', '24000000-0000-4000-8000-000000000101', 'customer', 'customer', 'delivered', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000004', now() - interval '1 day 2 hours', 'Quero comparar as condicoes das duas unidades reservadas.', '26600000-0000-4000-8000-000000000002', 'inbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, now() - interval '1 day 2 hours', 'zapi', '24000000-0000-4000-8000-000000000101', 'customer', 'customer', 'delivered', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000005', now() - interval '1 day 1 hour', 'As reservas estao registradas apenas como sinais pendentes.', '26600000-0000-4000-8000-000000000002', 'outbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, now() - interval '1 day 1 hour', 'zapi', '24000000-0000-4000-8000-000000000101', 'human', 'human_crm', 'pending', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000006', now() - interval '21 hours', 'A reserva pode ser liberada sem operacao no provedor.', '26600000-0000-4000-8000-000000000002', 'outbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, now() - interval '21 hours', 'zapi', '24000000-0000-4000-8000-000000000101', 'system', 'system', 'pending', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000007', now() - interval '20 hours', 'Vou confirmar qual reserva manter depois da avaliacao.', '26600000-0000-4000-8000-000000000002', 'inbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, now() - interval '20 hours', 'zapi', '24000000-0000-4000-8000-000000000101', 'customer', 'customer', 'delivered', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000008', now() - interval '12 days', 'Preparar o acompanhamento pos-venda no cadastro local.', '26600000-0000-4000-8000-000000000003', 'outbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, now() - interval '12 days', 'zapi', '24000000-0000-4000-8000-000000000101', 'human', 'human_crm', 'pending', '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26100000-0000-4000-8000-000000000009', now() - interval '11 days', 'Atendimento local encerrado sem envio pelo provedor.', '26600000-0000-4000-8000-000000000003', 'outbound', 'text', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, now() - interval '11 days', 'zapi', '24000000-0000-4000-8000-000000000101', 'system', 'system', 'pending', '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  created_at = EXCLUDED.created_at,
  cycle_id = EXCLUDED.cycle_id,
  direction = EXCLUDED.direction,
  message_type = EXCLUDED.message_type,
  metadata = EXCLUDED.metadata,
  occurred_at = EXCLUDED.occurred_at,
  provider = EXCLUDED.provider,
  provider_connection_id = EXCLUDED.provider_connection_id,
  sender = EXCLUDED.sender,
  sender_origin = EXCLUDED.sender_origin,
  status = EXCLUDED.status,
  thread_id = EXCLUDED.thread_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_conversation_thread_tags (
  id, thread_id, store_id, tag_id, tenant_id
)
VALUES
  ('26200000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000003', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000004', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000003', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000005', '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000004', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (thread_id, tag_id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_campaigns (
  id, content, created_by_user_id, initial_tag_id, interval_minutes,
  metadata, name, reply_tag_id, scheduled_end_at, scheduled_start_at,
  secondary_content, secondary_delay_minutes, selected_connection_id,
  status, store_id, tenant_id, total_recipients
)
VALUES
  ('26300000-0000-4000-8000-000000000001', 'Ola {{firstName}}, se quiser podemos revisar sua proposta na loja.', '04040404-0404-4404-8404-040404040404', '25200000-0000-4000-8000-000000000001', 5, '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false}'::jsonb, 'Rascunho de retorno de propostas', '25200000-0000-4000-8000-000000000002', now() + interval '11 days', now() + interval '10 days', 'Este e apenas um lembrete em rascunho.', 1440, '24000000-0000-4000-8000-000000000101', 'draft', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 2),
  ('26300000-0000-4000-8000-000000000002', 'Convite local cancelado antes de qualquer envio.', '03030303-0303-4303-8303-030303030303', '25200000-0000-4000-8000-000000000004', 10, '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false, "cancelReason": "fixture_review"}'::jsonb, 'Campanha cancelada de pos-venda', null, now() + interval '8 days', now() + interval '7 days', null, 60, '24000000-0000-4000-8000-000000000101', 'cancelled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  created_by_user_id = EXCLUDED.created_by_user_id,
  failed_count = 0,
  initial_tag_id = EXCLUDED.initial_tag_id,
  interval_minutes = EXCLUDED.interval_minutes,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  replied_count = 0,
  reply_tag_id = EXCLUDED.reply_tag_id,
  scheduled_count = 0,
  scheduled_end_at = EXCLUDED.scheduled_end_at,
  scheduled_start_at = EXCLUDED.scheduled_start_at,
  secondary_content = EXCLUDED.secondary_content,
  secondary_delay_minutes = EXCLUDED.secondary_delay_minutes,
  secondary_sent_count = 0,
  selected_connection_id = EXCLUDED.selected_connection_id,
  sent_count = 0,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  total_recipients = EXCLUDED.total_recipients,
  updated_at = now();

INSERT INTO crm_campaign_recipients (
  id, campaign_id, connection_id, lead_id, recipient_address, sequence, thread_id,
  status, store_id, tenant_id, variables
)
VALUES
  ('26400000-0000-4000-8000-000000000001', '26300000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000001', '+5511988881111', 1, '26000000-0000-4000-8000-000000000001', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Ana", "fixture": true, "officialOperation": false}'::jsonb),
  ('26400000-0000-4000-8000-000000000002', '26300000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000002', '+5511977772222', 2, '26000000-0000-4000-8000-000000000002', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Marcos", "fixture": true, "officialOperation": false}'::jsonb),
  ('26400000-0000-4000-8000-000000000003', '26300000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000003', '+5511966663333', 1, '26000000-0000-4000-8000-000000000003', 'cancelled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Carla", "fixture": true, "officialOperation": false}'::jsonb)
ON CONFLICT (campaign_id, thread_id) DO UPDATE SET
  connection_id = EXCLUDED.connection_id,
  error_message = null,
  initial_scheduled_message_id = null,
  initial_sent_at = null,
  lead_id = EXCLUDED.lead_id,
  recipient_address = EXCLUDED.recipient_address,
  reply_content_preview = null,
  reply_message_id = null,
  reply_received_at = null,
  secondary_scheduled_message_id = null,
  secondary_sent_at = null,
  sent_message_id = null,
  sequence = EXCLUDED.sequence,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  variables = EXCLUDED.variables,
  updated_at = now();

UPDATE crm_campaign_recipients
SET recipient_address = regexp_replace(recipient_address, '[^0-9]', '', 'g'), updated_at = now()
WHERE id IN (
  '26400000-0000-4000-8000-000000000001',
  '26400000-0000-4000-8000-000000000002',
  '26400000-0000-4000-8000-000000000003'
);

INSERT INTO crm_scheduled_messages (
  id, cancelled_at, campaign_id, campaign_message_type,
  campaign_recipient_key, campaign_sequence, connection_id,
  created_by_user_id, metadata, recipient_address, scheduled_at, cycle_id, thread_id, status,
  store_id, tenant_id, content
)
VALUES
  ('26500000-0000-4000-8000-000000000001', now() - interval '2 days', '26300000-0000-4000-8000-000000000002', 'initial', '26400000-0000-4000-8000-000000000003', 1, '24000000-0000-4000-8000-000000000101', '03030303-0303-4303-8303-030303030303', '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false}'::jsonb, '+5511966663333', now() + interval '7 days', '26600000-0000-4000-8000-000000000003', '26000000-0000-4000-8000-000000000003', 'cancelled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Mensagem cancelada antes do horario previsto.'),
  ('26500000-0000-4000-8000-000000000002', null, null, null, null, null, '24000000-0000-4000-8000-000000000101', '04040404-0404-4404-8404-040404040404', '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false, "scenario": "future_not_due"}'::jsonb, '+5511988881111', now() + interval '14 days', '26600000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Lembrete local futuro para revisar a proposta na visita.')
ON CONFLICT (id) DO UPDATE SET
  cancelled_at = EXCLUDED.cancelled_at,
  campaign_id = EXCLUDED.campaign_id,
  campaign_message_type = EXCLUDED.campaign_message_type,
  campaign_recipient_key = EXCLUDED.campaign_recipient_key,
  campaign_sequence = EXCLUDED.campaign_sequence,
  connection_id = EXCLUDED.connection_id,
  created_by_user_id = EXCLUDED.created_by_user_id,
  error_message = null,
  metadata = EXCLUDED.metadata,
  recipient_address = EXCLUDED.recipient_address,
  scheduled_at = EXCLUDED.scheduled_at,
  cycle_id = EXCLUDED.cycle_id,
  sent_at = null,
  sent_message_id = null,
  thread_id = EXCLUDED.thread_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  content = EXCLUDED.content,
  updated_at = now();

UPDATE crm_scheduled_messages
SET recipient_address = regexp_replace(recipient_address, '[^0-9]', '', 'g'), updated_at = now()
WHERE id IN (
  '26500000-0000-4000-8000-000000000001',
  '26500000-0000-4000-8000-000000000002'
);
