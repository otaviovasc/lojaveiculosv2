-- Local product seed v2.
-- Reservation, sales, finance, financing, and commissions.
-- Included by ../product-test-user.sql inside one transaction.

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
  '{"name": "Carla Rocha", "phone": "+5511966663333", "document": "418.762.930-04", "address": "Rua das Acacias, 640 - apto 32", "city": "Campinas", "state": "SP", "nacionalidade": "brasileira", "estadoCivil": "casada", "profissao": "engenheira civil"}'::jsonb,
  now() - interval '11 days',
  '20000000-0000-4000-8000-000000000003',
  '{"listingId": "10000000-0000-4000-8000-000000000004", "title": "Toyota Hilux SRX 2021", "plate": "JKL0M12", "stockNumber": "LV-0004", "renavam": "01357924680", "chassi": "9BD00000000000004"}'::jsonb,
  14650000,
  '{"listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "workflow": "vehicle_sale"}'::jsonb,
  '["sale_contract", "sale_receipt", "delivery_term", "power_of_attorney"]'::jsonb,
  '04040404-0404-4404-8404-040404040404',
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
  ('31000000-0000-4000-8000-000000000001', 14990000, 'vehicle', '{"description": "Toyota Hilux SRX 2021", "askingPriceCents": 14990000}'::jsonb, '30000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('31000000-0000-4000-8000-000000000002', -340000, 'discount', '{"reason": "Negociacao presencial", "approvedBy": "supervisor"}'::jsonb, '30000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  item_type = EXCLUDED.item_type,
  metadata = EXCLUDED.metadata,
  sale_id = EXCLUDED.sale_id,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

INSERT INTO sale_payments (
  id,
  amount_cents,
  principal_cents,
  method,
  paid_at,
  provider_payment_id,
  sale_id,
  status,
  store_id,
  tenant_id
)
VALUES
  ('32000000-0000-4000-8000-000000000001', 4000000, 4000000, 'pix', now() - interval '12 days', 'local_pix_signal_hilux', '30000000-0000-4000-8000-000000000001', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('32000000-0000-4000-8000-000000000002', 10650000, 10650000, 'financing', now() - interval '10 days', 'local_financing_hilux', '30000000-0000-4000-8000-000000000001', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  principal_cents = EXCLUDED.principal_cents,
  method = EXCLUDED.method,
  paid_at = EXCLUDED.paid_at,
  provider_payment_id = EXCLUDED.provider_payment_id,
  sale_id = EXCLUDED.sale_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  ('40000000-0000-4000-8000-000000000001', 14650000, 'vehicle_sale', now() - interval '10 days', '{"paymentMethod": "pix_financing", "fixture": true}'::jsonb, 'Venda Toyota Hilux SRX', now() - interval '10 days', '04040404-0404-4404-8404-040404040404', 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue'),
  ('40000000-0000-4000-8000-000000000002', 185000, 'preparation', now() - interval '20 days', '{"vendor": "Oficina parceira"}'::jsonb, 'Revisao Audi A4', now() - interval '19 days', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('40000000-0000-4000-8000-000000000003', 219750, 'sales_commission', now() + interval '5 days', '{"basis": "1.5% sobre venda Hilux", "fixture": true}'::jsonb, 'Comissao venda Hilux', null, '04040404-0404-4404-8404-040404040404', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'commission'),
  ('40000000-0000-4000-8000-000000000004', 75990000, 'vehicle_sale', now() + interval '7 days', '{"leadId": "20000000-0000-4000-8000-000000000002", "fixture": true}'::jsonb, 'Proposta BMW M3 Competition M', null, '04040404-0404-4404-8404-040404040404', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'revenue')
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
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  category = EXCLUDED.category,
  day_of_month = EXCLUDED.day_of_month,
  frequency = EXCLUDED.frequency,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  next_due_at = EXCLUDED.next_due_at,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  updated_at = now();

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
  ('43000000-0000-4000-8000-000000000001', 'vehicle_sale', null, '{"appliesTo": "seminovos"}'::jsonb, 'Comissao padrao vendedor', 150, '04040404-0404-4404-8404-040404040404', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'percentage'),
  ('43000000-0000-4000-8000-000000000002', 'financing', 50000, '{"trigger": "financing_approved"}'::jsonb, 'Bonus financiamento aprovado', null, '04040404-0404-4404-8404-040404040404', 'active', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'fixed_amount')
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  fixed_amount_cents = EXCLUDED.fixed_amount_cents,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  percentage_basis_points = EXCLUDED.percentage_basis_points,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  updated_at = now();

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
  '04040404-0404-4404-8404-040404040404',
  'pending',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
)
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  entry_id = EXCLUDED.entry_id,
  metadata = EXCLUDED.metadata,
  sale_id = EXCLUDED.sale_id,
  seller_user_id = EXCLUDED.seller_user_id,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  null,
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '{"downPaymentCents": 4000000, "fixture": true, "officialOperation": false}'::jsonb,
  'local_fixture',
  null,
  'review',
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
  ('46000000-0000-4000-8000-000000000001', 'Simulacao local', '45000000-0000-4000-8000-000000000001', 48, '{"monthlyPaymentCents": 246000, "fixture": true, "officialOperation": false}'::jsonb, 'review', 'Estimativa local: entrada de R$ 40.000 e 48 parcelas.', 11808000),
  ('46000000-0000-4000-8000-000000000002', 'Simulacao local', '45000000-0000-4000-8000-000000000001', 60, '{"monthlyPaymentCents": 216000, "fixture": true, "officialOperation": false}'::jsonb, 'review', 'Estimativa local em revisao; nenhuma proposta bancaria ocorreu.', 12960000)
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  inquiry_id = EXCLUDED.inquiry_id,
  installments = EXCLUDED.installments,
  metadata = EXCLUDED.metadata,
  status = EXCLUDED.status,
  summary = EXCLUDED.summary,
  total_amount_cents = EXCLUDED.total_amount_cents,
  updated_at = now();
