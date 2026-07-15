-- Local product seed v2.
-- Repairs reservation, payment, cost, and automatic-finance workflow graphs.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO sales (
  id, buyer_snapshot, closed_at, lead_id, listing_snapshot, sale_price_cents,
  sale_source_snapshot, selected_document_kinds, seller_user_id, status,
  store_id, tenant_id, unit_id
)
VALUES
  (
    '30000000-0000-4000-8000-000000000002',
    '{"name": "Marcos Lima", "phone": "+5511977772222"}'::jsonb,
    null,
    '20000000-0000-4000-8000-000000000002',
    '{"priceCents": 75990000, "title": "BMW M3 Competition M 2025", "trimName": "Competition M"}'::jsonb,
    75990000,
    '{"fixture": true, "source": "local_seed", "officialOperation": false, "listingId": "10000000-0000-4000-8000-000000000002", "unitId": "11000000-0000-4000-8000-000000000002", "workflow": "vehicle_reservation"}'::jsonb,
    '["sale_contract", "sale_receipt", "delivery_term", "power_of_attorney"]'::jsonb,
    '04040404-0404-4404-8404-040404040404',
    'pending',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '{"name": "Marcos Lima", "phone": "+5511977772222"}'::jsonb,
    null,
    '20000000-0000-4000-8000-000000000002',
    '{"priceCents": 6850000, "title": "Hyundai HB20 Comfort 2021", "trimName": "Comfort"}'::jsonb,
    6850000,
    '{"fixture": true, "source": "local_seed", "officialOperation": false, "listingId": "10000000-0000-4000-8000-000000000003", "unitId": "11000000-0000-4000-8000-000000000003", "workflow": "vehicle_reservation"}'::jsonb,
    '["sale_contract", "sale_receipt", "delivery_term", "power_of_attorney"]'::jsonb,
    '04040404-0404-4404-8404-040404040404',
    'pending',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
    '11000000-0000-4000-8000-000000000003'
  )
ON CONFLICT (id) DO UPDATE SET
  buyer_snapshot = EXCLUDED.buyer_snapshot,
  closed_at = null,
  deleted_at = null,
  is_current_revision = true,
  is_deleted = false,
  lead_id = EXCLUDED.lead_id,
  listing_snapshot = EXCLUDED.listing_snapshot,
  revision = 1,
  sale_price_cents = EXCLUDED.sale_price_cents,
  sale_source_snapshot = EXCLUDED.sale_source_snapshot,
  selected_document_kinds = EXCLUDED.selected_document_kinds,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

UPDATE sales
SET seller_user_id = '04040404-0404-4404-8404-040404040404', updated_at = now()
WHERE id = '30000000-0000-4000-8000-000000000001';

