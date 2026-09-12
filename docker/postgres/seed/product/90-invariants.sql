-- Local product seed v3 postconditions.
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
        ('agency'::role_template_key, 116),
        ('admin'::role_template_key, 108),
        ('owner'::role_template_key, 116),
        ('investor'::role_template_key, 15),
        ('salesman'::role_template_key, 48),
        ('supervisor'::role_template_key, 81)
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

  IF EXISTS (
    SELECT 1
    FROM role_template_permissions
    WHERE permission_key ~ '^crm[.]whatsapp[.]'
  ) OR EXISTS (
    SELECT 1
    FROM membership_permission_overrides
    WHERE permission_key ~ '^crm[.]whatsapp[.]'
  ) THEN
    RAISE EXCEPTION 'seed invariant: legacy CRM connection permission remains';
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
  IF (
    SELECT count(*)
    FROM plans
    WHERE catalog_version = '2026-08-v3'
      AND status = 'active'
      AND (code, monthly_price_cents) IN (
        ('free', 0),
        ('essencial', 19700),
        ('operacao', 39700),
        ('gestao', 59700),
        ('escala', 89700)
      )
  ) <> 5 THEN
    RAISE EXCEPTION 'seed invariant: billing v3 plan catalog is incomplete';
  END IF;

  IF EXISTS (SELECT 1 FROM addons WHERE status = 'active') THEN
    RAISE EXCEPTION 'seed invariant: billing v3 cannot expose active add-ons';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM plan_features feature
    JOIN plans plan ON plan.id = feature.plan_id
    WHERE plan.catalog_version = '2026-08-v3'
      AND (feature.included_in_trial OR feature.trial_limit_value IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'seed invariant: billing v3 cannot retain trial semantics';
  END IF;

  IF (
    SELECT count(*)
    FROM stores store
    WHERE store.id IN (
      '66666666-6666-4666-8666-666666666666',
      '66666666-6666-4666-8666-666666666667',
      '66666666-6666-4666-8666-666666666668'
    )
      AND (
        SELECT count(*)
        FROM subscription_items item
        JOIN plans plan ON plan.id = item.plan_id
        WHERE item.store_id = store.id
          AND item.tenant_id = store.tenant_id
          AND item.ends_at IS NULL
          AND item.item_type = 'plan'
          AND item.addon_id IS NULL
          AND item.unit_amount_cents = 0
          AND plan.catalog_version = '2026-08-v3'
          AND plan.code = 'free'
      ) = 1
  ) <> 3 THEN
    RAISE EXCEPTION 'seed invariant: every store must have one effective Free contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM subscription_items item
    WHERE item.tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND item.ends_at IS NULL
      AND item.item_type = 'addon'
  ) THEN
    RAISE EXCEPTION 'seed invariant: local stores cannot have effective add-ons';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND (status <> 'active' OR current_period_end IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'seed invariant: Free subscriptions must be active and open-ended';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stores store
    WHERE store.id IN (
      '66666666-6666-4666-8666-666666666666',
      '66666666-6666-4666-8666-666666666667',
      '66666666-6666-4666-8666-666666666668'
    )
      AND (
        SELECT count(*)
        FROM store_entitlements entitlement
        WHERE entitlement.store_id = store.id
          AND entitlement.tenant_id = store.tenant_id
          AND entitlement.status = 'active'
          AND entitlement.ends_at IS NULL
          AND entitlement.source = 'billing_catalog'
          AND entitlement.feature_key IN (
            'storefront', 'inventory', 'lead_capture', 'plate_lookup'
          )
          AND entitlement.metadata->>'catalogVersion' = '2026-08-v3'
          AND entitlement.metadata->>'planCode' = 'free'
      ) <> 4
  ) THEN
    RAISE EXCEPTION 'seed invariant: Free entitlement projection is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM store_entitlements
    WHERE tenant_id IN (
      '77777777-7777-4777-8777-777777777777',
      '77777777-7777-4777-8777-777777777778'
    )
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
      AND feature_key NOT IN (
        'storefront', 'inventory', 'lead_capture', 'plate_lookup'
      )
  ) THEN
    RAISE EXCEPTION 'seed invariant: Free stores expose a paid entitlement';
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
    FROM crm_channel_connections
    WHERE id = '24000000-0000-4000-8000-000000000101'
      AND provider = 'zapi'
      AND channel = 'whatsapp'
      AND broker = 'direct'
      AND state = 'sandbox'
      AND metadata->>'officialOperation' = 'false'
      AND external_connection_id IS NULL
  ) THEN
    RAISE EXCEPTION 'seed invariant: ZAPI must remain an unverified direct sandbox';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM crm_messages
    WHERE metadata->>'source' = 'local_seed'
      AND (
        (direction = 'inbound' AND status <> 'delivered')
        OR (direction = 'outbound' AND status <> 'pending')
        OR provider_message_id IS NOT NULL
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
