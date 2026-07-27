import { targetId } from "./common.mjs";
import { progress } from "./log.mjs";
import { addLegacyMap } from "./target-support.mjs";

export async function seedBillingRecords(
  tx,
  billing,
  subscriptionId,
  config,
  ids,
) {
  await seedEntitlements(tx, billing.entitlements, config, ids);
  await seedPayments(tx, billing.payments, subscriptionId, config, ids);
}

async function seedEntitlements(tx, entitlements, config, ids) {
  const selected = new Set(entitlements.map((row) => row.featureKey));
  const stale = await tx`SELECT id, feature_key, status FROM store_entitlements
    WHERE store_id=${ids.store}
      AND (source IN ('v1_migration_manifest', 'v1_migration_contract')
        OR metadata->>'migrationSource'='v1_store')`;
  for (const row of stale) {
    if (selected.has(row.feature_key)) continue;
    await tx`UPDATE store_entitlements
      SET ends_at=now(),
        metadata=jsonb_set(metadata, '{migrationSelected}', 'false'::jsonb, true),
        status='inactive',
        updated_at=now()
      WHERE id=${row.id}`;
    await seedEvent(tx, row.feature_key, row.status, "inactive", ids);
  }

  for (const entitlement of entitlements) {
    const [before] = await tx`SELECT id, source, status FROM store_entitlements
      WHERE store_id=${ids.store} AND feature_key=${entitlement.featureKey}
      LIMIT 1`;
    const metadata = {
      legacyAddons: entitlement.legacyAddons.map(safeAddonMetadata),
      legacySources: entitlement.sources,
      migrationRunId: ids.run,
      migrationSelected: true,
      migrationSource: "v1_store",
    };
    const [stored] = await tx`INSERT INTO store_entitlements
      (id, ends_at, feature_key, metadata, source, starts_at, status,
       store_id, tenant_id, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "entitlement", entitlement.featureKey)},
        ${entitlement.endsAt}, ${entitlement.featureKey}, ${tx.json(metadata)},
        'billing_catalog', ${entitlement.startsAt}, ${entitlement.status},
        ${ids.store}, ${ids.tenant},
        now(), now())
      ON CONFLICT (store_id, feature_key) DO UPDATE SET
        ends_at=excluded.ends_at,
        metadata=excluded.metadata,
        source=excluded.source,
        starts_at=COALESCE(
          LEAST(store_entitlements.starts_at, excluded.starts_at),
          store_entitlements.starts_at,
          excluded.starts_at
        ),
        status=excluded.status,
        updated_at=now()
      WHERE store_entitlements.source IN ('v1_migration_manifest', 'v1_migration_contract')
        OR store_entitlements.metadata->>'migrationSource'='v1_store'
      RETURNING id`;
    if (stored)
      await seedEvent(
        tx,
        entitlement.featureKey,
        before?.status ?? null,
        entitlement.status,
        ids,
      );
    for (const addon of entitlement.legacyAddons)
      await addLegacyMap(
        tx,
        ids.run,
        "LojaAddon",
        addon.id,
        "store_entitlements",
        stored?.id ?? before?.id,
      );
  }
}

async function seedEvent(tx, featureKey, previousStatus, nextStatus, ids) {
  if (previousStatus === nextStatus) return;
  await tx`INSERT INTO store_entitlement_events
    (id, actor_id, feature_key, metadata, next_status, previous_status, reason,
     source, store_id, tenant_id, created_at, updated_at)
    VALUES (${targetId(ids.store, "v1_entitlement_event", `${featureKey}:${nextStatus}`)},
      'v1-store-migration', ${featureKey},
      ${tx.json({ migrationRunId: ids.run, migrationSource: "v1_store" })},
      ${nextStatus}, ${previousStatus},
      'Projected from the V1 store billing contract.', 'v1_store_migration',
      ${ids.store}, ${ids.tenant}, now(), now())
    ON CONFLICT (id) DO NOTHING`;
}

async function seedPayments(tx, payments, subscriptionId, config, ids) {
  for (const [index, payment] of payments.entries()) {
    if (index % 20 === 0 || index === payments.length - 1)
      progress("  Billing payments", index + 1, payments.length);
    const [providerMatch] = payment.providerPaymentId
      ? await tx`SELECT id FROM payments
          WHERE provider='asaas' AND provider_payment_id=${payment.providerPaymentId}
          LIMIT 1`
      : [];
    const id =
      providerMatch?.id ??
      targetId(config.legacyStoreId, "Payment", payment.legacy.id);
    if (!providerMatch)
      await tx`INSERT INTO payments
        (id, amount_cents, due_at, external_reference, invoice_url, paid_at,
         provider, provider_payment_id, raw, status, store_id, subscription_id,
         tenant_id, created_at, updated_at)
        VALUES (${id}, ${payment.amountCents}, ${payment.dueAt},
          ${`v1:payment:${payment.legacy.id}`}, ${payment.invoiceUrl},
          ${payment.paidAt}, 'asaas', ${payment.providerPaymentId},
          ${tx.json({
            legacy: payment.legacy,
            migrationRunId: ids.run,
            migrationSource: "v1_store",
          })},
          ${payment.status}, ${ids.store}, ${subscriptionId}, ${ids.tenant},
          ${payment.createdAt ?? new Date()}, ${payment.updatedAt ?? new Date()})
        ON CONFLICT (id) DO UPDATE SET
          amount_cents=excluded.amount_cents,
          due_at=excluded.due_at,
          invoice_url=excluded.invoice_url,
          paid_at=excluded.paid_at,
          status=excluded.status,
          updated_at=excluded.updated_at
        WHERE payments.raw->>'migrationSource'='v1_store'`;
    await addLegacyMap(
      tx,
      ids.run,
      "Payment",
      payment.legacy.id,
      "payments",
      id,
    );
  }
}

function safeAddonMetadata(addon) {
  return {
    activatedAt: addon.activatedAt ?? null,
    addonType: addon.addonType,
    id: addon.id,
    planEndDate: addon.planEndDate ?? null,
    subscriptionId: addon.subscriptionId ?? null,
    subscriptionStatus: addon.subscriptionStatus ?? null,
  };
}