INSERT INTO sale_payments (
  id, amount_cents, due_at, extra_cents, installments, metadata, method,
  paid_at, principal_cents, provider_payment_id, sale_id, status, store_id,
  tenant_id
)
VALUES
  ('32000000-0000-4000-8000-000000000003', 2000000, null, 0, null, '{"fixture": true, "source": "local_seed", "officialOperation": false, "reservationSignal": true}'::jsonb, 'pix', null, 2000000, null, '30000000-0000-4000-8000-000000000002', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('32000000-0000-4000-8000-000000000004', 500000, null, 0, null, '{"fixture": true, "source": "local_seed", "officialOperation": false, "reservationSignal": true}'::jsonb, 'pix', null, 500000, null, '30000000-0000-4000-8000-000000000003', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  due_at = EXCLUDED.due_at,
  extra_cents = EXCLUDED.extra_cents,
  installments = EXCLUDED.installments,
  metadata = EXCLUDED.metadata,
  method = EXCLUDED.method,
  paid_at = null,
  principal_cents = EXCLUDED.principal_cents,
  provider_payment_id = null,
  sale_id = EXCLUDED.sale_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

-- Closed Hilux payments are internal accounting fixtures, not provider evidence.
UPDATE sale_payments
SET
  metadata = jsonb_build_object(
    'fixture', true,
    'source', 'local_seed',
    'officialOperation', false,
    'settlementEvidence', 'local_accounting_fixture'
  ),
  provider_payment_id = null,
  updated_at = now()
WHERE id IN (
  '32000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000002'
);

UPDATE finance_entries AS entry
SET
  amount_cents = payment.amount_cents,
  category = 'vehicle_sale',
  due_at = payment.due_at,
  metadata = jsonb_build_object(
    'extraCents', payment.extra_cents,
    'fixture', true,
    'installments', payment.installments,
    'method', payment.method,
    'officialOperation', false,
    'principalCents', payment.principal_cents,
    'salePaymentStatus', payment.status,
    'source', 'vehicle_sale'
  ),
  name = 'Venda de veiculo - Toyota Hilux SRX 2021',
  paid_at = payment.paid_at,
  seller_user_id = '04040404-0404-4404-8404-040404040404',
  status = CASE WHEN payment.status = 'paid' THEN 'paid'::finance_entry_status ELSE 'pending'::finance_entry_status END,
  type = 'revenue',
  updated_at = now()
FROM sale_payments AS payment
WHERE entry.id = '40000000-0000-4000-8000-000000000001'
  AND payment.id = '32000000-0000-4000-8000-000000000001';

INSERT INTO finance_entries (
  id, amount_cents, category, due_at, metadata, name, paid_at,
  seller_user_id, status, store_id, tenant_id, type
)
SELECT
  '40000000-0000-4000-8000-000000000006',
  payment.amount_cents,
  'vehicle_sale',
  payment.due_at,
  jsonb_build_object(
    'extraCents', payment.extra_cents,
    'fixture', true,
    'installments', payment.installments,
    'method', payment.method,
    'officialOperation', false,
    'principalCents', payment.principal_cents,
    'salePaymentStatus', payment.status,
    'source', 'vehicle_sale'
  ),
  'Venda de veiculo - Toyota Hilux SRX 2021',
  payment.paid_at,
  '04040404-0404-4404-8404-040404040404',
  CASE WHEN payment.status = 'paid' THEN 'paid'::finance_entry_status ELSE 'pending'::finance_entry_status END,
  payment.store_id,
  payment.tenant_id,
  'revenue'
FROM sale_payments AS payment
WHERE payment.id = '32000000-0000-4000-8000-000000000002'
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

INSERT INTO finance_entries (
  id, amount_cents, category, due_at, metadata, name, paid_at,
  seller_user_id, status, store_id, tenant_id, type
)
VALUES
  ('40000000-0000-4000-8000-000000000007', 2000000, 'vehicle_reservation_signal', null, '{"extraCents": 0, "fixture": true, "installments": null, "method": "pix", "officialOperation": false, "principalCents": 2000000, "salePaymentStatus": "pending", "source": "vehicle_reservation"}'::jsonb, 'Sinal de reserva - BMW M3 Competition M 2025', null, '04040404-0404-4404-8404-040404040404', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue'),
  ('40000000-0000-4000-8000-000000000008', 500000, 'vehicle_reservation_signal', null, '{"extraCents": 0, "fixture": true, "installments": null, "method": "pix", "officialOperation": false, "principalCents": 500000, "salePaymentStatus": "pending", "source": "vehicle_reservation"}'::jsonb, 'Sinal de reserva - Hyundai HB20 Comfort 2021', null, '04040404-0404-4404-8404-040404040404', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  category = EXCLUDED.category,
  due_at = null,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  paid_at = null,
  seller_user_id = EXCLUDED.seller_user_id,
  status = 'pending',
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  updated_at = now();

-- Match addVehicleCost: one paid expense and both cost/unit ownership links.
UPDATE finance_entries AS entry
SET
  amount_cents = cost.amount_cents,
  category = 'vehicle_' || cost.kind::text,
  due_at = cost.cost_date,
  metadata = jsonb_build_object(
    'description', cost.description,
    'fixture', true,
    'kind', cost.kind,
    'source', 'vehicle_cost'
  ),
  name = 'Custo de veiculo - Audi A4 Prestige Plus 2.0 TFSI 2022',
  paid_at = cost.cost_date,
  seller_user_id = null,
  status = 'paid',
  type = 'expense',
  updated_at = now()
FROM vehicle_costs AS cost
WHERE entry.id = '40000000-0000-4000-8000-000000000002'
  AND cost.id = '13000000-0000-4000-8000-000000000001';

INSERT INTO finance_entries (
  id, amount_cents, category, due_at, metadata, name, paid_at,
  seller_user_id, status, store_id, tenant_id, type
)
SELECT
  seeded.entry_id,
  cost.amount_cents,
  'vehicle_' || cost.kind::text,
  cost.cost_date,
  jsonb_build_object(
    'description', cost.description,
    'fixture', true,
    'kind', cost.kind,
    'source', 'vehicle_cost'
  ),
  seeded.entry_name,
  cost.cost_date,
  null,
  'paid',
  cost.store_id,
  cost.tenant_id,
  'expense'
FROM (
  VALUES
    ('13000000-0000-4000-8000-000000000002'::uuid, '40000000-0000-4000-8000-000000000009'::uuid, 'Custo de veiculo - BMW M3 Competition M 2025'),
    ('13000000-0000-4000-8000-000000000003'::uuid, '40000000-0000-4000-8000-000000000010'::uuid, 'Custo de veiculo - Hyundai HB20 Comfort 2021')
) AS seeded(cost_id, entry_id, entry_name)
JOIN vehicle_costs AS cost ON cost.id = seeded.cost_id
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  category = EXCLUDED.category,
  due_at = EXCLUDED.due_at,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  paid_at = EXCLUDED.paid_at,
  seller_user_id = null,
  status = 'paid',
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = 'expense',
  updated_at = now();

INSERT INTO finance_entry_links (
  id, entry_id, target_id, target_type, store_id, tenant_id
)
VALUES
  ('41000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'sale_payment', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'sale', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000006', '32000000-0000-4000-8000-000000000002', 'sale_payment', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000004', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 'sale', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000007', '32000000-0000-4000-8000-000000000003', 'sale_payment', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000007', '11000000-0000-4000-8000-000000000002', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000016', '40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', 'sale', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000008', '32000000-0000-4000-8000-000000000004', 'sale_payment', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000008', '11000000-0000-4000-8000-000000000003', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000019', '40000000-0000-4000-8000-000000000009', '13000000-0000-4000-8000-000000000002', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000009', '11000000-0000-4000-8000-000000000002', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000010', '13000000-0000-4000-8000-000000000003', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('41000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000003', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  entry_id = EXCLUDED.entry_id,
  target_id = EXCLUDED.target_id,
  target_type = EXCLUDED.target_type,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO finance_auto_entry_rules (
  id, calculation, category, conditions, event, family, metadata, name,
  output_type, priority, recipient_kind, resolution, rule_key,
  seller_user_id, status, store_id, tenant_id, timing
)
VALUES (
  '47000000-0000-4000-8000-000000000001',
  '{"kind": "percentage", "basis": "sale", "basisPoints": 150}'::jsonb,
  'sales_commission',
  '{}'::jsonb,
  'vehicle_sale_closed',
  'seed.sale.commission',
  '{"fixture": true, "source": "local_seed", "policy": "seller_commission_after_five_days"}'::jsonb,
  'Comissao da venda - exemplo automatico',
  'commission',
  20,
  'event_seller',
  'additive',
  'seed.sale.hilux_commission',
  '04040404-0404-4404-8404-040404040404',
  'active',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '{"kind": "days_after", "days": 5}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  calculation = EXCLUDED.calculation,
  category = EXCLUDED.category,
  conditions = EXCLUDED.conditions,
  event = EXCLUDED.event,
  family = EXCLUDED.family,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  output_type = EXCLUDED.output_type,
  priority = EXCLUDED.priority,
  recipient_kind = EXCLUDED.recipient_kind,
  recipient_user_id = null,
  resolution = EXCLUDED.resolution,
  rule_key = EXCLUDED.rule_key,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  timing = EXCLUDED.timing,
  updated_at = now();

UPDATE finance_entries
SET
  category = 'sales_commission',
  due_at = now() - interval '6 days',
  metadata = '{"fixture": true, "source": "local_seed", "automaticFinanceEntry": {"event": "vehicle_sale_closed", "family": "seed.sale.commission", "ruleId": "47000000-0000-4000-8000-000000000001", "ruleKey": "seed.sale.hilux_commission", "sourceId": "30000000-0000-4000-8000-000000000001", "sourceRevision": 1}}'::jsonb,
  name = 'Comissao da venda - exemplo automatico',
  updated_at = now()
WHERE id = '40000000-0000-4000-8000-000000000003';

UPDATE commissions
SET
  metadata = '{"fixture": true, "source": "local_seed", "financeAutoEntryRuleId": "47000000-0000-4000-8000-000000000001"}'::jsonb,
  seller_user_id = '04040404-0404-4404-8404-040404040404',
  updated_at = now()
WHERE id = '44000000-0000-4000-8000-000000000001';

INSERT INTO finance_auto_entry_executions (
  id, calculation_snapshot, finance_entry_id, metadata, rule_id, source_id,
  source_revision, source_type, store_id, tenant_id
)
VALUES (
  '48000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'amountCents', 219750,
    'basisAmountCents', 14650000,
    'calculation', jsonb_build_object('kind', 'percentage', 'basis', 'sale', 'basisPoints', 150),
    'dueAt', now() - interval '6 days',
    'event', 'vehicle_sale_closed',
    'occurredAt', now() - interval '11 days',
    'outputType', 'commission',
    'timing', jsonb_build_object('kind', 'days_after', 'days', 5)
  ),
  '40000000-0000-4000-8000-000000000003',
  '{"fixture": true, "source": "local_seed", "attributes": {}, "leadId": "20000000-0000-4000-8000-000000000003", "saleId": "30000000-0000-4000-8000-000000000001", "sellerUserId": "04040404-0404-4404-8404-040404040404", "unitId": "11000000-0000-4000-8000-000000000004"}'::jsonb,
  '47000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1,
  'vehicle_sale_closed',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (store_id, rule_id, source_type, source_id, source_revision)
DO UPDATE SET
  calculation_snapshot = EXCLUDED.calculation_snapshot,
  finance_entry_id = EXCLUDED.finance_entry_id,
  metadata = EXCLUDED.metadata,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
