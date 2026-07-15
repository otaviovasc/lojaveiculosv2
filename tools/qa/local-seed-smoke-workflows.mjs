import {
  assert,
  assertCount,
  seedIds,
  seededTenantIds,
} from "./local-seed-smoke-support.mjs";

export async function assertSeedWorkflows(db) {
  return {
    billing: await assertBilling(db),
    crm: await assertCrm(db),
    inventory: await assertInventory(db),
    storefront: await assertStorefront(db),
  };
}

async function assertBilling(db) {
  const rows = await db`
    select store_id as "storeId", count(*)::int as items,
      sum(quantity * unit_amount_cents)::int as "monthlyCents"
    from subscription_items
    where tenant_id in ${db(seededTenantIds)} and ends_at is null
    group by store_id
    order by store_id
  `;
  const expected = new Map([
    [seedIds.primaryStore, [2, 54899]],
    [seedIds.branchStore, [2, 54899]],
    [seedIds.foreignStore, [2, 54899]],
  ]);
  for (const row of rows) {
    const values = expected.get(row.storeId);
    assert(values, `Unexpected seeded billing store ${row.storeId}.`);
    assert(
      row.items === values[0] && row.monthlyCents === values[1],
      `Billing allocation mismatch for ${row.storeId}.`,
    );
  }
  assertCount({ count: rows.length }, "count", 3, "Billing allocations");

  const [states] = await db`
    select
      (select status from subscriptions
       where id = '14141414-1414-4414-8414-141414141414') as "sharedStatus",
      (select status from subscriptions
       where id = '25000000-0000-4000-8000-000000000003') as "isolationStatus",
      count(*) filter (where store_id = ${seedIds.branchStore}
        and status = 'suspended')::int as "branchSuspended",
      count(*) filter (where store_id = ${seedIds.foreignStore}
        and status = 'trialing')::int as "foreignTrialing"
    from store_entitlements
  `;
  assert(
    states.branchSuspended >= 2,
    "Past-due branch must exercise suspended entitlements.",
  );
  assert(
    states.foreignTrialing >= 3,
    "Isolation store must exercise a minimal trial.",
  );
  assert(
    states.sharedStatus === "past_due" && states.isolationStatus === "trialing",
    "Seed subscriptions do not exercise coherent dunning and trial states.",
  );
  return { allocations: rows, ...states };
}

async function assertCrm(db) {
  const [row] = await db`
    select
      (select count(*)::int from leads where tenant_id = ${seedIds.primaryTenant}) as leads,
      (select count(*)::int from crm_pipeline_stages where tenant_id = ${seedIds.primaryTenant}) as stages,
      (select count(*)::int from crm_whatsapp_sessions where tenant_id = ${seedIds.primaryTenant}) as sessions,
      (select count(*)::int from crm_whatsapp_messages where tenant_id = ${seedIds.primaryTenant}) as messages,
      (select count(*)::int from crm_whatsapp_campaigns where tenant_id = ${seedIds.primaryTenant}) as campaigns,
      (select count(*)::int from crm_whatsapp_scheduled_messages
       where tenant_id = ${seedIds.primaryTenant}) as schedules,
      (select count(*)::int from crm_whatsapp_messages
       where tenant_id = ${seedIds.primaryTenant} and direction = 'INBOUND'
         and status = 'DELIVERED') as "inboundDelivered",
      (select count(*)::int from crm_whatsapp_messages
       where tenant_id = ${seedIds.primaryTenant} and direction = 'OUTBOUND'
         and status = 'PENDING') as "outboundPending"
  `;
  assert(
    row.leads >= 3 && row.stages >= 5,
    "CRM leads and pipeline stages are incomplete.",
  );
  assert(
    row.sessions >= 3 && row.messages >= 9,
    "WhatsApp read fixtures are incomplete.",
  );
  assert(
    row.campaigns >= 2 && row.schedules >= 2,
    "CRM campaign scenarios are incomplete.",
  );
  assert(
    row.inboundDelivered >= 4 && row.outboundPending >= 5,
    "CRM message fixtures do not match inbound/outbound runtime semantics.",
  );
  return row;
}

