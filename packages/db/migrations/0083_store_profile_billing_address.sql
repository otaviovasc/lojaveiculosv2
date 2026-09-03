ALTER TABLE "store_profiles"
  ADD COLUMN IF NOT EXISTS "address_number" varchar(32);
ALTER TABLE "store_profiles"
  ADD COLUMN IF NOT EXISTS "address_district" varchar(120);
