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

INSERT INTO crm_whatsapp_sessions (
  id, assigned_user_id, buyer_name, buyer_phone, channel, channel_metadata,
  connection_id, first_handled_at, fresh_lead_at, human_takeover_at,
  last_assigned_at, last_customer_read_at, last_message_at,
  last_message_content, last_read_at, lead_id, message_count, metadata,
  source, status, store_id, tenant_id
)
VALUES
  ('26000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', 'Ana Silva', '+5511988881111', 'WHATSAPP', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '24000000-0000-4000-8000-000000000101', now() - interval '2 hours 50 minutes', now() - interval '3 hours', now() - interval '2 hours 50 minutes', now() - interval '2 hours 55 minutes', now() - interval '2 hours 15 minutes', now() - interval '2 hours', 'Pode separar a simulacao para a visita de amanha?', now() - interval '2 hours 10 minutes', '20000000-0000-4000-8000-000000000001', 3, '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'public_site', 'HUMAN_TAKEOVER', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', 'Marcos Lima', '+5511977772222', 'WHATSAPP', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '24000000-0000-4000-8000-000000000101', now() - interval '1 day 1 hour', now() - interval '1 day 2 hours', null, now() - interval '1 day 1 hour', null, now() - interval '20 hours', 'Vou confirmar qual reserva manter depois da avaliacao.', now() - interval '21 hours', '20000000-0000-4000-8000-000000000002', 4, '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "scenario": "parallel_reservation_release"}'::jsonb, 'whatsapp', 'ACTIVE', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('26000000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', 'Carla Rocha', '+5511966663333', 'WHATSAPP', '{"fixture": true, "source": "local_seed", "officialOperation": false}'::jsonb, '24000000-0000-4000-8000-000000000101', now() - interval '13 days', now() - interval '14 days', null, now() - interval '13 days', now() - interval '11 days', now() - interval '11 days', 'Atendimento local encerrado sem envio pelo provedor.', now() - interval '11 days', '20000000-0000-4000-8000-000000000003', 2, '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'manual', 'COMPLETED', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  assigned_user_id = EXCLUDED.assigned_user_id,
  buyer_chat_lid = null,
  buyer_name = EXCLUDED.buyer_name,
  buyer_phone = EXCLUDED.buyer_phone,
  channel = EXCLUDED.channel,
  channel_external_id = null,
  channel_metadata = EXCLUDED.channel_metadata,
  connection_id = EXCLUDED.connection_id,
  external_session_id = null,
  first_handled_at = EXCLUDED.first_handled_at,
  fresh_lead_at = EXCLUDED.fresh_lead_at,
  human_takeover_at = EXCLUDED.human_takeover_at,
  last_assigned_at = EXCLUDED.last_assigned_at,
  last_customer_read_at = EXCLUDED.last_customer_read_at,
  last_message_at = EXCLUDED.last_message_at,
  last_message_content = EXCLUDED.last_message_content,
  last_read_at = EXCLUDED.last_read_at,
  lead_id = EXCLUDED.lead_id,
  message_count = EXCLUDED.message_count,
  metadata = EXCLUDED.metadata,
  profile_photo_url = null,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

UPDATE crm_whatsapp_sessions
SET
  buyer_phone = regexp_replace(buyer_phone, '[^0-9]', '', 'g'),
  updated_at = now()
WHERE id IN (
  '26000000-0000-4000-8000-000000000001',
  '26000000-0000-4000-8000-000000000002',
  '26000000-0000-4000-8000-000000000003'
);

INSERT INTO crm_whatsapp_messages (
  id, created_at, channel, connection_id, content, direction, metadata,
  sender_type, session_id, status, store_id, tenant_id, type
)
VALUES
  ('26100000-0000-4000-8000-000000000001', now() - interval '3 hours', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Tenho interesse no Audi e gostaria de avaliar meu usado.', 'INBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, 'CUSTOMER', '26000000-0000-4000-8000-000000000001', 'DELIVERED', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000002', now() - interval '2 hours 40 minutes', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Separei os dados do veiculo e a agenda para o test drive.', 'OUTBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'HUMAN', '26000000-0000-4000-8000-000000000001', 'PENDING', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000003', now() - interval '2 hours', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Pode separar a simulacao para a visita de amanha?', 'INBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, 'CUSTOMER', '26000000-0000-4000-8000-000000000001', 'DELIVERED', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000004', now() - interval '1 day 2 hours', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Quero comparar as condicoes das duas unidades reservadas.', 'INBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, 'CUSTOMER', '26000000-0000-4000-8000-000000000002', 'DELIVERED', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000005', now() - interval '1 day 1 hour', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'As reservas estao registradas apenas como sinais pendentes.', 'OUTBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'HUMAN', '26000000-0000-4000-8000-000000000002', 'PENDING', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000006', now() - interval '21 hours', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'A reserva pode ser liberada sem operacao no provedor.', 'OUTBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'SYSTEM', '26000000-0000-4000-8000-000000000002', 'PENDING', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000007', now() - interval '20 hours', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Vou confirmar qual reserva manter depois da avaliacao.', 'INBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false, "ingestEvidence": "local_fixture"}'::jsonb, 'CUSTOMER', '26000000-0000-4000-8000-000000000002', 'DELIVERED', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000008', now() - interval '12 days', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Preparar o acompanhamento pos-venda no cadastro local.', 'OUTBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'HUMAN', '26000000-0000-4000-8000-000000000003', 'PENDING', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT'),
  ('26100000-0000-4000-8000-000000000009', now() - interval '11 days', 'WHATSAPP', '24000000-0000-4000-8000-000000000101', 'Atendimento local encerrado sem envio pelo provedor.', 'OUTBOUND', '{"fixture": true, "source": "local_seed", "officialOperation": false, "deliveryEvidence": false}'::jsonb, 'SYSTEM', '26000000-0000-4000-8000-000000000003', 'PENDING', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'TEXT')
ON CONFLICT (id) DO UPDATE SET
  channel = EXCLUDED.channel,
  connection_id = EXCLUDED.connection_id,
  content = EXCLUDED.content,
  created_at = EXCLUDED.created_at,
  direction = EXCLUDED.direction,
  external_id = null,
  channel_message_id = null,
  metadata = EXCLUDED.metadata,
  provider_timestamp = null,
  sender_type = EXCLUDED.sender_type,
  session_id = EXCLUDED.session_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  updated_at = now();

INSERT INTO crm_whatsapp_session_tags (
  id, session_id, store_id, tag_id, tenant_id
)
VALUES
  ('26200000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000003', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000004', '26000000-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000003', '77777777-7777-4777-8777-777777777777'),
  ('26200000-0000-4000-8000-000000000005', '26000000-0000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '25200000-0000-4000-8000-000000000004', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (session_id, tag_id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO crm_whatsapp_campaigns (
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

INSERT INTO crm_whatsapp_campaign_recipients (
  id, campaign_id, connection_id, lead_id, phone, sequence, session_id,
  status, store_id, tenant_id, variables
)
VALUES
  ('26400000-0000-4000-8000-000000000001', '26300000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000001', '+5511988881111', 1, '26000000-0000-4000-8000-000000000001', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Ana", "fixture": true, "officialOperation": false}'::jsonb),
  ('26400000-0000-4000-8000-000000000002', '26300000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000002', '+5511977772222', 2, '26000000-0000-4000-8000-000000000002', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Marcos", "fixture": true, "officialOperation": false}'::jsonb),
  ('26400000-0000-4000-8000-000000000003', '26300000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000003', '+5511966663333', 1, '26000000-0000-4000-8000-000000000003', 'cancelled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '{"firstName": "Carla", "fixture": true, "officialOperation": false}'::jsonb)
ON CONFLICT (campaign_id, session_id) DO UPDATE SET
  connection_id = EXCLUDED.connection_id,
  error_message = null,
  initial_scheduled_message_id = null,
  initial_sent_at = null,
  lead_id = EXCLUDED.lead_id,
  phone = EXCLUDED.phone,
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

UPDATE crm_whatsapp_campaign_recipients
SET phone = regexp_replace(phone, '[^0-9]', '', 'g'), updated_at = now()
WHERE id IN (
  '26400000-0000-4000-8000-000000000001',
  '26400000-0000-4000-8000-000000000002',
  '26400000-0000-4000-8000-000000000003'
);

INSERT INTO crm_whatsapp_scheduled_messages (
  id, cancelled_at, campaign_id, campaign_message_type,
  campaign_recipient_key, campaign_sequence, connection_id,
  created_by_user_id, metadata, phone, scheduled_at, session_id, status,
  store_id, tenant_id, text
)
VALUES
  ('26500000-0000-4000-8000-000000000001', now() - interval '2 days', '26300000-0000-4000-8000-000000000002', 'initial', '26400000-0000-4000-8000-000000000003', 1, '24000000-0000-4000-8000-000000000101', '03030303-0303-4303-8303-030303030303', '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false}'::jsonb, '+5511966663333', now() + interval '7 days', '26000000-0000-4000-8000-000000000003', 'cancelled', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Mensagem cancelada antes do horario previsto.'),
  ('26500000-0000-4000-8000-000000000002', null, null, null, null, null, '24000000-0000-4000-8000-000000000101', '04040404-0404-4404-8404-040404040404', '{"fixture": true, "source": "local_seed", "officialOperation": false, "dispatchEnabled": false, "scenario": "future_not_due"}'::jsonb, '+5511988881111', now() + interval '14 days', '26000000-0000-4000-8000-000000000001', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Lembrete local futuro para revisar a proposta na visita.')
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
  phone = EXCLUDED.phone,
  scheduled_at = EXCLUDED.scheduled_at,
  sent_at = null,
  sent_message_id = null,
  session_id = EXCLUDED.session_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  text = EXCLUDED.text,
  updated_at = now();

UPDATE crm_whatsapp_scheduled_messages
SET phone = regexp_replace(phone, '[^0-9]', '', 'g'), updated_at = now()
WHERE id IN (
  '26500000-0000-4000-8000-000000000001',
  '26500000-0000-4000-8000-000000000002'
);
