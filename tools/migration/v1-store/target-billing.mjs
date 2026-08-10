import { targetId } from "./common.mjs";
import { log } from "./log.mjs";
import { seedBillingRecords } from "./target-billing-records.mjs";

const CATALOG_VERSION = "2026-08-v1";

export async function seedLegacyBilling(tx, data, config, ids) {
  const billing = data.billing;
  if (!billing) throw new Error("Prepared V1 billing data is missing.");
  log(
    `  Billing: ${billing.products.length} item(s), ${billing.entitlements.length} entitlement(s), ${billing.payments.length} payment(s)...`,
  );
  const customer = await seedCustomer(tx, billing, config, ids);
  const subscriptionId = await seedSubscription(
    tx,
    billing,
    customer.id,
    config,
    ids,
  );
  const catalog = await readCatalog(tx, billing.products);
  await seedSubscriptionItems(
    tx,
    billing,
    catalog,
    subscriptionId,
    config,
    ids,
  );
  await seedBillingRecords(tx, billing, subscriptionId, config, ids);
}

async function seedCustomer(tx, billing, config, ids) {
  const id = targetId(
    config.legacyStoreId,
    "billing_customers",
    dataId(config),
  );
  const [existing] =
    await tx`SELECT id FROM billing_customers WHERE tenant_id=${ids.tenant} AND provider='asaas' LIMIT 1`;
  if (existing && existing.id !== id)
    throw new Error("V2 tenant already has a non-migration billing customer.");
  const providerCustomerId =
    billing.customer.providerCustomerId ?? `local_asaas_customer_${ids.tenant}`;
  const [customer] = await tx`INSERT INTO billing_customers
    (id, document_number, email, name, provider, provider_customer_id,
     tenant_id, created_at, updated_at)
    VALUES (${id}, ${billing.customer.documentNumber}, ${billing.customer.email},
      ${config.tenantLegalName || config.storeTradingName}, 'asaas',
      ${providerCustomerId}, ${ids.tenant}, now(), now())
    ON CONFLICT (tenant_id, provider) DO UPDATE SET
      document_number=COALESCE(excluded.document_number, billing_customers.document_number),
      email=COALESCE(excluded.email, billing_customers.email),
      name=excluded.name,
      provider_customer_id=CASE
        WHEN billing_customers.provider_customer_id LIKE 'local\\_%'
          THEN excluded.provider_customer_id
        ELSE billing_customers.provider_customer_id
      END,
      updated_at=now()
    RETURNING id`;
  return customer;
}

async function seedSubscription(tx, billing, customerId, config, ids) {
  const id = targetId(config.legacyStoreId, "subscriptions", dataId(config));
  const [existing] =
    await tx`SELECT id FROM subscriptions WHERE tenant_id=${ids.tenant} ORDER BY created_at DESC LIMIT 1`;
  if (existing && existing.id !== id)
    throw new Error("V2 tenant already has a non-migration subscription.");
  const providerSubscriptionId =
    billing.subscription.providerSubscriptionId ??
    `local_asaas_subscription_${ids.tenant}`;
  const [subscription] = await tx`INSERT INTO subscriptions
    (id, billing_customer_id, current_period_end, current_period_start,
     provider, provider_subscription_id, status, tenant_id, created_at, updated_at)
    VALUES (${id}, ${customerId}, ${billing.subscription.currentPeriodEnd},
      ${billing.subscription.currentPeriodStart}, 'asaas',
      ${providerSubscriptionId}, ${billing.subscription.status}, ${ids.tenant},
      ${billing.subscription.currentPeriodStart}, now())
    ON CONFLICT (id) DO UPDATE SET
      billing_customer_id=excluded.billing_customer_id,
      current_period_end=excluded.current_period_end,
      current_period_start=excluded.current_period_start,
      provider_subscription_id=CASE
        WHEN subscriptions.provider_subscription_id LIKE 'local\\_%'
          THEN excluded.provider_subscription_id
        ELSE subscriptions.provider_subscription_id
      END,
      status=excluded.status,
      updated_at=now()
    RETURNING id`;
  return subscription.id;
}

async function readCatalog(tx, products) {
  const [plan] = await tx`SELECT id, code FROM plans
    WHERE code='growth' AND catalog_version=${CATALOG_VERSION} LIMIT 1`;
  if (!plan)
    throw new Error(
      `Missing V2 Growth plan in billing catalog ${CATALOG_VERSION}.`,
    );
  const rows =
    await tx`SELECT id, code FROM addons WHERE catalog_version=${CATALOG_VERSION}`;
  const addons = new Map(rows.map((row) => [row.code, row.id]));
  for (const product of products) {
    if (product.itemType === "plan") continue;
    if (!addons.has(product.catalogCode))
      throw new Error(
        `Missing V2 add-on ${product.catalogCode} in billing catalog ${CATALOG_VERSION}.`,
      );
  }
  return { addons, planId: plan.id };
}

async function seedSubscriptionItems(
  tx,
  billing,
  catalog,
  subscriptionId,
  config,
  ids,
) {
  for (const product of billing.products) {
    const id = targetId(
      config.legacyStoreId,
      "subscription_items",
      product.key,
    );
    await tx`INSERT INTO subscription_items
      (id, addon_id, ends_at, item_type, plan_id, quantity, starts_at,
       store_id, subscription_id, tenant_id, unit_amount_cents, created_at, updated_at)
      VALUES (${id},
        ${product.itemType === "addon" ? catalog.addons.get(product.catalogCode) : null},
        ${product.endsAt}, ${product.itemType},
        ${product.itemType === "plan" ? catalog.planId : null}, 1,
        ${product.startsAt}, ${ids.store}, ${subscriptionId}, ${ids.tenant},
        ${product.unitAmountCents}, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        addon_id=excluded.addon_id,
        ends_at=excluded.ends_at,
        plan_id=excluded.plan_id,
        starts_at=COALESCE(
          LEAST(subscription_items.starts_at, excluded.starts_at),
          subscription_items.starts_at,
          excluded.starts_at
        ),
        unit_amount_cents=excluded.unit_amount_cents,
        updated_at=now()`;
  }
}

function dataId(config) {
  return config.legacyStoreId;
}
