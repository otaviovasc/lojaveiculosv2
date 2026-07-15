-- Local product seed v2.
-- Store profile and public storefront configuration.
-- Included by ../product-test-user.sql inside one transaction.

INSERT INTO store_profiles (
  address_city,
  address_line_1,
  address_state,
  address_zip_code,
  contact_email,
  contact_phone,
  document_number,
  store_id,
  tenant_id,
  whatsapp_phone
)
VALUES (
  'Campinas',
  'Avenida das Amoreiras, 1250',
  'SP',
  '13044-000',
  'test@lojaveiculos.com.br',
  '+5511999999999',
  '11222333000181',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '+5511999999999'
)
ON CONFLICT (store_id) DO UPDATE SET
  address_city = EXCLUDED.address_city,
  address_line_1 = EXCLUDED.address_line_1,
  address_state = EXCLUDED.address_state,
  address_zip_code = EXCLUDED.address_zip_code,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  document_number = EXCLUDED.document_number,
  whatsapp_phone = EXCLUDED.whatsapp_phone,
  updated_at = now();

INSERT INTO store_public_site_settings (
  hero_image_url,
  is_published,
  layout_key,
  seo_description,
  seo_title,
  store_id,
  tenant_id,
  theme
)
VALUES (
  'https://seed-assets.local.test/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg',
  true,
  'showroom',
  'Estoque revisado, pronta entrega e atendimento direto pelo WhatsApp.',
  'Horizonte Seminovos - Veiculos revisados em Campinas',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '{
    "badgeLabel": "Curadoria Horizonte",
    "ctaLabel": "Chamar no WhatsApp",
    "headline": "Seminovos selecionados para compra segura",
    "sections": ["featured", "financing", "trust", "contact"],
    "tone": "premium"
  }'::jsonb
)
ON CONFLICT (store_id) DO UPDATE SET
  hero_image_url = EXCLUDED.hero_image_url,
  is_published = EXCLUDED.is_published,
  layout_key = EXCLUDED.layout_key,
  seo_description = EXCLUDED.seo_description,
  seo_title = EXCLUDED.seo_title,
  theme = EXCLUDED.theme,
  updated_at = now();
