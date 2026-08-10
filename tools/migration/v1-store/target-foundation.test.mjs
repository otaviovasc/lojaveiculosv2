import assert from "node:assert/strict";
import test from "node:test";
import { prepareLegacyBillingMigration } from "./billing-mapping.mjs";
import { seedFoundation } from "./target-foundation.mjs";

test("foundation seeds the mapped V1 billing contract", async () => {
  const { queries, tx } = createFakeTx();
  const data = {
    accesses: [
      {
        clerkUserId: "clerk_owner",
        createdAt: "2024-01-01T00:00:00Z",
        id: 11,
        profile: { name: "Dono" },
        role: "AGENCY",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
    settings: {},
    addons: [
      {
        active: true,
        addonType: "CRM_WHATSAPP",
        id: 41,
        planEndDate: "2026-08-01T00:00:00Z",
        subscriptionStatus: "ACTIVE",
      },
    ],
    billingPayments: [],
    customPlan: null,
    store: {
      asaas_customer_id: "cus_v1",
      asaas_subscription_id: "sub_v1",
      customization: { contact: { email: "contato@loja.com.br" } },
      data_criacao: "2024-01-01T00:00:00Z",
      dominio_customizado: null,
      id: 7,
      nome_da_loja: "Loja Teste",
      ownerClerkId: "clerk_owner",
      plan_end_date: "2026-08-01T00:00:00Z",
      plano: "PRO",
      status_assinatura: "ATIVA",
      subscription_start_date: "2026-07-01T00:00:00Z",
      subdominio: "loja-teste",
      user: { email: "dono@loja.com.br" },
    },
  };
  data.billing = prepareLegacyBillingMigration(
    data,
    new Date("2026-07-27T00:00:00Z"),
  );
  const config = {
    accessEmails: new Map(),
    legacyStoreId: 7,
    ownerClerkUserId: "clerk_v2_owner",
    ownerEmail: "dono@loja.com.br",
    storeLegalName: null,
    storeSlug: "loja-teste",
    storeTradingName: "Loja Teste",
    tenantLegalName: "Loja Teste LTDA",
  };
  const ids = {
    ownerUser: null,
    run: "00000000-0000-5000-8000-000000000003",
    store: "00000000-0000-5000-8000-000000000002",
    tenant: "00000000-0000-5000-8000-000000000001",
    users: new Map(),
  };

  await seedFoundation(tx, data, config, ids);

  const storefrontInsert = queries.find((query) =>
    query.includes("INSERT INTO store_public_site_settings"),
  );
  assert.ok(storefrontInsert, "expected a public storefront insert");
  assert.match(storefrontInsert, /is_published/);
  assert.match(
    storefrontInsert,
    /ON CONFLICT \(store_id\) DO UPDATE SET is_published=excluded\.is_published/,
  );

  const customerInsert = queries.find((query) =>
    query.includes("INSERT INTO billing_customers"),
  );
  assert.ok(customerInsert, "expected a billing_customers insert");
  assert.match(customerInsert, /ON CONFLICT \(tenant_id, provider\)/);
  assert.match(customerInsert, /RETURNING id/);

  const subscriptionInsert = queries.find((query) =>
    query.includes("INSERT INTO subscriptions"),
  );
  assert.ok(subscriptionInsert, "expected a subscriptions insert");
  assert.match(subscriptionInsert, /provider_subscription_id/);
  assert.match(subscriptionInsert, /ON CONFLICT \(id\) DO UPDATE/);

  const itemInserts = queries.filter((query) =>
    query.includes("INSERT INTO subscription_items"),
  );
  assert.equal(itemInserts.length, data.billing.products.length);
  assert.ok(
    queries.some((query) =>
      query.includes("INSERT INTO store_entitlement_events"),
    ),
  );
});

function createFakeTx() {
  const queries = [];
  const tx = (strings, ...values) => {
    const text = strings.reduce(
      (acc, part, index) => `${acc}${index ? `$${index}` : ""}${part}`,
      "",
    );
    queries.push(text);
    if (text.includes("FROM role_templates")) {
      return Promise.resolve([
        { id: "role_owner", role_key: "owner" },
        { id: "role_salesman", role_key: "salesman" },
        { id: "role_supervisor", role_key: "supervisor" },
      ]);
    }
    if (text.includes("INSERT INTO billing_customers")) {
      return Promise.resolve([{ id: "billing_customer_1" }]);
    }
    if (text.includes("INSERT INTO subscriptions")) {
      return Promise.resolve([{ id: "subscription_1" }]);
    }
    if (text.includes("FROM plans")) {
      return Promise.resolve([{ code: "growth", id: "plan_growth" }]);
    }
    if (text.includes("FROM addons")) {
      return Promise.resolve([
        { code: "crm_whatsapp_instance", id: "addon_crm" },
        { code: "fiscal_spedy", id: "addon_fiscal" },
        { code: "marketplace_connectors", id: "addon_marketplace" },
        { code: "public_api_access", id: "addon_api" },
        { code: "simulations_pro", id: "addon_simulations" },
      ]);
    }
    if (text.includes("INSERT INTO store_entitlements")) {
      return Promise.resolve([{ id: "entitlement_1" }]);
    }
    return Promise.resolve([]);
  };
  tx.json = (value) => value;
  return { queries, tx };
}
