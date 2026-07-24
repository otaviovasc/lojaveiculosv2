import assert from "node:assert/strict";
import test from "node:test";
import { seedFoundation } from "./target-foundation.mjs";

test("foundation seeds a billing customer and trialing subscription", async () => {
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
    store: {
      customization: { contact: { email: "contato@loja.com.br" } },
      data_criacao: "2024-01-01T00:00:00Z",
      dominio_customizado: null,
      id: 7,
      nome_da_loja: "Loja Teste",
      ownerClerkId: "clerk_owner",
      subdominio: "loja-teste",
      user: { email: "dono@loja.com.br" },
    },
  };
  const config = {
    accessEmails: new Map(),
    entitlements: ["crm"],
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
  assert.match(subscriptionInsert, /'trialing'/);
  assert.match(subscriptionInsert, /interval '14 days'/);
  assert.match(
    subscriptionInsert,
    /WHERE NOT EXISTS \(SELECT 1 FROM subscriptions WHERE tenant_id/,
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
    return Promise.resolve([]);
  };
  tx.json = (value) => value;
  return { queries, tx };
}
