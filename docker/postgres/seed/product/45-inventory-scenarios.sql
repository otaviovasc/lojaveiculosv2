-- Local product seed v2.
-- Realistic multi-store inventory, acquisition provenance, operations, and
-- finance parity. Included by ../product-test-user.sql inside one transaction.
--
-- Scenario ownership:
--   001-011: primary store / primary tenant (15 listings with baseline rows)
--   012-014: branch store / primary tenant
--   015-016: isolation store / isolation tenant
-- ID families: 120 listings, 121 units, 122 suppliers, 123 acquisitions,
-- 124 costs, 125 price history, 126 status history, 127 checklists,
-- 128 finance expenses, and 129 finance links.

-- Keep the baseline operational fixtures readable by the runtime mappers.
UPDATE vehicle_checklists
SET
  items = '[{"id":"laudo_cautelar","label":"Laudo cautelar","status":"passed","notes":"Laudo aprovado sem apontamentos estruturais."},{"id":"higienizacao","label":"Higienizacao","status":"passed","notes":"Interior higienizado e sem odores."},{"id":"fotos_publicas","label":"Fotos publicas","status":"passed","notes":"Ensaio publicado na vitrine."}]'::jsonb,
  updated_at = now()
WHERE id = '16000000-0000-4000-8000-000000000001';

UPDATE vehicle_checklists
SET
  items = '[{"id":"contrato_reserva","label":"Contrato de reserva","status":"passed","notes":"Contrato conferido pela supervisao."},{"id":"pagamento_sinal","label":"Pagamento do sinal","status":"passed","notes":"Sinal conciliado no financeiro."},{"id":"entrega_tecnica","label":"Entrega tecnica","status":"pending","notes":null}]'::jsonb,
  updated_at = now()
WHERE id = '16000000-0000-4000-8000-000000000002';

UPDATE vehicle_price_history
SET
  new_price_cents = 18990000,
  old_price_cents = 19490000,
  reason = 'Reposicionamento do Audi A4 para a vitrine atual',
  updated_at = now()
WHERE id = '14000000-0000-4000-8000-000000000001';

UPDATE vehicle_price_history
SET
  new_price_cents = 75990000,
  old_price_cents = 77990000,
  reason = 'Ajuste comercial da BMW M3 para pronta entrega',
  updated_at = now()
WHERE id = '14000000-0000-4000-8000-000000000002';

