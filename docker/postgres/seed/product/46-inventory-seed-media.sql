-- Materialized vehicle photos for the local product fixture.
-- Sources are Wikimedia Commons files selected to match each listing title.
-- The R2 repair step downloads these files into the local/development `l/`
-- namespace and records attribution in vehicle_media.metadata.

UPDATE vehicle_listings
SET
  metadata = jsonb_set(metadata, '{mediaScenario}', '"real_photos"'::jsonb),
  updated_at = now()
WHERE metadata->>'mediaScenario' = 'missing_photos';

DELETE FROM vehicle_media
WHERE id IN (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002',
  '12000000-0000-4000-8000-000000000004',
  '12000000-0000-4000-8000-000000000005',
  '12000000-0000-4000-8000-000000000006',
  '12000000-0000-4000-8000-000000000007',
  '12000000-0000-4000-8000-000000000008'
);

-- The storefront fixture reuses the original Audi/BMW media rows. Keep those
-- references aligned with the new vehicle-media namespace and real object
-- sizes so storefront R2 QA checks the same materialized images.
UPDATE storefront_media_assets
SET
  content_type = 'image/jpeg',
  public_url = 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg',
  size_bytes = 504175,
  storage_key = 'l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg',
  updated_at = now()
WHERE id = '35000000-0000-4000-8000-000000000031';

UPDATE storefront_media_assets
SET
  content_type = 'image/jpeg',
  public_url = 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000002/bmw-m3-g80.jpg',
  size_bytes = 502640,
  storage_key = 'l/seed/vehicles/11000000-0000-4000-8000-000000000002/bmw-m3-g80.jpg',
  updated_at = now()
WHERE id = '35000000-0000-4000-8000-000000000032';

UPDATE store_public_site_settings
SET
  hero_image_url = replace(
    hero_image_url,
    'https://seed-assets.local.test/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg',
    'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg'
  ),
  updated_at = now()
WHERE hero_image_url like '%1782407801644-bd8dd971%';

UPDATE store_custom_pages
SET
  components = replace(
    replace(components::text,
      'https://seed-assets.local.test/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg',
      'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg'
    ),
    'https://seed-assets.local.test/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000002/photo/1782407806409-bb4385a0-3929-4af3-a4c3-a67f6b9b4f79-bmw-m3-preto-1.webp',
    'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000002/bmw-m3-g80.jpg'
  )::jsonb,
  seo = replace(
    seo::text,
    'https://seed-assets.local.test/tenants/77777777-7777-4777-8777-777777777777/stores/66666666-6666-4666-8666-666666666666/units/11000000-0000-4000-8000-000000000001/photo/1782407801644-bd8dd971-8e59-418f-9e65-5cdd1c5046f1-audi-a4-preto-1.jpg',
    'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg'
  )::jsonb,
  updated_at = now()
