-- Local product seed v2.
-- Document templates, artifacts, versions, and links.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO document_templates (
  id,
  clauses,
  is_enabled,
  kind,
  store_id,
  template_key,
  tenant_id,
  title,
  updated_by_user_id
)
VALUES
  ('50000000-0000-4000-8000-000000000001', '[{"title": "Entrega", "body": "Comprador declara vistoria e recebimento do veiculo."}]'::jsonb, true, 'delivery_term', '66666666-6666-4666-8666-666666666666', 'delivery_term', '77777777-7777-4777-8777-777777777777', 'Termo de entrega padrao', '02020202-0202-4202-8202-020202020202'),
  ('50000000-0000-4000-8000-000000000002', '[{"title": "Pagamento", "body": "Valores e condicoes constam no recibo assinado."}]'::jsonb, true, 'sale_contract', '66666666-6666-4666-8666-666666666666', 'sale_contract', '77777777-7777-4777-8777-777777777777', 'Contrato de venda padrao', '02020202-0202-4202-8202-020202020202'),
  ('50000000-0000-4000-8000-000000000003', '[{"title": "Quitacao", "body": "Vendedor declara recebimento conforme condicoes registradas."}]'::jsonb, true, 'sale_receipt', '66666666-6666-4666-8666-666666666666', 'sale_receipt', '77777777-7777-4777-8777-777777777777', 'Recibo de venda padrao', '02020202-0202-4202-8202-020202020202'),
  ('50000000-0000-4000-8000-000000000004', '[{"title": "Poderes", "body": "Comprador outorga poderes para atos de transferencia veicular."}]'::jsonb, true, 'power_of_attorney', '66666666-6666-4666-8666-666666666666', 'power_of_attorney', '77777777-7777-4777-8777-777777777777', 'Procuracao padrao', '02020202-0202-4202-8202-020202020202'),
  ('50000000-0000-4000-8000-000000000005', '[{"title": "Sinal", "body": "Reserva condicionada ao recebimento do sinal e dados do comprador."}]'::jsonb, true, 'reservation_receipt', '66666666-6666-4666-8666-666666666666', 'reservation_receipt', '77777777-7777-4777-8777-777777777777', 'Recibo de sinal padrao', '02020202-0202-4202-8202-020202020202')
