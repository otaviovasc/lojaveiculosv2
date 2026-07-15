-- Local product seed v2 postconditions.
-- Keep this file free of writes: failures roll the whole seed transaction back.

DO $$
DECLARE
  mismatch_count integer;
  scoped_table record;
BEGIN
  IF (
    SELECT count(*)
    FROM stores
    WHERE tenant_id = '77777777-7777-4777-8777-777777777777'
      AND id IN (
        '66666666-6666-4666-8666-666666666666',
        '66666666-6666-4666-8666-666666666667'
      )
      AND is_deleted = false
  ) <> 2 THEN
    RAISE EXCEPTION 'seed invariant: primary tenant store topology is incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stores
    WHERE id = '66666666-6666-4666-8666-666666666668'
      AND tenant_id = '77777777-7777-4777-8777-777777777778'
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'seed invariant: isolation tenant store is missing';
  END IF;

  IF (
    SELECT count(DISTINCT seed_user.id)
    FROM store_memberships membership
    JOIN users seed_user ON seed_user.id = membership.user_id
    WHERE seed_user.clerk_user_id IN (
      'clerk_seed_owner',
      'clerk_seed_supervisor',
      'clerk_seed_salesman',
      'clerk_seed_branch_salesman',
      'clerk_seed_isolation_owner'
    )
      AND membership.status = 'active'
  ) <> 5 THEN
    RAISE EXCEPTION 'seed invariant: active persona memberships are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM identity_invitations
    WHERE id = '08080808-0808-4808-8808-080808080808'
      AND status = 'pending'
      AND clerk_invitation_id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed invariant: pending local invitation is missing';
  END IF;

  IF EXISTS (
    WITH expected(role_key, expected_count) AS (
      VALUES
        ('agency'::role_template_key, 94),
        ('admin'::role_template_key, 88),
        ('owner'::role_template_key, 94),
        ('investor'::role_template_key, 13),
        ('salesman'::role_template_key, 44),
        ('supervisor'::role_template_key, 72)
    )
    SELECT 1
    FROM expected
    JOIN role_templates template ON template.role_key = expected.role_key
    LEFT JOIN role_template_permissions permission
      ON permission.role_template_id = template.id
    GROUP BY expected.role_key, expected.expected_count
    HAVING count(permission.id) <> expected.expected_count
  ) THEN
    RAISE EXCEPTION 'seed invariant: runtime permission projection drifted';
  END IF;

  FOR scoped_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('store_id', 'tenant_id')
    GROUP BY table_name
    HAVING count(DISTINCT column_name) = 2
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I row_scope '
      'JOIN public.stores store_scope ON store_scope.id = row_scope.store_id '
      'WHERE row_scope.tenant_id IN ($1, $2) '
      'AND row_scope.tenant_id <> store_scope.tenant_id',
      scoped_table.table_name
    )
    INTO mismatch_count
    USING
      '77777777-7777-4777-8777-777777777777'::uuid,
      '77777777-7777-4777-8777-777777777778'::uuid;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION 'seed invariant: % has % tenant/store scope mismatch(es)',
        scoped_table.table_name,
        mismatch_count;
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE id = '14141414-1414-4414-8414-141414141414'
      AND tenant_id = '77777777-7777-4777-8777-777777777777'
      AND status = 'past_due'
      AND current_period_start < current_period_end
      AND current_period_end < now()
  ) THEN
    RAISE EXCEPTION 'seed invariant: primary shared subscription must be past due';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE id = '25000000-0000-4000-8000-000000000003'
      AND tenant_id = '77777777-7777-4777-8777-777777777778'
      AND status = 'trialing'
      AND current_period_start <= now()
      AND current_period_end > now()
  ) THEN
    RAISE EXCEPTION 'seed invariant: isolation subscription must be in trial';
  END IF;

  IF (
    SELECT count(*)
    FROM subscription_items
    WHERE subscription_id = '14141414-1414-4414-8414-141414141414'
      AND ends_at IS NULL
  ) <> 4 THEN
    RAISE EXCEPTION 'seed invariant: shared subscription allocations are incomplete';
  END IF;

  IF (
    SELECT count(*)
    FROM subscription_items
    WHERE subscription_id = '25000000-0000-4000-8000-000000000003'
      AND ends_at IS NULL
  ) <> 0 THEN
    RAISE EXCEPTION 'seed invariant: trial must not contain contracted items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM subscription_items item
    LEFT JOIN plans plan ON plan.id = item.plan_id
    LEFT JOIN addons addon ON addon.id = item.addon_id
    WHERE item.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND (
        item.quantity <= 0
        OR (
          item.item_type = 'plan'
          AND (
            item.plan_id IS NULL
            OR item.addon_id IS NOT NULL
            OR item.unit_amount_cents <> plan.monthly_price_cents
          )
        )
        OR (
          item.item_type = 'addon'
          AND (
            item.addon_id IS NULL
            OR item.plan_id IS NOT NULL
            OR item.unit_amount_cents <> addon.monthly_price_cents
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: subscription items drifted from catalog pricing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM store_entitlements entitlement
    WHERE entitlement.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND entitlement.source = 'billing_catalog'
      AND NOT (
        entitlement.status = 'trialing'
        AND entitlement.metadata->>'sourceDetail' = 'safe_trial_catalog'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscription_items item
        JOIN plan_features feature ON feature.plan_id = item.plan_id
        WHERE item.store_id = entitlement.store_id
          AND item.tenant_id = entitlement.tenant_id
          AND item.item_type = 'plan'
          AND item.ends_at IS NULL
          AND feature.feature_key = entitlement.feature_key
          AND feature.included = 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscription_items item
        JOIN addons addon ON addon.id = item.addon_id
        WHERE item.store_id = entitlement.store_id
          AND item.tenant_id = entitlement.tenant_id
          AND item.item_type = 'addon'
          AND item.ends_at IS NULL
          AND addon.feature_key = entitlement.feature_key
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: catalog entitlement has no matching chargeable item';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM store_entitlements entitlement
    WHERE entitlement.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND (
        entitlement.source NOT IN ('billing_catalog', 'local_seed_override')
        OR (
          entitlement.source = 'local_seed_override'
          AND (
            entitlement.metadata->>'fixture' IS DISTINCT FROM 'local_seed'
            OR entitlement.metadata->>'overrideContractVersion'
              IS DISTINCT FROM '2026-07-capability-v1'
            OR COALESCE(entitlement.metadata->>'reason', '') = ''
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: entitlement source is not catalog or explicit override';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM store_entitlements
    WHERE tenant_id = '77777777-7777-4777-8777-777777777777'
      AND source = 'billing_catalog'
      AND (
        status = 'trialing'
        OR metadata->>'billingStatus' IS DISTINCT FROM 'past_due'
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: shared-account entitlements contradict dunning';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM store_entitlements entitlement
    JOIN subscriptions subscription
      ON subscription.id = '25000000-0000-4000-8000-000000000003'
    WHERE entitlement.store_id = '66666666-6666-4666-8666-666666666668'
      AND entitlement.source = 'billing_catalog'
      AND (
        entitlement.status <> 'trialing'
        OR entitlement.starts_at IS DISTINCT FROM subscription.current_period_start
        OR entitlement.ends_at IS DISTINCT FROM subscription.current_period_end
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: trial entitlements must inherit subscription dates';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM payments payment
    WHERE payment.id = '25000000-0000-4000-8000-000000000021'
      AND payment.amount_cents <> (
        SELECT sum(item.quantity * item.unit_amount_cents)::integer
        FROM subscription_items item
        WHERE item.subscription_id = payment.subscription_id
          AND item.ends_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: billing payment does not match subscription items';
  END IF;
END
$$;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM vehicle_listings
    WHERE id::text LIKE '12000000-%'
  ) <> 16 THEN
    RAISE EXCEPTION 'seed invariant: inventory scenario matrix is incomplete';
  END IF;

  IF (
    SELECT count(*)
    FROM vehicle_unit_acquisitions
    WHERE id::text LIKE '12300000-%'
  ) <> 16 THEN
    RAISE EXCEPTION 'seed invariant: acquisition provenance is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vehicle_units unit
    WHERE unit.id IN (
      '11000000-0000-4000-8000-000000000002',
      '11000000-0000-4000-8000-000000000003'
    )
      AND (
        unit.status <> 'reserved'
        OR NOT EXISTS (
          SELECT 1
          FROM sales sale
          JOIN sale_payments payment ON payment.sale_id = sale.id
          JOIN finance_entry_links payment_link
            ON payment_link.target_type = 'sale_payment'
            AND payment_link.target_id = payment.id
          WHERE sale.unit_id = unit.id
            AND sale.status = 'pending'
            AND sale.is_current_revision = true
            AND sale.is_deleted = false
            AND payment.status = 'pending'
        )
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: reserved unit graph is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vehicle_costs cost
    WHERE cost.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM finance_entry_links link
        JOIN finance_entries entry ON entry.id = link.entry_id
        WHERE link.target_type = 'vehicle_cost'
          AND link.target_id = cost.id
          AND entry.type = 'expense'
          AND entry.amount_cents = cost.amount_cents
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: vehicle cost/finance parity is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM sale_payments payment
    WHERE payment.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND payment.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1
        FROM finance_entry_links link
        JOIN finance_entries entry ON entry.id = link.entry_id
        WHERE link.target_type = 'sale_payment'
          AND link.target_id = payment.id
          AND entry.amount_cents = payment.amount_cents
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: sale payment/finance parity is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM sales sale
    WHERE sale.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND sale.status = 'closed'
      AND (
        sale.sale_price_cents IS NULL
        OR sale.sale_price_cents IS DISTINCT FROM (
          SELECT COALESCE(sum(item.amount_cents), 0)::integer
          FROM sale_items item
          WHERE item.sale_id = sale.id
        )
        OR sale.sale_price_cents IS DISTINCT FROM (
          SELECT COALESCE(sum(payment.amount_cents), 0)::integer
          FROM sale_payments payment
          WHERE payment.sale_id = sale.id
            AND payment.status <> 'cancelled'
        )
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: closed sale totals do not match price';
  END IF;

  IF EXISTS (
    WITH latest_price AS (
      SELECT DISTINCT ON (listing_id)
        listing_id,
        new_price_cents
      FROM vehicle_price_history
      WHERE tenant_id IN (
        '77777777-7777-4777-8777-777777777777',
        '77777777-7777-4777-8777-777777777778'
      )
      ORDER BY listing_id, changed_at DESC, id DESC
    )
    SELECT 1
    FROM latest_price
    JOIN vehicle_listings listing ON listing.id = latest_price.listing_id
    WHERE latest_price.new_price_cents IS DISTINCT FROM listing.asking_price_cents
  ) THEN
    RAISE EXCEPTION 'seed invariant: latest price history does not match inventory';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vehicle_checklists checklist
    CROSS JOIN LATERAL jsonb_array_elements(checklist.items) item
    WHERE checklist.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND NOT (
        item ? 'id'
        AND item ? 'label'
        AND item ? 'status'
        AND item ? 'notes'
        AND item->>'status' IN ('pending', 'in_progress', 'passed', 'failed', 'waived')
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: checklist items do not match the runtime contract';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payments
    WHERE raw->>'fixture' IN ('local_seed', 'true')
      AND (status = 'paid' OR paid_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'seed invariant: synthetic Asaas payment success is forbidden';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM integration_jobs
    WHERE metadata->>'fixture' = 'true'
      AND status IN ('queued', 'running', 'succeeded')
  ) THEN
    RAISE EXCEPTION 'seed invariant: marketplace fixture may not enqueue or claim success';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM fiscal_documents
    WHERE metadata->>'fixture' = 'true'
      AND (
        status = 'issued'
        OR issued_at IS NOT NULL
        OR access_key IS NOT NULL
        OR provider_document_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: synthetic fiscal success is forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM crm_connections
    WHERE id = '24000000-0000-4000-8000-000000000101'
      AND provider = 'zapi'
      AND status = 'sandbox'
      AND credentials_ref->>'mode' = 'env'
      AND metadata->>'officialOperation' = 'false'
      AND phone IS NULL
      AND external_connection_id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed invariant: ZAPI must remain an unverified env-backed sandbox';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM crm_whatsapp_messages
    WHERE metadata->>'source' = 'local_seed'
      AND (
        (direction = 'INBOUND' AND status <> 'DELIVERED')
        OR (direction = 'OUTBOUND' AND status <> 'PENDING')
        OR channel_message_id IS NOT NULL
        OR external_id IS NOT NULL
        OR provider_timestamp IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: WhatsApp fixture status/evidence is unsafe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM automation_runs
    WHERE tenant_id = '77777777-7777-4777-8777-777777777777'
      AND execution_enabled = true
  ) THEN
    RAISE EXCEPTION 'seed invariant: automation fixture must remain preview-only';
  END IF;
END
$$;