WHERE components::text like '%1782407801644-bd8dd971%'
   OR components::text like '%1782407806409-bb4385a0%'
   OR seo::text like '%1782407801644-bd8dd971%';

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
  (
    '12000000-0000-4000-8000-000000000101', 'Audi A4 Prestige Plus 2.0 TFSI 2022', 0, true, 'photo',
    '11000000-0000-4000-8000-000000000001',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'audi-a4-b9.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Alexander-93', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Audi_A4_B9_sedans_%28FL%29_1X7A6817.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Audi_A4_B9_sedans_%28FL%29_1X7A6817.jpg/1920px-Audi_A4_B9_sedans_%28FL%29_1X7A6817.jpg'),
    'l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000001/audi-a4-b9.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000102', 'BMW M3 Competition M 2025 preto', 0, true, 'photo',
    '11000000-0000-4000-8000-000000000002',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'bmw-m3-g80.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Charles from Port Chester, New York', 'sourceLicense', 'CC BY 2.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg/1920px-BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg'),
    'l/seed/vehicles/11000000-0000-4000-8000-000000000002/bmw-m3-g80.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000002/bmw-m3-g80.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000103', 'Hyundai HB20 Comfort 2021', 0, true, 'photo',
    '11000000-0000-4000-8000-000000000003',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'hyundai-hb20.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Samtyler654', 'sourceLicense', 'CC BY-SA 3.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Red_hyundai_hb20.JPG', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Red_hyundai_hb20.JPG'),
    'l/seed/vehicles/11000000-0000-4000-8000-000000000003/hyundai-hb20.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000003/hyundai-hb20.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000104', 'Toyota Hilux SRX 2021', 0, true, 'photo',
    '11000000-0000-4000-8000-000000000004',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'toyota-hilux.jpg', 'source', 'r2_seed', 'sourceAuthor', 'crash71100', 'sourceLicense', 'CC0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Toyota_Hilux_%2853527725225%29.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Toyota_Hilux_%2853527725225%29.jpg/1920px-Toyota_Hilux_%2853527725225%29.jpg'),
    'l/seed/vehicles/11000000-0000-4000-8000-000000000004/toyota-hilux.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000004/toyota-hilux.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000105', 'BMW M3 Competition M 2025 verde', 0, true, 'photo',
    '11000000-0000-4000-8000-000000000005',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'bmw-m3-g80.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Charles from Port Chester, New York', 'sourceLicense', 'CC BY 2.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg/1920px-BMW_M3_%28G80%2C_2022%29_%2852915614161%29.jpg'),
    'l/seed/vehicles/11000000-0000-4000-8000-000000000005/bmw-m3-g80.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/11000000-0000-4000-8000-000000000005/bmw-m3-g80.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000106', 'Volkswagen T-Cross Comfortline 200 TSI 2023', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000001',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'volkswagen-t-cross.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Alexander-93', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Volkswagen_T-Cross_%282023%29_IMG_8622.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Volkswagen_T-Cross_%282023%29_IMG_8622.jpg/1920px-Volkswagen_T-Cross_%282023%29_IMG_8622.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000001/volkswagen-t-cross.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000001/volkswagen-t-cross.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000107', 'Chevrolet Onix Premier 1.0 Turbo 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000002',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'chevrolet-onix-premier.jpg', 'source', 'r2_seed', 'sourceAuthor', 'RL GNZLZ from Chile', 'sourceLicense', 'CC BY-SA 2.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Chevrolet_Onix_Turbo_Premier_2023_%2853298952614%29.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Chevrolet_Onix_Turbo_Premier_2023_%2853298952614%29.jpg/1920px-Chevrolet_Onix_Turbo_Premier_2023_%2853298952614%29.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000002/chevrolet-onix-premier.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000002/chevrolet-onix-premier.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000108', 'Fiat Toro Volcano 2.0 Diesel 4x4 2021', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000003',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'fiat-toro-volcano.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Diego HC', 'sourceLicense', 'CC0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Fiat_Toro_Volcano.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Fiat_Toro_Volcano.jpg/1920px-Fiat_Toro_Volcano.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000003/fiat-toro-volcano.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000003/fiat-toro-volcano.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000109', 'Honda HR-V Touring 1.5 Turbo 2023', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000004',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'honda-hr-v.jpg', 'source', 'r2_seed', 'sourceAuthor', 'M 93', 'sourceLicense', 'CC BY-SA 3.0 DE', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Honda_HR-V_eHEV_Advance_%28III%29_%E2%80%93_h_31122023.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Honda_HR-V_eHEV_Advance_%28III%29_%E2%80%93_h_31122023.jpg/1920px-Honda_HR-V_eHEV_Advance_%28III%29_%E2%80%93_h_31122023.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000004/honda-hr-v.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000004/honda-hr-v.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000110', 'Toyota Corolla Altis Premium Hybrid 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000005',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'toyota-corolla-altis-hybrid.jpg', 'source', 'r2_seed', 'sourceAuthor', 'オーバードライブ83', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:2022_Toyota_Corolla_Altis_1.8_Hybrid_ZWE211R_%2820220317%29_01.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/2022_Toyota_Corolla_Altis_1.8_Hybrid_ZWE211R_%2820220317%29_01.jpg/1920px-2022_Toyota_Corolla_Altis_1.8_Hybrid_ZWE211R_%2820220317%29_01.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000005/toyota-corolla-altis-hybrid.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000005/toyota-corolla-altis-hybrid.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000111', 'Jeep Compass Limited TD350 4x4 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000006',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'jeep-compass.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Dinkun Chen', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:JEEP_COMPASS_%28MP%29_China.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/JEEP_COMPASS_%28MP%29_China.jpg/1920px-JEEP_COMPASS_%28MP%29_China.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000006/jeep-compass.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000006/jeep-compass.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000112', 'Renault Kwid Zen 1.0 2021', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000007',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'renault-kwid.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Jason Lawrence', 'sourceLicense', 'CC BY 2.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Renault_Kwid.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Renault_Kwid.jpg/1920px-Renault_Kwid.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000007/renault-kwid.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000007/renault-kwid.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000113', 'Ford Ranger Limited 3.2 4x4 2020', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000008',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'ford-ranger.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Bull-Doser', 'sourceLicense', 'Public domain', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Ford_Ranger_4_puertas.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ford_Ranger_4_puertas.jpg/1920px-Ford_Ranger_4_puertas.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000008/ford-ranger.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000008/ford-ranger.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000114', 'Nissan Kicks Exclusive 1.6 2023', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000009',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'nissan-kicks.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Bull-Doser', 'sourceLicense', 'Public domain', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:2023_Nissan_Kicks_au_SIAM_2023.JPG', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2023_Nissan_Kicks_au_SIAM_2023.JPG/1920px-2023_Nissan_Kicks_au_SIAM_2023.JPG'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000009/nissan-kicks.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000009/nissan-kicks.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000115', 'Volkswagen Nivus Highline 200 TSI 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000010',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'volkswagen-nivus.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Pdamico2009', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Volkswagen_Nivus_200_TSI_Comfortline.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Volkswagen_Nivus_200_TSI_Comfortline.jpg/1920px-Volkswagen_Nivus_200_TSI_Comfortline.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000010/volkswagen-nivus.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000010/volkswagen-nivus.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000116', 'BYD Dolphin GS Eletrico 2024', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000011',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'byd-dolphin.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Wikisympathisant', 'sourceLicense', 'CC0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:2024-08_BYD_Dolphin.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/2024-08_BYD_Dolphin.jpg/1920px-2024-08_BYD_Dolphin.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000011/byd-dolphin.jpg',
    '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000011/byd-dolphin.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000117', 'Chevrolet Tracker Premier 1.2 Turbo 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000012',
    jsonb_build_object('contentType', 'image/png', 'fileName', 'chevrolet-tracker.png', 'source', 'r2_seed', 'sourceAuthor', 'Autosdeprimera', 'sourceLicense', 'CC BY 3.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Chevrolet_Tracker_2021_%28front%29.png', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chevrolet_Tracker_2021_%28front%29.png'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000012/chevrolet-tracker.png',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000012/chevrolet-tracker.png'
  ),
  (
    '12000000-0000-4000-8000-000000000118', 'Hyundai Creta Platinum 2.0 2021', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000013',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'hyundai-creta.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Captainmorlypogi1959', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Hyundai_Creta_1.5_GL_2021_%281%29.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Hyundai_Creta_1.5_GL_2021_%281%29.jpg/1920px-Hyundai_Creta_1.5_GL_2021_%281%29.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000013/hyundai-creta.jpg',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000013/hyundai-creta.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000119', 'Fiat Strada Freedom Cabine Dupla 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000014',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'fiat-strada.jpg', 'source', 'r2_seed', 'sourceAuthor', 'NaBUru38', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Fiat_Strada_Freedom_Mk6_with_topper_in_Montevideo.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Fiat_Strada_Freedom_Mk6_with_topper_in_Montevideo.jpg/1920px-Fiat_Strada_Freedom_Mk6_with_topper_in_Montevideo.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000014/fiat-strada.jpg',
    '66666666-6666-4666-8666-666666666667', '77777777-7777-4777-8777-777777777777', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000014/fiat-strada.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000120', 'Toyota Yaris XL Live 1.5 2022', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000015',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'toyota-yaris.jpg', 'source', 'r2_seed', 'sourceAuthor', 'JamesYoung8167', 'sourceLicense', 'CC BY-SA 4.0', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Toyota_Yaris_L_hatch_facelift_Shishi_02_2022-04-23.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Toyota_Yaris_L_hatch_facelift_Shishi_02_2022-04-23.jpg/1920px-Toyota_Yaris_L_hatch_facelift_Shishi_02_2022-04-23.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000015/toyota-yaris.jpg',
    '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000015/toyota-yaris.jpg'
  ),
  (
    '12000000-0000-4000-8000-000000000121', 'Volkswagen Saveiro Robust 1.6 2021', 0, true, 'photo',
    '12100000-0000-4000-8000-000000000016',
    jsonb_build_object('contentType', 'image/jpeg', 'fileName', 'volkswagen-saveiro.jpg', 'source', 'r2_seed', 'sourceAuthor', 'Bull-Doser', 'sourceLicense', 'Public domain', 'sourcePage', 'https://commons.wikimedia.org/wiki/File:Volkswagen_Saveiro_Mk6_Robust.jpg', 'sourceUrl', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Volkswagen_Saveiro_Mk6_Robust.jpg'),
    'l/seed/vehicles/12100000-0000-4000-8000-000000000016/volkswagen-saveiro.jpg',
    '66666666-6666-4666-8666-666666666668', '77777777-7777-4777-8777-777777777778', 'https://seed-assets.local.test/l/seed/vehicles/12100000-0000-4000-8000-000000000016/volkswagen-saveiro.jpg'
  )
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
