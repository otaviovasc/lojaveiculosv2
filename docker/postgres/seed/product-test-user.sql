\set ON_ERROR_STOP on
\echo '[seed] Loading Loja Veiculos local product scenario v2'

BEGIN;

SELECT pg_advisory_xact_lock(
  hashtextextended('lojaveiculosv2:local-product-seed:v2', 0)
);

\ir product/05-reserved-keys.sql
\ir product/10-identity.sql
\ir product/15-account-scenarios.sql
\ir product/16-role-permissions.sql
\ir product/20-billing.sql
\ir product/25-commercial-scenarios.sql
\ir product/30-storefront.sql
\ir product/35-storefront-scenarios.sql
\ir product/40-inventory.sql
\ir product/50-crm.sql
\ir product/45-inventory-scenarios.sql
\ir product/55-crm-scenarios.sql
\ir product/60-sales-finance.sql
\ir product/65-workflow-scenarios.sql
\ir product/70-documents.sql
\ir product/80-provider-fixtures.sql
\ir product/85-automation-scenarios.sql
\ir product/90-invariants.sql

COMMIT;

\echo '[seed] Product scenario v2 committed'