ON CONFLICT (store_id, template_key) DO UPDATE SET
  clauses = EXCLUDED.clauses,
  is_enabled = EXCLUDED.is_enabled,
  kind = EXCLUDED.kind,
  tenant_id = EXCLUDED.tenant_id,
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
  ('51000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', 'contrato-hilux.pdf', 248000, 'sale_contract', '{"saleId": "30000000-0000-4000-8000-000000000001", "saleTitle": "Venda Toyota Hilux SRX", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "sale_contract"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/sale_contract.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Contrato de venda Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', 'recibo-sinal-hb20.pdf', 142000, 'reservation_receipt', '{"listingId": "10000000-0000-4000-8000-000000000003", "listingTitle": "Hyundai HB20 Comfort 2021", "unitId": "11000000-0000-4000-8000-000000000003", "vehicleTitle": "Hyundai HB20 Comfort 2021", "plate": "GHI7J89", "leadId": "20000000-0000-4000-8000-000000000002", "leadName": "Marcos Lima", "documentType": "reservation_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000003/reservation_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de reserva HB20', now() - interval '3 days'),
  ('51000000-0000-4000-8000-000000000003', '03030303-0303-4303-8303-030303030303', 'laudo-audi-a4.pdf', 184000, 'inspection', '{"unitId": "11000000-0000-4000-8000-000000000001", "unitTitle": "Audi A4 Prestige Plus 2.0 TFSI 2022", "plate": "ABC1D23", "buyerName": "Ana Silva", "documentType": "Laudo cautelar"}'::jsonb, 'application/pdf', 'signed', 'seed/documents/laudo-audi-a4.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Laudo cautelar Audi A4', now() - interval '19 days'),
  ('51000000-0000-4000-8000-000000000004', '02020202-0202-4202-8202-020202020202', 'documento-loja.pdf', 124000, 'internal', '{"documentCategory": "Documento geral", "reference": "Documento interno de oficina", "notes": "Importado em grupo geral."}'::jsonb, 'application/pdf', 'issued', 'seed/documents/documento-loja.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Protocolo interno', now() - interval '4 days'),
  ('51000000-0000-4000-8000-000000000005', '04040404-0404-4404-8404-040404040404', 'recibo-pagamento-hilux.pdf', 132000, 'finance_receipt', '{"paymentId": "32000000-0000-4000-8000-000000000001", "financeTitle": "Pagamento de entrada", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "plate": "JKL0M12", "method": "Pix", "amountCents": 4000000}'::jsonb, 'application/pdf', 'issued', 'seed/documents/recibo-pagamento-hilux.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Comprovante de pagamento', now() - interval '2 days'),
  ('51000000-0000-4000-8000-000000000006', '04040404-0404-4404-8404-040404040404', 'recibo-venda-hilux.pdf', 132000, 'sale_receipt', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "sale_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/sale_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de venda Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000007', '04040404-0404-4404-8404-040404040404', 'termo-entrega-hilux.pdf', 150000, 'delivery_term', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "delivery_term"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/delivery_term.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Termo de entrega Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000008', '04040404-0404-4404-8404-040404040404', 'procuracao-hilux.pdf', 156000, 'power_of_attorney', '{"saleId": "30000000-0000-4000-8000-000000000001", "buyerName": "Carla Rocha", "vehicleTitle": "Toyota Hilux SRX 2021", "listingId": "10000000-0000-4000-8000-000000000004", "unitId": "11000000-0000-4000-8000-000000000004", "plate": "JKL0M12", "documentType": "power_of_attorney"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/power_of_attorney.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Procuracao Hilux', now() - interval '11 days'),
  ('51000000-0000-4000-8000-000000000009', '04040404-0404-4404-8404-040404040404', 'recibo-sinal-bmw-m3-preto.pdf', 145000, 'reservation_receipt', '{"listingId": "10000000-0000-4000-8000-000000000002", "listingTitle": "BMW M3 Competition M 2025", "unitId": "11000000-0000-4000-8000-000000000002", "vehicleTitle": "BMW M3 Competition M 2025", "stockNumber": "LV-M3-PRETO", "leadId": "20000000-0000-4000-8000-000000000002", "leadName": "Marcos Lima", "documentType": "reservation_receipt"}'::jsonb, 'application/pdf', 'issued', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000002/reservation_receipt.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'Recibo de reserva BMW M3 Preto', now() - interval '1 day')
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
  ('53000000-0000-4000-8000-000000000001', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000001', 'contrato-hilux-v1.pdf', 248000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/sale_contract-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000002', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000002', 'recibo-sinal-hb20-v1.pdf', 142000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000003/versions/reservation_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000003', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000006', 'recibo-venda-hilux-v1.pdf', 132000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/sale_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000004', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000007', 'termo-entrega-hilux-v1.pdf', 150000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/delivery_term-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000005', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000008', 'procuracao-hilux-v1.pdf', 156000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000004/versions/power_of_attorney-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1),
  ('53000000-0000-4000-8000-000000000006', '04040404-0404-4404-8404-040404040404', '51000000-0000-4000-8000-000000000009', 'recibo-sinal-bmw-m3-preto-v1.pdf', 145000, 'application/pdf', 'generated/vehicle-workflows/11000000-0000-4000-8000-000000000002/versions/reservation_receipt-v1.pdf', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 1)
ON CONFLICT (document_id, version_number) DO UPDATE SET
  created_by_user_id = EXCLUDED.created_by_user_id,
  file_name = EXCLUDED.file_name,
  file_size_bytes = EXCLUDED.file_size_bytes,
  mime_type = EXCLUDED.mime_type,
  storage_key = EXCLUDED.storage_key,
  store_id = EXCLUDED.store_id,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();