async function assertInventory(db) {
  const [counts] = await db`
    select
      (select count(*)::int from vehicle_listings where tenant_id in ${db(seededTenantIds)}) as listings,
      (select count(*)::int from vehicle_unit_acquisitions where tenant_id in ${db(seededTenantIds)}) as acquisitions,
      (select count(*)::int from vehicle_costs where tenant_id in ${db(seededTenantIds)}) as costs,
      (select count(*)::int from vehicle_units where tenant_id in ${db(seededTenantIds)}
        and status = 'reserved') as reserved
  `;
  assert(
    counts.listings >= 20,
    "Seed inventory must span realistic multi-store stock.",
  );
  assert(
    counts.acquisitions >= 16,
    "Seed inventory must include acquisition provenance.",
  );
  assert(
    counts.costs >= 19,
    "Every seeded stock scenario must exercise costs.",
  );
  assertCount(counts, "reserved", 2, "Reserved units");

  const [broken] = await db`
    select
      (select count(*)::int from vehicle_costs cost
       where cost.tenant_id in ${db(seededTenantIds)} and not exists (
         select 1 from finance_entry_links link
         where link.target_type = 'vehicle_cost' and link.target_id = cost.id
       )) as "costLinks",
      (select count(*)::int from sale_payments payment
       where payment.tenant_id in ${db(seededTenantIds)} and payment.status <> 'cancelled'
         and not exists (select 1 from finance_entry_links link
           where link.target_type = 'sale_payment' and link.target_id = payment.id)) as "paymentLinks",
      (select count(*)::int from vehicle_units unit
       where unit.tenant_id in ${db(seededTenantIds)} and unit.status = 'reserved'
         and not exists (select 1 from sales sale inner join sale_payments payment
           on payment.sale_id = sale.id and payment.status = 'pending'
           where sale.unit_id = unit.id and sale.status = 'pending')) as reservations,
      (select count(*)::int from vehicle_checklists checklist,
         lateral jsonb_array_elements(checklist.items) item
       where checklist.tenant_id in ${db(seededTenantIds)} and not (
         item ? 'id' and item ? 'label' and item ? 'status' and item ? 'notes'
       )) as checklists,
      (select count(*)::int from sales sale
       where sale.tenant_id in ${db(seededTenantIds)} and sale.status = 'closed'
         and (sale.sale_price_cents is distinct from (
           select coalesce(sum(item.amount_cents), 0)::int from sale_items item
           where item.sale_id = sale.id
         ) or sale.sale_price_cents is distinct from (
           select coalesce(sum(payment.amount_cents), 0)::int
           from sale_payments payment where payment.sale_id = sale.id
             and payment.status <> 'cancelled'
         ))) as "saleTotals",
      (select count(*)::int from vehicle_listings listing
       where listing.tenant_id in ${db(seededTenantIds)}
         and listing.status = 'published' and listing.is_visible_on_public_site
         and not exists (select 1 from vehicle_units unit
           inner join vehicle_media media on media.unit_id = unit.id
             and media.is_deleted = false and media.is_public
           where unit.listing_id = listing.id)
         and listing.metadata->>'mediaScenario' is distinct from 'missing_photos'
      ) as "unmarkedEmptyGalleries",
      (select count(*)::int from vehicle_price_history history
       where history.tenant_id in ${db(seededTenantIds)} and not exists (
         select 1 from store_memberships membership
         where membership.store_id = history.store_id
           and membership.user_id = history.actor_user_id
           and membership.status = 'active' and coalesce((
             select override.allowed from membership_permission_overrides override
             where override.membership_id = membership.id
               and override.permission_key = 'inventory.update_price'
           ), exists (
             select 1 from role_template_permissions permission
             where permission.role_template_id = membership.role_template_id
               and permission.permission_key = 'inventory.update_price'
           ))
       )) as "priceActors"
  `;
  for (const [key, value] of Object.entries(broken)) {
    assertCount({ value }, "value", 0, `Broken inventory graph: ${key}`);
  }

  const [prices] = await db`
    with latest as (
      select distinct on (listing_id) listing_id, new_price_cents
      from vehicle_price_history
      where tenant_id in ${db(seededTenantIds)}
      order by listing_id, changed_at desc, id desc
    )
    select count(*)::int as mismatches
    from latest inner join vehicle_listings listing on listing.id = latest.listing_id
    where latest.new_price_cents is distinct from listing.asking_price_cents
  `;
  assertCount(prices, "mismatches", 0, "Latest price history");
  const [emptyGalleries] = await db`
    select count(*)::int as count from vehicle_listings listing
    where listing.tenant_id in ${db(seededTenantIds)}
      and listing.status = 'published' and listing.is_visible_on_public_site
      and listing.metadata->>'mediaScenario' = 'missing_photos'
      and not exists (select 1 from vehicle_units unit
        inner join vehicle_media media on media.unit_id = unit.id
          and media.is_deleted = false and media.is_public
        where unit.listing_id = listing.id)
  `;
  assertCount(emptyGalleries, "count", 8, "Explicit empty-gallery scenarios");
  return {
    ...counts,
    emptyGalleries: emptyGalleries.count,
    graphMismatches: broken,
    priceMismatches: prices.mismatches,
  };
}

async function assertStorefront(db) {
  const [row] = await db`
    select
      (select count(*)::int from store_profiles where tenant_id in ${db(seededTenantIds)}) as profiles,
      (select count(*)::int from store_public_site_settings
       where tenant_id in ${db(seededTenantIds)}) as sites,
      (select count(*)::int from store_custom_pages where tenant_id = ${seedIds.primaryTenant}) as pages,
      (select count(*)::int from storefront_media_assets
       where tenant_id = ${seedIds.primaryTenant} and is_deleted = false) as assets,
      (select count(*)::int from document_templates
       where store_id = ${seedIds.primaryStore} and template_key is not null) as templates,
      (select count(*)::int from documents where tenant_id = ${seedIds.primaryTenant}) as documents
  `;
  assert(
    row.profiles >= 3 && row.sites >= 3,
    "Each seeded store needs profile and site settings.",
  );
  assertCount(row, "pages", 2, "Primary custom pages");
  assertCount(row, "assets", 2, "Storefront media library");
  assertCount(row, "templates", 5, "Document templates");
  assert(row.documents >= 9, "Document workflows are incomplete.");
  return row;
}
