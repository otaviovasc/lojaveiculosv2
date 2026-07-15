-- Local product seed v2.
-- Inventory units, listings, media, costs, and histories.
-- Included by ../product-test-user.sql inside one transaction.

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

DELETE FROM vehicle_media
WHERE id = '12000000-0000-4000-8000-000000000003';

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

UPDATE vehicle_media
SET
  url = 'https://seed-assets.local.test/' || storage_key,
  updated_at = now()
WHERE metadata->>'source' = 'r2_seed'
  AND tenant_id = '77777777-7777-4777-8777-777777777777';

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
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  cost_date = EXCLUDED.cost_date,
  description = EXCLUDED.description,
  kind = EXCLUDED.kind,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

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
  ('14000000-0000-4000-8000-000000000001', '03030303-0303-4303-8303-030303030303', now() - interval '5 days', '10000000-0000-4000-8000-000000000001', 12690000, 12990000, 'Ajuste para campanha de fim de semana', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('14000000-0000-4000-8000-000000000002', '03030303-0303-4303-8303-030303030303', now() - interval '9 days', '10000000-0000-4000-8000-000000000002', 9870000, 10190000, 'Reposicionamento por pesquisa FIPE', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  changed_at = EXCLUDED.changed_at,
  listing_id = EXCLUDED.listing_id,
  new_price_cents = EXCLUDED.new_price_cents,
  old_price_cents = EXCLUDED.old_price_cents,
  reason = EXCLUDED.reason,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

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
  ('15000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', now() - interval '3 days', 'available', '10000000-0000-4000-8000-000000000003', 'Sinal recebido de lead qualificado', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'reserved', '11000000-0000-4000-8000-000000000003'),
  ('15000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', now() - interval '11 days', 'reserved', '10000000-0000-4000-8000-000000000004', 'Venda concluida no atendimento presencial', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'sold', '11000000-0000-4000-8000-000000000004'),
  ('15000000-0000-4000-8000-000000000003', '04040404-0404-4404-8404-040404040404', now() - interval '1 day', 'available', '10000000-0000-4000-8000-000000000002', 'Sinal recebido para unidade BMW M3 preta', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'reserved', '11000000-0000-4000-8000-000000000002')
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
  ('16000000-0000-4000-8000-000000000001', now() - interval '18 days', '03030303-0303-4303-8303-030303030303', '[{"id":"laudo_cautelar","label":"Laudo cautelar","status":"passed","notes":"Laudo aprovado sem apontamentos estruturais."},{"id":"higienizacao","label":"Higienizacao","status":"passed","notes":"Interior higienizado e sem odores."},{"id":"fotos_publicas","label":"Fotos publicas","status":"passed","notes":"Ensaio publicado na vitrine."}]'::jsonb, 'Preparacao para publicacao', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000001'),
  ('16000000-0000-4000-8000-000000000002', null, null, '[{"id":"contrato_reserva","label":"Contrato de reserva","status":"passed","notes":"Contrato conferido pela supervisao."},{"id":"pagamento_sinal","label":"Pagamento do sinal","status":"passed","notes":"Sinal conciliado no financeiro."},{"id":"entrega_tecnica","label":"Entrega tecnica","status":"pending","notes":null}]'::jsonb, 'Reserva HB20', 'in_progress', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '11000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO UPDATE SET
  completed_at = EXCLUDED.completed_at,
  completed_by_user_id = EXCLUDED.completed_by_user_id,
  items = EXCLUDED.items,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();