-- Commercial listings cover each non-sale lifecycle state without creating an
-- unsupported reservation graph.
INSERT INTO vehicle_listings (
  id,
  asking_price_cents,
  condition,
  description,
  doors,
  engine_aspiration,
  engine_displacement,
  featured_until,
  fuel_type,
  internal_notes,
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
  (
    '12000000-0000-4000-8000-000000000001', 10990000, 'used',
    'SUV compacto de unico dono, revisoes registradas e pacote completo de seguranca. Cabine bem preservada e pneus em bom estado.',
    4, 'turbo', '1.0', null, 'flex',
    'Margem alvo de 11%. Segunda chave identificada no cofre da loja.',
    true, 2022,
    '{"catalog":{"brandName":"Volkswagen","modelName":"T-Cross Comfortline 200 TSI","modelYear":2023,"source":"fipe","vehicleType":"cars","yearName":"2023 Gasolina"},"seedScenario":"published_available","mediaScenario":"missing_photos"}'::jsonb,
    38400, 2023, 'volkswagen-t-cross-comfortline-2023', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Volkswagen T-Cross Comfortline 200 TSI 2023', 'automatic', 'Comfortline 200 TSI'
  ),
  (
    '12000000-0000-4000-8000-000000000002', 8590000, 'certified_pre_owned',
    'Hatch turbo com bancos em couro, carregador por inducao e historico de manutencao conferido. Veiculo certificado pela loja.',
    4, 'turbo', '1.0', null, 'flex',
    'Pneus dianteiros e pastilhas substituidos antes da certificacao.',
    true, 2021,
    '{"catalog":{"brandName":"Chevrolet","modelName":"Onix Premier 1.0 Turbo","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Gasolina"},"seedScenario":"certified_available","mediaScenario":"missing_photos"}'::jsonb,
    47800, 2022, 'chevrolet-onix-premier-turbo-2022', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Chevrolet Onix Premier 1.0 Turbo 2022', 'automatic', 'Premier'
  ),
  (
    '12000000-0000-4000-8000-000000000003', 13990000, 'used',
    'Picape diesel 4x4 com capota maritima e protetor de cacamba. Em preparacao para revisao, laudo e ensaio fotografico.',
    4, 'turbo', '2.0', null, 'diesel',
    'Aguardando revisao do conjunto de freios e polimento da cacamba.',
    false, 2020,
    '{"catalog":{"brandName":"Fiat","modelName":"Toro Volcano 2.0 16V 4x4","modelYear":2021,"source":"fipe","vehicleType":"cars","yearName":"2021 Diesel"},"seedScenario":"in_preparation"}'::jsonb,
    71200, 2021, 'fiat-toro-volcano-diesel-2021', 'in_preparation',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Fiat Toro Volcano 2.0 Diesel 4x4 2021', 'automatic', 'Volcano'
  ),
  (
    '12000000-0000-4000-8000-000000000004', 16490000, 'used',
    'SUV consignado com motor turbo, teto solar e assistentes de conducao. Manual, chave reserva e revisoes na concessionaria.',
    4, 'turbo', '1.5', null, 'gasoline',
    'Consignacao com repasse ao proprietario somente no fechamento da venda.',
    true, 2022,
    '{"catalog":{"brandName":"Honda","modelName":"HR-V Touring 1.5 Turbo","modelYear":2023,"source":"fipe","vehicleType":"cars","yearName":"2023 Gasolina"},"seedScenario":"consignment_available","mediaScenario":"missing_photos"}'::jsonb,
    24600, 2023, 'honda-hr-v-touring-turbo-2023', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Honda HR-V Touring 1.5 Turbo 2023', 'cvt', 'Touring'
  ),
  (
    '12000000-0000-4000-8000-000000000005', 15490000, 'used',
    'Sedan hibrido de baixo consumo, interior claro e pacote Toyota Safety Sense. Procedencia particular e revisoes carimbadas.',
    4, 'aspirated', '1.8', null, 'hybrid',
    'Bateria hibrida testada na entrada; relatorio anexavel no fluxo de documentos.',
    true, 2021,
    '{"catalog":{"brandName":"Toyota","modelName":"Corolla Altis Premium Hybrid","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Hibrido"},"seedScenario":"hybrid_available","mediaScenario":"missing_photos"}'::jsonb,
    42100, 2022, 'toyota-corolla-altis-hybrid-2022', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Toyota Corolla Altis Premium Hybrid 2022', 'cvt', 'Altis Premium Hybrid'
  ),
  (
    '12000000-0000-4000-8000-000000000006', 14690000, 'used',
    'SUV diesel com tracao 4x4, piloto adaptativo e acabamento interno preservado. Temporariamente fora da vitrine para reposicionamento.',
    4, 'turbo', '2.0', null, 'diesel',
    'Unidade disponivel; publicacao pausada enquanto a equipe revisa preco e fotos.',
    false, 2021,
    '{"catalog":{"brandName":"Jeep","modelName":"Compass Limited TD350 4x4","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Diesel"},"seedScenario":"unpublished_available"}'::jsonb,
    58300, 2022, 'jeep-compass-limited-td350-2022', 'unpublished',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Jeep Compass Limited TD350 4x4 2022', 'automatic', 'Limited TD350'
  ),
  (
    '12000000-0000-4000-8000-000000000007', 5490000, 'used',
    'Hatch urbano economico recem adquirido. Cadastro documental iniciado, ainda sem preparacao mecanica ou publicacao.',
    4, 'aspirated', '1.0', null, 'flex',
    'Rascunho de entrada: conferir manual, chave reserva e debitos antes da preparacao.',
    false, 2020,
    '{"catalog":{"brandName":"Renault","modelName":"Kwid Zen 1.0","modelYear":2021,"source":"fipe","vehicleType":"cars","yearName":"2021 Gasolina"},"seedScenario":"draft_acquired"}'::jsonb,
    69800, 2021, 'renault-kwid-zen-2021', 'draft',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Renault Kwid Zen 1.0 2021', 'manual', 'Zen'
  ),
  (
    '12000000-0000-4000-8000-000000000008', 15490000, 'used',
    'Picape diesel usada em estrada, retirada da operacao apos diagnostico de suspensao. Mantida para testar historico de estoque inativo.',
    4, 'turbo', '3.2', null, 'diesel',
    'Arquivada por custo de recuperacao acima da margem aprovada.',
    false, 2019,
    '{"catalog":{"brandName":"Ford","modelName":"Ranger Limited 3.2 4x4","modelYear":2020,"source":"fipe","vehicleType":"cars","yearName":"2020 Diesel"},"seedScenario":"archived_inactive"}'::jsonb,
    103500, 2020, 'ford-ranger-limited-32-2020', 'archived',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Ford Ranger Limited 3.2 4x4 2020', 'automatic', 'Limited'
  ),
  (
    '12000000-0000-4000-8000-000000000009', 13290000, 'used',
    'Crossover com camera 360, alerta de colisao e acabamento premium. Unidade de giro medio com procedencia de frota executiva.',
    4, 'aspirated', '1.6', null, 'flex',
    'Destaque recomendado para campanha de SUVs compactos.',
    true, 2022,
    '{"catalog":{"brandName":"Nissan","modelName":"Kicks Exclusive 1.6","modelYear":2023,"source":"fipe","vehicleType":"cars","yearName":"2023 Gasolina"},"seedScenario":"published_available","mediaScenario":"missing_photos"}'::jsonb,
    31700, 2023, 'nissan-kicks-exclusive-2023', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Nissan Kicks Exclusive 1.6 2023', 'cvt', 'Exclusive'
  ),
  (
    '12000000-0000-4000-8000-000000000010', 11490000, 'used',
    'Crossover turbo recebido na troca, com painel digital, piloto adaptativo e revisoes em rede autorizada.',
    4, 'turbo', '1.0', null, 'flex',
    'Entrada vinculada ao lead Marcos Lima na negociacao da BMW M3.',
    true, 2021,
    '{"catalog":{"brandName":"Volkswagen","modelName":"Nivus Highline 200 TSI","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Gasolina"},"seedScenario":"trade_in_available","mediaScenario":"missing_photos"}'::jsonb,
    44200, 2022, 'volkswagen-nivus-highline-2022', 'published',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'Volkswagen Nivus Highline 200 TSI 2022', 'automatic', 'Highline 200 TSI'
  ),
  (
    '12000000-0000-4000-8000-000000000011', 11990000, 'used',
    'Hatch eletrico com baixa quilometragem, carregador portatil e interior claro. Em preparacao para teste de bateria e detalhamento.',
    4, null, null, null, 'electric',
    'Consignado; publicar somente depois do relatorio de saude da bateria.',
    false, 2023,
    '{"catalog":{"brandName":"BYD","modelName":"Dolphin GS EV","modelYear":2024,"source":"fipe","vehicleType":"cars","yearName":"2024 Eletrico"},"seedScenario":"electric_in_preparation"}'::jsonb,
    18300, 2024, 'byd-dolphin-gs-2024', 'in_preparation',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777',
    'BYD Dolphin GS Eletrico 2024', 'automatic', 'GS'
  ),
  (
    '12000000-0000-4000-8000-000000000012', 11290000, 'used',
    'SUV turbo com teto panoramico, estacionamento automatico e revisoes documentadas. Estoque da filial pronto para atendimento.',
    4, 'turbo', '1.2', null, 'flex',
    'Unidade principal da vitrine da filial; priorizar leads com troca.',
    true, 2021,
    '{"catalog":{"brandName":"Chevrolet","modelName":"Tracker Premier 1.2 Turbo","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Gasolina"},"seedScenario":"branch_published","mediaScenario":"missing_photos"}'::jsonb,
    40900, 2022, 'chevrolet-tracker-premier-2022', 'published',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777',
    'Chevrolet Tracker Premier 1.2 Turbo 2022', 'automatic', 'Premier'
  ),
  (
    '12000000-0000-4000-8000-000000000013', 10690000, 'used',
    'SUV automatico bem conservado, recebido de empresa parceira. Em revisao de suspensao e acabamento antes das fotos.',
    4, 'aspirated', '2.0', null, 'flex',
    'Filial aguardando bandeja dianteira e alinhamento para concluir preparacao.',
    false, 2020,
    '{"catalog":{"brandName":"Hyundai","modelName":"Creta Platinum 2.0","modelYear":2021,"source":"fipe","vehicleType":"cars","yearName":"2021 Gasolina"},"seedScenario":"branch_in_preparation"}'::jsonb,
    55600, 2021, 'hyundai-creta-platinum-2021', 'in_preparation',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777',
    'Hyundai Creta Platinum 2.0 2021', 'automatic', 'Platinum'
  ),
  (
    '12000000-0000-4000-8000-000000000014', 9390000, 'used',
    'Picape compacta de cabine dupla, boa capacidade de carga e manutencao simples. Disponivel na filial, com anuncio pausado.',
    4, 'aspirated', '1.3', null, 'flex',
    'Aguardando nova tabela comercial da filial para republicacao.',
    false, 2021,
    '{"catalog":{"brandName":"Fiat","modelName":"Strada Freedom CD 1.3","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Gasolina"},"seedScenario":"branch_unpublished"}'::jsonb,
    64300, 2022, 'fiat-strada-freedom-cd-2022', 'unpublished',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777',
    'Fiat Strada Freedom Cabine Dupla 2022', 'manual', 'Freedom CD'
  ),
  (
    '12000000-0000-4000-8000-000000000015', 8790000, 'used',
    'Hatch automatico economico, com central multimidia e controle de estabilidade. Publicado apenas na loja do tenant de isolamento.',
    4, 'aspirated', '1.5', null, 'flex',
    'Fixture de isolamento: nunca deve aparecer nas consultas do tenant principal.',
    true, 2021,
    '{"catalog":{"brandName":"Toyota","modelName":"Yaris XL Live 1.5","modelYear":2022,"source":"fipe","vehicleType":"cars","yearName":"2022 Gasolina"},"seedScenario":"foreign_tenant_published","mediaScenario":"missing_photos"}'::jsonb,
    49800, 2022, 'toyota-yaris-xl-live-2022', 'published',
    '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778',
    'Toyota Yaris XL Live 1.5 2022', 'cvt', 'XL Live'
  ),
  (
    '12000000-0000-4000-8000-000000000016', 7690000, 'used',
    'Picape leve retirada da operacao por desgaste acima do esperado. Registro preservado para validar isolamento e estoque arquivado.',
    2, 'aspirated', '1.6', null, 'flex',
    'Fixture de tenant externo arquivada apos reprovacao na inspecao de longarinas.',
    false, 2020,
    '{"catalog":{"brandName":"Volkswagen","modelName":"Saveiro Robust CS 1.6","modelYear":2021,"source":"fipe","vehicleType":"cars","yearName":"2021 Gasolina"},"seedScenario":"foreign_tenant_archived"}'::jsonb,
    78600, 2021, 'volkswagen-saveiro-robust-2021', 'archived',
    '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778',
    'Volkswagen Saveiro Robust 1.6 2021', 'manual', 'Robust CS'
  )
ON CONFLICT (id) DO UPDATE SET
  asking_price_cents = EXCLUDED.asking_price_cents,
  condition = EXCLUDED.condition,
  deleted_at = null,
  description = EXCLUDED.description,
  doors = EXCLUDED.doors,
  engine_aspiration = EXCLUDED.engine_aspiration,
  engine_displacement = EXCLUDED.engine_displacement,
  featured_until = EXCLUDED.featured_until,
  fuel_type = EXCLUDED.fuel_type,
  internal_notes = EXCLUDED.internal_notes,
  is_deleted = false,
  is_visible_on_public_site = EXCLUDED.is_visible_on_public_site,
  manufacture_year = EXCLUDED.manufacture_year,
  metadata = EXCLUDED.metadata,
  mileage_km = EXCLUDED.mileage_km,
  model_year = EXCLUDED.model_year,
  public_slug = EXCLUDED.public_slug,
  status = EXCLUDED.status,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  title = EXCLUDED.title,
  transmission = EXCLUDED.transmission,
  trim_name = EXCLUDED.trim_name,
  updated_at = now();

-- One physical unit per scenario listing keeps plates, stock numbers, VINs,
-- acquisition values, and lifecycle transitions independently testable.
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
  ('12100000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-05-20 14:00:00-03', 9600000, 'gray', '12000000-0000-4000-8000-000000000001', 'TCR2J31', 'available', 'MTR-2301', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BWSEED2300000001'),
  ('12100000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-06-02 10:30:00-03', 7350000, 'white', '12000000-0000-4000-8000-000000000002', 'ONX2P42', 'available', 'MTR-2202', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BGSEED2200000002'),
  ('12100000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-07-06 09:15:00-03', 11800000, 'red', '12000000-0000-4000-8000-000000000003', 'TOR1V53', 'in_preparation', 'MTR-2103', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '988SEED2100000003'),
  ('12100000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-06-18 16:20:00-03', 14800000, 'black', '12000000-0000-4000-8000-000000000004', 'HRV3T64', 'available', 'MTR-2304', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '93HSEED2300000004'),
  ('12100000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-05-28 11:40:00-03', 13700000, 'silver', '12000000-0000-4000-8000-000000000005', 'CRL2H75', 'available', 'MTR-2205', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BRSEED2200000005'),
  ('12100000-0000-4000-8000-000000000006', TIMESTAMPTZ '2026-06-10 15:10:00-03', 12400000, 'blue', '12000000-0000-4000-8000-000000000006', 'CMP2L86', 'available', 'MTR-2206', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '988SEED2200000006'),
  ('12100000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-07-11 13:25:00-03', 4300000, 'white', '12000000-0000-4000-8000-000000000007', 'KWD1Z97', 'acquired', 'MTR-2107', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '93YSEED2100000007'),
  ('12100000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-04-14 17:00:00-03', 13000000, 'black', '12000000-0000-4000-8000-000000000008', 'RNG0F18', 'inactive', 'MTR-2008', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '8AFSEED2000000008'),
  ('12100000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-06-23 09:50:00-03', 11300000, 'gray', '12000000-0000-4000-8000-000000000009', 'KCK3E29', 'available', 'MTR-2309', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '94DSEED2300000009'),
  ('12100000-0000-4000-8000-000000000010', TIMESTAMPTZ '2026-07-02 14:35:00-03', 9900000, 'blue', '12000000-0000-4000-8000-000000000010', 'NVS2A30', 'available', 'MTR-2210', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '9BWSEED2200000010'),
  ('12100000-0000-4000-8000-000000000011', TIMESTAMPTZ '2026-07-08 10:05:00-03', 10400000, 'white', '12000000-0000-4000-8000-000000000011', 'BYD4E41', 'in_preparation', 'MTR-2411', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'LGXSEED2400000011'),
  ('12100000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-06-12 11:15:00-03', 10000000, 'blue', '12000000-0000-4000-8000-000000000012', 'TRK2B52', 'available', 'CPS-2212', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '9BGSEED2200000012'),
  ('12100000-0000-4000-8000-000000000013', TIMESTAMPTZ '2026-07-04 16:45:00-03', 9100000, 'silver', '12000000-0000-4000-8000-000000000013', 'CRT1C63', 'in_preparation', 'CPS-2113', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '9BHSEED2100000013'),
  ('12100000-0000-4000-8000-000000000014', TIMESTAMPTZ '2026-05-30 08:50:00-03', 7900000, 'white', '12000000-0000-4000-8000-000000000014', 'STD2D74', 'available', 'CPS-2214', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '9BDSEED2200000014'),
  ('12100000-0000-4000-8000-000000000015', TIMESTAMPTZ '2026-06-16 10:25:00-03', 7500000, 'silver', '12000000-0000-4000-8000-000000000015', 'YRS2E85', 'available', 'ATL-2215', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '9BRSEED2200000015'),
  ('12100000-0000-4000-8000-000000000016', TIMESTAMPTZ '2026-04-28 15:30:00-03', 6400000, 'white', '12000000-0000-4000-8000-000000000016', 'SVR1F96', 'inactive', 'ATL-2116', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '9BWSEED2100000016')
ON CONFLICT (id) DO UPDATE SET
  acquisition_date = EXCLUDED.acquisition_date,
  acquisition_price_cents = EXCLUDED.acquisition_price_cents,
  color_name = EXCLUDED.color_name,
  deleted_at = null,
  is_deleted = false,
  listing_id = EXCLUDED.listing_id,
  plate = EXCLUDED.plate,
  status = EXCLUDED.status,
  stock_number = EXCLUDED.stock_number,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  vin = EXCLUDED.vin,
  updated_at = now();

-- Supplier fixtures deliberately span people, companies, a lead, and a repasse
-- partner in each relevant store scope.
INSERT INTO vehicle_suppliers (
  id,
  display_name,
  document_number,
  email,
  external_provider_id,
  kind,
  metadata,
  phone,
  provider,
  store_id,
  tenant_id
)
VALUES
  ('12200000-0000-4000-8000-000000000001', 'Paula Nogueira', '483.920.170-64', 'paula.nogueira@example.com', null, 'person', '{"relationship":"particular recorrente","seedFixture":true}'::jsonb, '+5511987651042', null, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000002', 'Auto Norte Frotas e Seminovos Ltda.', '42.781.930/0001-70', 'compras@autonorte.example.com', null, 'company', '{"relationship":"fornecedor de frota","seedFixture":true}'::jsonb, '+551133184420', null, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000003', 'Ricardo Mendes', '367.451.820-17', 'ricardo.mendes@example.com', null, 'person', '{"relationship":"consignante","seedFixture":true}'::jsonb, '+5511973028814', null, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000004', 'Marcos Lima', null, 'marcos.lima@example.com', null, 'lead', '{"leadId":"20000000-0000-4000-8000-000000000002","relationship":"cliente com troca","seedFixture":true}'::jsonb, '+5511977772222', null, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000005', 'Via Sul Repasse Automotivo', '18.640.275/0001-55', 'estoque@viasulrepasse.example.com', null, 'partner', '{"relationship":"parceiro de repasse","seedFixture":true}'::jsonb, '+551141872990', null, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000006', 'Juliana Prado', '295.713.640-61', 'juliana.prado@example.com', null, 'person', '{"relationship":"particular da filial","seedFixture":true}'::jsonb, '+5519991407625', null, '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000007', 'Oeste Gestao de Frotas Ltda.', '31.590.846/0001-52', 'vendas@oestefrotas.example.com', null, 'company', '{"relationship":"fornecedor da filial","seedFixture":true}'::jsonb, '+551935126880', null, '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12200000-0000-4000-8000-000000000008', 'Litoral Frotas Corporativas Ltda.', '27.408.519/0001-60', 'seminovos@litoralfrotas.example.com', null, 'company', '{"relationship":"fornecedor tenant externo","seedFixture":true}'::jsonb, '+551334028115', null, '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778'),
  ('12200000-0000-4000-8000-000000000009', 'Eduardo Ribeiro', '516.238.970-68', 'eduardo.ribeiro@example.com', null, 'person', '{"relationship":"particular tenant externo","seedFixture":true}'::jsonb, '+5513981226704', null, '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778')
ON CONFLICT (id) DO UPDATE SET
  deleted_at = null,
  display_name = EXCLUDED.display_name,
  document_number = EXCLUDED.document_number,
  email = EXCLUDED.email,
  external_provider_id = EXCLUDED.external_provider_id,
  is_deleted = false,
  kind = EXCLUDED.kind,
  metadata = EXCLUDED.metadata,
  phone = EXCLUDED.phone,
  provider = EXCLUDED.provider,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

-- Latest seeded price history always agrees with the listing asking price.
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
  ('12500000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-06-30 09:00:00-03', '12000000-0000-4000-8000-000000000001', 10990000, 11290000, 'Ajuste para giro de SUV compacto no fechamento do mes', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000002', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-26 10:15:00-03', '12000000-0000-4000-8000-000000000002', 8590000, 8790000, 'Reposicionamento apos conclusao da certificacao', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-08 08:40:00-03', '12000000-0000-4000-8000-000000000003', 13990000, null, 'Preco inicial definido durante a preparacao', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000004', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-01 14:10:00-03', '12000000-0000-4000-8000-000000000004', 16490000, 16990000, 'Preco alinhado com o liquido acordado na consignacao', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000005', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-06-24 11:25:00-03', '12000000-0000-4000-8000-000000000005', 15490000, 15790000, 'Campanha de sedan hibrido com pronta entrega', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000006', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-04 16:30:00-03', '12000000-0000-4000-8000-000000000006', 14690000, 14990000, 'Preco revisado antes da futura republicacao', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000007', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-07-12 15:00:00-03', '12000000-0000-4000-8000-000000000007', 5490000, null, 'Preco preliminar para analise de margem', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000008', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-04-29 10:20:00-03', '12000000-0000-4000-8000-000000000008', 15490000, 15990000, 'Ultimo preco antes do arquivamento por margem insuficiente', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000009', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-07-07 09:45:00-03', '12000000-0000-4000-8000-000000000009', 13290000, 13590000, 'Ajuste para campanha de SUVs compactos', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000010', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-07-09 13:35:00-03', '12000000-0000-4000-8000-000000000010', 11490000, 11790000, 'Preco de varejo aprovado para a unidade recebida na troca', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000011', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-10 12:10:00-03', '12000000-0000-4000-8000-000000000011', 11990000, null, 'Preco inicial sujeito ao relatorio de bateria', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000012', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-07-03 10:00:00-03', '12000000-0000-4000-8000-000000000012', 11290000, 11590000, 'Condicao comercial de abertura da vitrine da filial', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000013', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-07-07 09:20:00-03', '12000000-0000-4000-8000-000000000013', 10690000, null, 'Preco inicial durante reparo de preparacao', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000014', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-06-28 11:40:00-03', '12000000-0000-4000-8000-000000000014', 9390000, 9590000, 'Revisao de preco enquanto o anuncio permanece pausado', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12500000-0000-4000-8000-000000000015', '06060606-0606-4606-8606-060606060606', TIMESTAMPTZ '2026-07-05 15:25:00-03', '12000000-0000-4000-8000-000000000015', 8790000, 8990000, 'Ajuste comercial do tenant externo', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778'),
  ('12500000-0000-4000-8000-000000000016', '06060606-0606-4606-8606-060606060606', TIMESTAMPTZ '2026-05-07 09:10:00-03', '12000000-0000-4000-8000-000000000016', 7690000, 7890000, 'Ultimo preco antes do arquivamento no tenant externo', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778')
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

-- Current unit statuses are backed by a readable transition reason.
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
  ('12600000-0000-4000-8000-000000000001', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-05-28 16:00:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000001', 'Checklist de entrada concluido e unidade liberada para venda', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000001'),
  ('12600000-0000-4000-8000-000000000002', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-08 17:10:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000002', 'Certificacao e reparos de entrada concluidos', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000002'),
  ('12600000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-07 08:30:00-03', 'acquired', '12000000-0000-4000-8000-000000000003', 'Unidade encaminhada para revisao diesel e preparacao', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'in_preparation', '12100000-0000-4000-8000-000000000003'),
  ('12600000-0000-4000-8000-000000000004', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-21 12:00:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000004', 'Documentos da consignacao e vistoria conferidos', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000004'),
  ('12600000-0000-4000-8000-000000000005', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-03 15:20:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000005', 'Teste interno do sistema hibrido concluido', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000005'),
  ('12600000-0000-4000-8000-000000000006', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-14 10:45:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000006', 'Unidade pronta; anuncio pausado por decisao comercial', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000006'),
  ('12600000-0000-4000-8000-000000000007', '04040404-0404-4404-8404-040404040404', TIMESTAMPTZ '2026-07-11 13:25:00-03', null, '12000000-0000-4000-8000-000000000007', 'Entrada fisica registrada no estoque', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'acquired', '12100000-0000-4000-8000-000000000007'),
  ('12600000-0000-4000-8000-000000000008', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-05-05 17:30:00-03', 'available', '12000000-0000-4000-8000-000000000008', 'Unidade inativada apos reprovacao tecnica e revisao de margem', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'inactive', '12100000-0000-4000-8000-000000000008'),
  ('12600000-0000-4000-8000-000000000009', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-06-27 11:30:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000009', 'Preparacao comercial e documentos concluidos', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000009'),
  ('12600000-0000-4000-8000-000000000010', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-05 16:50:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000010', 'Troca conferida, vistoriada e liberada para varejo', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000010'),
  ('12600000-0000-4000-8000-000000000011', '03030303-0303-4303-8303-030303030303', TIMESTAMPTZ '2026-07-09 08:20:00-03', 'acquired', '12000000-0000-4000-8000-000000000011', 'Eletrico encaminhado para diagnostico de bateria e detalhamento', '66666666-6666-4666-8666-666666666666', 'unit', '77777777-7777-4777-8777-777777777777', 'in_preparation', '12100000-0000-4000-8000-000000000011'),
  ('12600000-0000-4000-8000-000000000012', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-06-17 16:15:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000012', 'Filial concluiu revisao, fotos e conferencia documental', '66666666-6666-4666-8666-666666666667', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000012'),
  ('12600000-0000-4000-8000-000000000013', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-07-05 09:00:00-03', 'acquired', '12000000-0000-4000-8000-000000000013', 'Unidade encaminhada para reparo de suspensao na filial', '66666666-6666-4666-8666-666666666667', 'unit', '77777777-7777-4777-8777-777777777777', 'in_preparation', '12100000-0000-4000-8000-000000000013'),
  ('12600000-0000-4000-8000-000000000014', '05050505-0505-4505-8505-050505050505', TIMESTAMPTZ '2026-06-04 14:00:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000014', 'Consignacao preparada; anuncio pausado por decisao comercial', '66666666-6666-4666-8666-666666666667', 'unit', '77777777-7777-4777-8777-777777777777', 'available', '12100000-0000-4000-8000-000000000014'),
  ('12600000-0000-4000-8000-000000000015', '06060606-0606-4606-8606-060606060606', TIMESTAMPTZ '2026-06-20 17:00:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000015', 'Tenant externo liberou a unidade para publicacao', '66666666-6666-4666-8666-666666666668', 'unit', '77777777-7777-4777-8777-777777777778', 'available', '12100000-0000-4000-8000-000000000015'),
  ('12600000-0000-4000-8000-000000000016', '06060606-0606-4606-8606-060606060606', TIMESTAMPTZ '2026-05-08 16:30:00-03', 'in_preparation', '12000000-0000-4000-8000-000000000016', 'Tenant externo inativou a unidade apos inspecao estrutural', '66666666-6666-4666-8666-666666666668', 'unit', '77777777-7777-4777-8777-777777777778', 'inactive', '12100000-0000-4000-8000-000000000016')
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

-- Acquisition provenance exercises direct purchase, company supply,
-- consignment, repasse, and a trade-in tied to the existing Marcos Lima lead.
INSERT INTO vehicle_unit_acquisitions (
  id,
  acquisition_date,
  acquisition_price_cents,
  acquisition_user_id,
  channel,
  commission_timing,
  custom_channel_label,
  lead_id,
  metadata,
  notes,
  source_snapshot,
  store_id,
  supplier_id,
  tenant_id,
  unit_id
)
VALUES
  ('12300000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-05-20 14:00:00-03', 9600000, '04040404-0404-4404-8404-040404040404', 'direct_person', 'acquisition', null, null, '{"paymentTerms":"pix na transferencia","seedFixture":true}'::jsonb, 'Compra direta apos avaliacao presencial e consulta documental interna.', '{"supplierName":"Paula Nogueira","negotiatedPriceCents":9600000,"channel":"direct_person"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000001'),
  ('12300000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-06-02 10:30:00-03', 7350000, '04040404-0404-4404-8404-040404040404', 'supplier_company', 'acquisition', null, null, '{"batchReference":"ANF-2026-061","seedFixture":true}'::jsonb, 'Unidade selecionada de lote corporativo com historico de manutencao.', '{"supplierName":"Auto Norte Frotas e Seminovos Ltda.","negotiatedPriceCents":7350000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000002'),
  ('12300000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-07-06 09:15:00-03', 11800000, '03030303-0303-4303-8303-030303030303', 'supplier_company', 'acquisition', null, null, '{"batchReference":"ANF-2026-074","seedFixture":true}'::jsonb, 'Compra condicionada a revisao mecanica concluida pela propria loja.', '{"supplierName":"Auto Norte Frotas e Seminovos Ltda.","negotiatedPriceCents":11800000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000003'),
  ('12300000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-06-18 16:20:00-03', 14800000, '03030303-0303-4303-8303-030303030303', 'consignment', 'closed', null, null, '{"ownership":"consigned","payoutTrigger":"sale_close","seedFixture":true}'::jsonb, 'Valor representa o liquido acordado com o consignante; sem desembolso na entrada.', '{"supplierName":"Ricardo Mendes","agreedNetCents":14800000,"channel":"consignment"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000003', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000004'),
  ('12300000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-05-28 11:40:00-03', 13700000, '04040404-0404-4404-8404-040404040404', 'direct_person', 'acquisition', null, null, '{"paymentTerms":"ted apos transferencia","seedFixture":true}'::jsonb, 'Compra direta com relatorio da bateria hibrida entregue pelo proprietario.', '{"supplierName":"Paula Nogueira","negotiatedPriceCents":13700000,"channel":"direct_person"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000005'),
  ('12300000-0000-4000-8000-000000000006', TIMESTAMPTZ '2026-06-10 15:10:00-03', 12400000, '04040404-0404-4404-8404-040404040404', 'supplier_company', 'acquisition', null, null, '{"batchReference":"ANF-2026-068","seedFixture":true}'::jsonb, 'Unidade adquirida de frota executiva e recebida com revisoes registradas.', '{"supplierName":"Auto Norte Frotas e Seminovos Ltda.","negotiatedPriceCents":12400000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000006'),
  ('12300000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-07-11 13:25:00-03', 4300000, '04040404-0404-4404-8404-040404040404', 'direct_person', 'acquisition', null, null, '{"paymentTerms":"pix apos baixa de gravame","seedFixture":true}'::jsonb, 'Entrada recente; conferencia documental ainda faz parte do checklist.', '{"supplierName":"Paula Nogueira","negotiatedPriceCents":4300000,"channel":"direct_person"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000007'),
  ('12300000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-04-14 17:00:00-03', 13000000, '03030303-0303-4303-8303-030303030303', 'repasse_partner', 'acquisition', null, null, '{"partnerLot":"VS-2406","seedFixture":true}'::jsonb, 'Repasse adquirido para varejo e posteriormente arquivado por custo de recuperacao.', '{"supplierName":"Via Sul Repasse Automotivo","negotiatedPriceCents":13000000,"channel":"repasse_partner"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000005', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000008'),
  ('12300000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-06-23 09:50:00-03', 11300000, '04040404-0404-4404-8404-040404040404', 'supplier_company', 'acquisition', null, null, '{"batchReference":"ANF-2026-070","seedFixture":true}'::jsonb, 'Compra de frota executiva com manual e chave reserva.', '{"supplierName":"Auto Norte Frotas e Seminovos Ltda.","negotiatedPriceCents":11300000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000009'),
  ('12300000-0000-4000-8000-000000000010', TIMESTAMPTZ '2026-07-02 14:35:00-03', 9900000, '04040404-0404-4404-8404-040404040404', 'trade_in_lead', 'closed', null, '20000000-0000-4000-8000-000000000002', '{"tradeInForListingId":"10000000-0000-4000-8000-000000000002","seedFixture":true}'::jsonb, 'Nivus recebido como parte da proposta da BMW M3; avaliacao registrada no atendimento.', '{"supplierName":"Marcos Lima","leadId":"20000000-0000-4000-8000-000000000002","valuationCents":9900000,"channel":"trade_in_lead"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000004', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000010'),
  ('12300000-0000-4000-8000-000000000011', TIMESTAMPTZ '2026-07-08 10:05:00-03', 10400000, '03030303-0303-4303-8303-030303030303', 'consignment', 'closed', null, null, '{"ownership":"consigned","payoutTrigger":"sale_close","seedFixture":true}'::jsonb, 'Valor liquido de consignacao condicionado ao relatorio interno da bateria.', '{"supplierName":"Ricardo Mendes","agreedNetCents":10400000,"channel":"consignment"}'::jsonb, '66666666-6666-4666-8666-666666666666', '12200000-0000-4000-8000-000000000003', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000011'),
  ('12300000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-06-12 11:15:00-03', 10000000, '05050505-0505-4505-8505-050505050505', 'direct_person', 'acquisition', null, null, '{"paymentTerms":"pix na transferencia","seedFixture":true}'::jsonb, 'Compra direta negociada e recebida pela equipe da filial.', '{"supplierName":"Juliana Prado","negotiatedPriceCents":10000000,"channel":"direct_person"}'::jsonb, '66666666-6666-4666-8666-666666666667', '12200000-0000-4000-8000-000000000006', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000012'),
  ('12300000-0000-4000-8000-000000000013', TIMESTAMPTZ '2026-07-04 16:45:00-03', 9100000, '05050505-0505-4505-8505-050505050505', 'supplier_company', 'acquisition', null, null, '{"batchReference":"OGF-2026-031","seedFixture":true}'::jsonb, 'Recebido com necessidade de reparo de suspensao registrada na entrada.', '{"supplierName":"Oeste Gestao de Frotas Ltda.","negotiatedPriceCents":9100000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666667', '12200000-0000-4000-8000-000000000007', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000013'),
  ('12300000-0000-4000-8000-000000000014', TIMESTAMPTZ '2026-05-30 08:50:00-03', 7900000, '05050505-0505-4505-8505-050505050505', 'consignment', 'closed', null, null, '{"ownership":"consigned","payoutTrigger":"sale_close","seedFixture":true}'::jsonb, 'Consignacao local com valor liquido definido e publicacao temporariamente pausada.', '{"supplierName":"Juliana Prado","agreedNetCents":7900000,"channel":"consignment"}'::jsonb, '66666666-6666-4666-8666-666666666667', '12200000-0000-4000-8000-000000000006', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000014'),
  ('12300000-0000-4000-8000-000000000015', TIMESTAMPTZ '2026-06-16 10:25:00-03', 7500000, '06060606-0606-4606-8606-060606060606', 'supplier_company', 'acquisition', null, null, '{"batchReference":"LFC-2026-014","seedFixture":true}'::jsonb, 'Unidade do tenant externo adquirida de frota corporativa.', '{"supplierName":"Litoral Frotas Corporativas Ltda.","negotiatedPriceCents":7500000,"channel":"supplier_company"}'::jsonb, '66666666-6666-4666-8666-666666666668', '12200000-0000-4000-8000-000000000008', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000015'),
  ('12300000-0000-4000-8000-000000000016', TIMESTAMPTZ '2026-04-28 15:30:00-03', 6400000, '06060606-0606-4606-8606-060606060606', 'direct_person', 'acquisition', null, null, '{"paymentTerms":"ted na transferencia","seedFixture":true}'::jsonb, 'Compra particular do tenant externo, arquivada depois da inspecao interna.', '{"supplierName":"Eduardo Ribeiro","negotiatedPriceCents":6400000,"channel":"direct_person"}'::jsonb, '66666666-6666-4666-8666-666666666668', '12200000-0000-4000-8000-000000000009', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000016')
ON CONFLICT (id) DO UPDATE SET
  acquisition_date = EXCLUDED.acquisition_date,
  acquisition_price_cents = EXCLUDED.acquisition_price_cents,
  acquisition_user_id = EXCLUDED.acquisition_user_id,
  channel = EXCLUDED.channel,
  commission_timing = EXCLUDED.commission_timing,
  custom_channel_label = EXCLUDED.custom_channel_label,
  deleted_at = null,
  is_deleted = false,
  lead_id = EXCLUDED.lead_id,
  metadata = EXCLUDED.metadata,
  notes = EXCLUDED.notes,
  source_snapshot = EXCLUDED.source_snapshot,
  store_id = EXCLUDED.store_id,
  supplier_id = EXCLUDED.supplier_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
  updated_at = now();

-- Every new unit has one operational cost. Each cost is mirrored below by a
-- paid expense and both runtime-standard links (vehicle_cost + vehicle_unit).
INSERT INTO vehicle_costs (
  id,
  amount_cents,
  cost_date,
  description,
  kind,
  metadata,
  store_id,
  tenant_id,
  unit_id
)
VALUES
  ('12400000-0000-4000-8000-000000000001', 145000, TIMESTAMPTZ '2026-05-24 09:00:00-03', 'Revisao de entrada, troca de oleo e filtros', 'preparation', '{"vendor":"Oficina Motor Sul","invoiceReference":"OS-4821","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000001'),
  ('12400000-0000-4000-8000-000000000002', 210000, TIMESTAMPTZ '2026-06-05 14:30:00-03', 'Pneus dianteiros e pastilhas de freio', 'repair', '{"vendor":"Centro Automotivo Bandeira","invoiceReference":"OS-7714","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000002'),
  ('12400000-0000-4000-8000-000000000003', 285000, TIMESTAMPTZ '2026-07-07 11:15:00-03', 'Revisao diesel e manutencao preventiva dos freios', 'preparation', '{"vendor":"Diesel Forte Servicos","invoiceReference":"OS-1938","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000003'),
  ('12400000-0000-4000-8000-000000000004', 98000, TIMESTAMPTZ '2026-06-19 10:40:00-03', 'Laudo cautelar e vistoria de consignacao', 'fee', '{"vendor":"Vistoria Segura","invoiceReference":"VS-6204","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000004'),
  ('12400000-0000-4000-8000-000000000005', 165000, TIMESTAMPTZ '2026-05-31 13:20:00-03', 'Revisao periodica e teste interno do sistema hibrido', 'preparation', '{"vendor":"Oficina Motor Sul","invoiceReference":"OS-4890","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000005'),
  ('12400000-0000-4000-8000-000000000006', 78000, TIMESTAMPTZ '2026-06-12 16:00:00-03', 'Higienizacao interna e polimento comercial', 'preparation', '{"vendor":"Studio Brilho","invoiceReference":"SB-2285","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000006'),
  ('12400000-0000-4000-8000-000000000007', 45000, TIMESTAMPTZ '2026-07-12 09:35:00-03', 'Vistoria inicial e consulta documental', 'fee', '{"vendor":"Vistoria Segura","invoiceReference":"VS-6299","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000007'),
  ('12400000-0000-4000-8000-000000000008', 260000, TIMESTAMPTZ '2026-04-18 15:45:00-03', 'Diagnostico e desmontagem da suspensao dianteira', 'repair', '{"vendor":"Diesel Forte Servicos","invoiceReference":"OS-1802","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000008'),
  ('12400000-0000-4000-8000-000000000009', 89000, TIMESTAMPTZ '2026-06-25 10:10:00-03', 'Higienizacao, cristalizacao e pequenos retoques', 'preparation', '{"vendor":"Studio Brilho","invoiceReference":"SB-2318","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000009'),
  ('12400000-0000-4000-8000-000000000010', 62000, TIMESTAMPTZ '2026-07-03 09:25:00-03', 'Laudo cautelar da unidade recebida na troca', 'fee', '{"vendor":"Vistoria Segura","invoiceReference":"VS-6268","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000010'),
  ('12400000-0000-4000-8000-000000000011', 135000, TIMESTAMPTZ '2026-07-09 14:15:00-03', 'Diagnostico interno de bateria e detalhamento', 'preparation', '{"vendor":"EletriCar Service","invoiceReference":"EC-1044","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000011'),
  ('12400000-0000-4000-8000-000000000012', 115000, TIMESTAMPTZ '2026-06-14 11:50:00-03', 'Revisao de entrada e preparacao de vitrine', 'preparation', '{"vendor":"Oficina Campinas Centro","invoiceReference":"OC-3112","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000012'),
  ('12400000-0000-4000-8000-000000000013', 240000, TIMESTAMPTZ '2026-07-06 13:40:00-03', 'Bandeja dianteira, alinhamento e balanceamento', 'repair', '{"vendor":"Oficina Campinas Centro","invoiceReference":"OC-3176","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000013'),
  ('12400000-0000-4000-8000-000000000014', 72000, TIMESTAMPTZ '2026-06-02 08:35:00-03', 'Laudo cautelar e vistoria para consignacao', 'fee', '{"vendor":"Vistoria Interior","invoiceReference":"VI-8082","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000014'),
  ('12400000-0000-4000-8000-000000000015', 95000, TIMESTAMPTZ '2026-06-18 09:05:00-03', 'Revisao leve e preparacao para publicacao', 'preparation', '{"vendor":"Oficina Litoral","invoiceReference":"OL-4507","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000015'),
  ('12400000-0000-4000-8000-000000000016', 188000, TIMESTAMPTZ '2026-05-02 14:10:00-03', 'Inspecao estrutural e desmontagem para diagnostico', 'repair', '{"vendor":"Oficina Litoral","invoiceReference":"OL-4391","seedFixture":true}'::jsonb, '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000016')
ON CONFLICT (id) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  cost_date = EXCLUDED.cost_date,
  description = EXCLUDED.description,
  kind = EXCLUDED.kind,
  metadata = EXCLUDED.metadata,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  unit_id = EXCLUDED.unit_id,
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
  ('12800000-0000-4000-8000-000000000001', 145000, 'vehicle_preparation', TIMESTAMPTZ '2026-05-24 09:00:00-03', '{"description":"Revisao de entrada, troca de oleo e filtros","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Volkswagen T-Cross Comfortline 200 TSI 2023', TIMESTAMPTZ '2026-05-24 09:00:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000002', 210000, 'vehicle_repair', TIMESTAMPTZ '2026-06-05 14:30:00-03', '{"description":"Pneus dianteiros e pastilhas de freio","kind":"repair","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Chevrolet Onix Premier 1.0 Turbo 2022', TIMESTAMPTZ '2026-06-05 14:30:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000003', 285000, 'vehicle_preparation', TIMESTAMPTZ '2026-07-07 11:15:00-03', '{"description":"Revisao diesel e manutencao preventiva dos freios","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Fiat Toro Volcano 2.0 Diesel 4x4 2021', TIMESTAMPTZ '2026-07-07 11:15:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000004', 98000, 'vehicle_fee', TIMESTAMPTZ '2026-06-19 10:40:00-03', '{"description":"Laudo cautelar e vistoria de consignacao","kind":"fee","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Honda HR-V Touring 1.5 Turbo 2023', TIMESTAMPTZ '2026-06-19 10:40:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000005', 165000, 'vehicle_preparation', TIMESTAMPTZ '2026-05-31 13:20:00-03', '{"description":"Revisao periodica e teste interno do sistema hibrido","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Toyota Corolla Altis Premium Hybrid 2022', TIMESTAMPTZ '2026-05-31 13:20:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000006', 78000, 'vehicle_preparation', TIMESTAMPTZ '2026-06-12 16:00:00-03', '{"description":"Higienizacao interna e polimento comercial","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Jeep Compass Limited TD350 4x4 2022', TIMESTAMPTZ '2026-06-12 16:00:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000007', 45000, 'vehicle_fee', TIMESTAMPTZ '2026-07-12 09:35:00-03', '{"description":"Vistoria inicial e consulta documental","kind":"fee","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Renault Kwid Zen 1.0 2021', TIMESTAMPTZ '2026-07-12 09:35:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000008', 260000, 'vehicle_repair', TIMESTAMPTZ '2026-04-18 15:45:00-03', '{"description":"Diagnostico e desmontagem da suspensao dianteira","kind":"repair","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Ford Ranger Limited 3.2 4x4 2020', TIMESTAMPTZ '2026-04-18 15:45:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000009', 89000, 'vehicle_preparation', TIMESTAMPTZ '2026-06-25 10:10:00-03', '{"description":"Higienizacao, cristalizacao e pequenos retoques","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Nissan Kicks Exclusive 1.6 2023', TIMESTAMPTZ '2026-06-25 10:10:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000010', 62000, 'vehicle_fee', TIMESTAMPTZ '2026-07-03 09:25:00-03', '{"description":"Laudo cautelar da unidade recebida na troca","kind":"fee","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Volkswagen Nivus Highline 200 TSI 2022', TIMESTAMPTZ '2026-07-03 09:25:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000011', 135000, 'vehicle_preparation', TIMESTAMPTZ '2026-07-09 14:15:00-03', '{"description":"Diagnostico interno de bateria e detalhamento","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - BYD Dolphin GS Eletrico 2024', TIMESTAMPTZ '2026-07-09 14:15:00-03', null, 'paid', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000012', 115000, 'vehicle_preparation', TIMESTAMPTZ '2026-06-14 11:50:00-03', '{"description":"Revisao de entrada e preparacao de vitrine","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Chevrolet Tracker Premier 1.2 Turbo 2022', TIMESTAMPTZ '2026-06-14 11:50:00-03', null, 'paid', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000013', 240000, 'vehicle_repair', TIMESTAMPTZ '2026-07-06 13:40:00-03', '{"description":"Bandeja dianteira, alinhamento e balanceamento","kind":"repair","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Hyundai Creta Platinum 2.0 2021', TIMESTAMPTZ '2026-07-06 13:40:00-03', null, 'paid', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000014', 72000, 'vehicle_fee', TIMESTAMPTZ '2026-06-02 08:35:00-03', '{"description":"Laudo cautelar e vistoria para consignacao","kind":"fee","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Fiat Strada Freedom Cabine Dupla 2022', TIMESTAMPTZ '2026-06-02 08:35:00-03', null, 'paid', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'expense'),
  ('12800000-0000-4000-8000-000000000015', 95000, 'vehicle_preparation', TIMESTAMPTZ '2026-06-18 09:05:00-03', '{"description":"Revisao leve e preparacao para publicacao","kind":"preparation","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Toyota Yaris XL Live 1.5 2022', TIMESTAMPTZ '2026-06-18 09:05:00-03', null, 'paid', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', 'expense'),
  ('12800000-0000-4000-8000-000000000016', 188000, 'vehicle_repair', TIMESTAMPTZ '2026-05-02 14:10:00-03', '{"description":"Inspecao estrutural e desmontagem para diagnostico","kind":"repair","source":"vehicle_cost"}'::jsonb, 'Custo de veiculo - Volkswagen Saveiro Robust 1.6 2021', TIMESTAMPTZ '2026-05-02 14:10:00-03', null, 'paid', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', 'expense')
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

INSERT INTO finance_entry_links (
  id,
  entry_id,
  target_id,
  target_type,
  store_id,
  tenant_id
)
VALUES
  ('12900000-0000-4000-8000-000000000001', '12800000-0000-4000-8000-000000000001', '12400000-0000-4000-8000-000000000001', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000002', '12800000-0000-4000-8000-000000000002', '12400000-0000-4000-8000-000000000002', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000003', '12800000-0000-4000-8000-000000000003', '12400000-0000-4000-8000-000000000003', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000004', '12800000-0000-4000-8000-000000000004', '12400000-0000-4000-8000-000000000004', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000005', '12800000-0000-4000-8000-000000000005', '12400000-0000-4000-8000-000000000005', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000006', '12800000-0000-4000-8000-000000000006', '12400000-0000-4000-8000-000000000006', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000007', '12800000-0000-4000-8000-000000000007', '12400000-0000-4000-8000-000000000007', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000008', '12800000-0000-4000-8000-000000000008', '12400000-0000-4000-8000-000000000008', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000009', '12800000-0000-4000-8000-000000000009', '12400000-0000-4000-8000-000000000009', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000010', '12800000-0000-4000-8000-000000000010', '12400000-0000-4000-8000-000000000010', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000011', '12800000-0000-4000-8000-000000000011', '12400000-0000-4000-8000-000000000011', 'vehicle_cost', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000012', '12800000-0000-4000-8000-000000000012', '12400000-0000-4000-8000-000000000012', 'vehicle_cost', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000013', '12800000-0000-4000-8000-000000000013', '12400000-0000-4000-8000-000000000013', 'vehicle_cost', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000014', '12800000-0000-4000-8000-000000000014', '12400000-0000-4000-8000-000000000014', 'vehicle_cost', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000015', '12800000-0000-4000-8000-000000000015', '12400000-0000-4000-8000-000000000015', 'vehicle_cost', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778'),
  ('12900000-0000-4000-8000-000000000016', '12800000-0000-4000-8000-000000000016', '12400000-0000-4000-8000-000000000016', 'vehicle_cost', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778'),
  ('12900000-0000-4000-8000-000000000017', '12800000-0000-4000-8000-000000000001', '12100000-0000-4000-8000-000000000001', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000018', '12800000-0000-4000-8000-000000000002', '12100000-0000-4000-8000-000000000002', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000019', '12800000-0000-4000-8000-000000000003', '12100000-0000-4000-8000-000000000003', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000020', '12800000-0000-4000-8000-000000000004', '12100000-0000-4000-8000-000000000004', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000021', '12800000-0000-4000-8000-000000000005', '12100000-0000-4000-8000-000000000005', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000022', '12800000-0000-4000-8000-000000000006', '12100000-0000-4000-8000-000000000006', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000023', '12800000-0000-4000-8000-000000000007', '12100000-0000-4000-8000-000000000007', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000024', '12800000-0000-4000-8000-000000000008', '12100000-0000-4000-8000-000000000008', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000025', '12800000-0000-4000-8000-000000000009', '12100000-0000-4000-8000-000000000009', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000026', '12800000-0000-4000-8000-000000000010', '12100000-0000-4000-8000-000000000010', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000027', '12800000-0000-4000-8000-000000000011', '12100000-0000-4000-8000-000000000011', 'vehicle_unit', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000028', '12800000-0000-4000-8000-000000000012', '12100000-0000-4000-8000-000000000012', 'vehicle_unit', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000029', '12800000-0000-4000-8000-000000000013', '12100000-0000-4000-8000-000000000013', 'vehicle_unit', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000030', '12800000-0000-4000-8000-000000000014', '12100000-0000-4000-8000-000000000014', 'vehicle_unit', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777'),
  ('12900000-0000-4000-8000-000000000031', '12800000-0000-4000-8000-000000000015', '12100000-0000-4000-8000-000000000015', 'vehicle_unit', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778'),
  ('12900000-0000-4000-8000-000000000032', '12800000-0000-4000-8000-000000000016', '12100000-0000-4000-8000-000000000016', 'vehicle_unit', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778')
ON CONFLICT (id) DO UPDATE SET
  entry_id = EXCLUDED.entry_id,
  store_id = EXCLUDED.store_id,
  target_id = EXCLUDED.target_id,
  target_type = EXCLUDED.target_type,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

-- Checklist JSON uses the runtime {id, label, status, notes} item contract.
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
  (
    '12700000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-05-28 16:00:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Documentos e manual","status":"passed","notes":"CRLV, manual e segunda chave conferidos."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Sem apontamentos estruturais."},{"id":"mechanics","label":"Revisao mecanica","status":"passed","notes":"Oleo e filtros substituidos."},{"id":"merchandising","label":"Higienizacao e fotos","status":"passed","notes":"Material da vitrine concluido."}]'::jsonb,
    'Entrada e preparacao para venda', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000001'
  ),
  (
    '12700000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-06-08 17:10:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Historico da frota","status":"passed","notes":"Revisoes e baixa patrimonial conferidas."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Estrutura aprovada."},{"id":"mechanics","label":"Itens da certificacao","status":"passed","notes":"Pneus e freios dentro do padrao certificado."},{"id":"merchandising","label":"Higienizacao e fotos","status":"passed","notes":"Pronto para publicacao."}]'::jsonb,
    'Certificacao de seminovo', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000002'
  ),
  (
    '12700000-0000-4000-8000-000000000003', null, null,
    '[{"id":"documents","label":"Documentos de entrada","status":"passed","notes":"Nota de compra e CRLV conferidos."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Sem bloqueio para preparacao."},{"id":"mechanics","label":"Revisao diesel e freios","status":"pending","notes":"Servico em andamento na oficina."},{"id":"merchandising","label":"Polimento e fotos","status":"pending","notes":null}]'::jsonb,
    'Preparacao da picape', 'in_progress', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000003'
  ),
  (
    '12700000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-06-21 12:00:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Contrato de consignacao","status":"passed","notes":"Liquido e prazo assinados pelo proprietario."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Laudo sem apontamentos estruturais."},{"id":"mechanics","label":"Revisoes da concessionaria","status":"passed","notes":"Historico e quilometragem coerentes."},{"id":"merchandising","label":"Fotos e descricao","status":"passed","notes":"Conteudo aprovado pela supervisao."}]'::jsonb,
    'Entrada de consignacao', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000004'
  ),
  (
    '12700000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-06-03 15:20:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Manual e chave reserva","status":"passed","notes":"Itens recebidos na compra."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Estrutura aprovada."},{"id":"hybrid_system","label":"Sistema hibrido","status":"passed","notes":"Teste interno sem alertas ativos."},{"id":"merchandising","label":"Preparacao de vitrine","status":"passed","notes":"Higienizacao e fotos concluidas."}]'::jsonb,
    'Preparacao do hibrido', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000005'
  ),
  (
    '12700000-0000-4000-8000-000000000006', TIMESTAMPTZ '2026-06-14 10:45:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Documentos da frota","status":"passed","notes":"Baixa e historico conferidos."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Sem restricoes para varejo."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Fluidos e itens de seguranca conferidos."},{"id":"merchandising","label":"Higienizacao","status":"passed","notes":"Fotos antigas aguardam renovacao comercial."}]'::jsonb,
    'Liberacao operacional', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000006'
  ),
  (
    '12700000-0000-4000-8000-000000000007', null, null,
    '[{"id":"documents","label":"Documentos e gravame","status":"pending","notes":"Aguardando conferencia final da baixa."},{"id":"inspection","label":"Laudo cautelar","status":"pending","notes":null},{"id":"mechanics","label":"Revisao mecanica","status":"pending","notes":null},{"id":"merchandising","label":"Higienizacao e fotos","status":"pending","notes":null}]'::jsonb,
    'Triagem de entrada', 'pending', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000007'
  ),
  (
    '12700000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-05-05 17:30:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Documentos do repasse","status":"passed","notes":"Origem e nota de entrada conferidas."},{"id":"inspection","label":"Inspecao estrutural","status":"passed","notes":"Sem apontamento impeditivo de estrutura."},{"id":"mechanics","label":"Suspensao dianteira","status":"failed","notes":"Custo estimado ultrapassa a margem aprovada."},{"id":"merchandising","label":"Preparacao de vitrine","status":"waived","notes":"Dispensada apos decisao de arquivamento."}]'::jsonb,
    'Avaliacao para recuperacao', 'failed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000008'
  ),
  (
    '12700000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-06-27 11:30:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Historico corporativo","status":"passed","notes":"Documentacao de frota regular."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Aprovado para varejo."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Itens preventivos conferidos."},{"id":"merchandising","label":"Cristalizacao e fotos","status":"passed","notes":"Conteudo pronto para campanha."}]'::jsonb,
    'Entrada e preparacao para venda', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000009'
  ),
  (
    '12700000-0000-4000-8000-000000000010', TIMESTAMPTZ '2026-07-05 16:50:00-03', '03030303-0303-4303-8303-030303030303',
    '[{"id":"documents","label":"Termo de avaliacao da troca","status":"passed","notes":"Vinculado ao lead Marcos Lima."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Aprovado sem restricao estrutural."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Sem manutencao corretiva imediata."},{"id":"merchandising","label":"Higienizacao e fotos","status":"passed","notes":"Anuncio liberado para a vitrine."}]'::jsonb,
    'Recebimento de veiculo na troca', 'passed', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000010'
  ),
  (
    '12700000-0000-4000-8000-000000000011', null, null,
    '[{"id":"documents","label":"Contrato de consignacao","status":"passed","notes":"Condicoes comerciais conferidas."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Estrutura sem apontamentos."},{"id":"battery","label":"Relatorio de saude da bateria","status":"pending","notes":"Diagnostico interno agendado."},{"id":"merchandising","label":"Detalhamento e fotos","status":"pending","notes":null}]'::jsonb,
    'Preparacao do eletrico', 'in_progress', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000011'
  ),
  (
    '12700000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-06-17 16:15:00-03', '05050505-0505-4505-8505-050505050505',
    '[{"id":"documents","label":"Documentos do particular","status":"passed","notes":"Transferencia e manual conferidos."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Aprovado para varejo."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Servico concluido pela oficina da filial."},{"id":"merchandising","label":"Fotos da filial","status":"passed","notes":"Conteudo publicado na vitrine correta."}]'::jsonb,
    'Preparacao da filial', 'passed', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000012'
  ),
  (
    '12700000-0000-4000-8000-000000000013', null, null,
    '[{"id":"documents","label":"Documentos de frota","status":"passed","notes":"Baixa patrimonial recebida."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Sem bloqueio estrutural."},{"id":"mechanics","label":"Reparo de suspensao","status":"pending","notes":"Bandeja dianteira em substituicao."},{"id":"merchandising","label":"Higienizacao e fotos","status":"pending","notes":null}]'::jsonb,
    'Preparacao da filial', 'in_progress', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000013'
  ),
  (
    '12700000-0000-4000-8000-000000000014', TIMESTAMPTZ '2026-06-04 14:00:00-03', '05050505-0505-4505-8505-050505050505',
    '[{"id":"documents","label":"Contrato de consignacao","status":"passed","notes":"Valor liquido e prazo conferidos."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Aprovado para varejo."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Sem reparos pendentes."},{"id":"merchandising","label":"Preparacao comercial","status":"passed","notes":"Anuncio pausado por decisao de preco, nao por pendencia tecnica."}]'::jsonb,
    'Entrada de consignacao da filial', 'passed', '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', '12100000-0000-4000-8000-000000000014'
  ),
  (
    '12700000-0000-4000-8000-000000000015', TIMESTAMPTZ '2026-06-20 17:00:00-03', '06060606-0606-4606-8606-060606060606',
    '[{"id":"documents","label":"Documentos da frota","status":"passed","notes":"Conferidos no escopo do tenant externo."},{"id":"inspection","label":"Laudo cautelar","status":"passed","notes":"Aprovado para varejo."},{"id":"mechanics","label":"Revisao de entrada","status":"passed","notes":"Manutencao preventiva concluida."},{"id":"merchandising","label":"Fotos e publicacao","status":"passed","notes":"Disponivel apenas na vitrine do tenant externo."}]'::jsonb,
    'Preparacao do tenant externo', 'passed', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000015'
  ),
  (
    '12700000-0000-4000-8000-000000000016', TIMESTAMPTZ '2026-05-08 16:30:00-03', '06060606-0606-4606-8606-060606060606',
    '[{"id":"documents","label":"Documentos do particular","status":"passed","notes":"Transferencia conferida no tenant externo."},{"id":"inspection","label":"Inspecao de longarinas","status":"failed","notes":"Desgaste estrutural acima do criterio de varejo."},{"id":"mechanics","label":"Orcamento de recuperacao","status":"passed","notes":"Orcamento registrado para decisao de margem."},{"id":"merchandising","label":"Preparacao de vitrine","status":"waived","notes":"Dispensada apos arquivamento."}]'::jsonb,
    'Avaliacao estrutural do tenant externo', 'failed', '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', '12100000-0000-4000-8000-000000000016'
  )
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
