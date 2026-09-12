-- A trial is a billing phase of a selected store plan, not the absence of a
-- plan contract. Quota-backed core actions resolve their limits through this
-- row while subscription status controls whether the contract is chargeable.
INSERT INTO "subscription_items" (
  "item_type",
  "plan_id",
  "quantity",
  "starts_at",
  "store_id",
  "subscription_id",
  "tenant_id",
  "unit_amount_cents"
)
SELECT
  'plan',
  selected_plan.id,
  1,
  COALESCE(subscription.current_period_start, now()),
  store.id,
  subscription.id,
  store.tenant_id,
  selected_plan.monthly_price_cents
FROM "subscriptions" AS subscription
JOIN "stores" AS store
  ON store.tenant_id = subscription.tenant_id
JOIN LATERAL (
  SELECT plan.id, plan.monthly_price_cents
  FROM "plans" AS plan
  WHERE plan.status = 'active'
    AND plan.is_default = true
    AND plan.published_at <= now()
  ORDER BY plan.published_at DESC
  LIMIT 1
) AS selected_plan ON true
WHERE subscription.status = 'trialing'
  AND subscription.current_period_end > now()
  AND store.is_deleted = false
  AND NOT EXISTS (
    SELECT 1
    FROM "subscription_items" AS current_item
    WHERE current_item.subscription_id = subscription.id
      AND current_item.store_id = store.id
      AND current_item.tenant_id = store.tenant_id
      AND current_item.item_type = 'plan'
      AND (
        current_item.starts_at IS NULL
        OR current_item.starts_at <= now()
      )
      AND (
        current_item.ends_at IS NULL
        OR current_item.ends_at > now()
      )
  );
