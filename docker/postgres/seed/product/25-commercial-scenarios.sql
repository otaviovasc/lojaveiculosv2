-- Billing v3 deliberately has no synthetic trial, paid-contract, add-on, or
-- provider-success scenario. Paid tiers are exercised through fresh sandbox
-- plan hires so access can only follow verified provider evidence.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM subscription_items item
    WHERE item.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND item.ends_at IS NULL
      AND item.item_type <> 'plan'
  ) THEN
    RAISE EXCEPTION 'seed invariant: local billing cannot activate add-ons';
  END IF;
END
$$;
