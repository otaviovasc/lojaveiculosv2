import assert from "node:assert/strict";
import test from "node:test";
import {
  mapLegacyPaymentStatus,
  prepareLegacyBillingMigration,
} from "./billing-mapping.mjs";

const NOW = new Date("2026-07-27T12:00:00.000Z");
const PERIOD_END = new Date("2026-08-27T12:00:00.000Z");

test("maps active V1 plan, add-ons, Asaas ids, and payments to V2", () => {
  const billing = prepareLegacyBillingMigration(
    data({
      addons: [
        addon(1, "CRM_WHATSAPP"),
        addon(2, "SPEDY_NFE"),
        addon(3, "CREDERE_SIMULATION"),
      ],
      billingPayments: [
        {
          amount: "463.90",
          asaasPaymentId: "pay_1",
          billingCycle: "MONTHLY",
          createdAt: NOW,
          description: "Assinatura",
          dueDate: NOW,
          id: 91,
          method: "PIX",
          paidAt: NOW,
          plan: "PRO",
          status: "CONFIRMED",
          type: "SUBSCRIPTION_RENEWAL",
          updatedAt: NOW,
        },
      ],
      store: store({ plano: "PRO" }),
    }),
    NOW,
  );

  assert.equal(billing.subscription.status, "active");
  assert.equal(billing.customer.providerCustomerId, "cus_v1");
  assert.equal(billing.subscription.providerSubscriptionId, "sub_v1");
  assert.equal(product(billing, "growth").unitAmountCents, 17990);
  assert.equal(
    product(billing, "crm_whatsapp_instance").unitAmountCents,
    24900,
  );
  assert.equal(
    product(billing, "crm_whatsapp_instance").startsAt.toISOString(),
    NOW.toISOString(),
  );
  assert.equal(product(billing, "fiscal_spedy").unitAmountCents, 3500);
  assert.equal(product(billing, "simulations_pro").unitAmountCents, 10000);
  assert.equal(product(billing, "public_api_access").unitAmountCents, 0);
  assert.equal(product(billing, "marketplace_connectors").unitAmountCents, 0);
  assert.equal(entitlement(billing, "crm").status, "active");
  assert.equal(
    entitlement(billing, "crm").startsAt.toISOString(),
    NOW.toISOString(),
  );
  assert.equal(entitlement(billing, "fiscal").status, "active");
  assert.equal(entitlement(billing, "simulations").status, "active");
  assert.equal(billing.payments[0].amountCents, 46390);
  assert.equal(billing.payments[0].status, "paid");
});

test("maps combo plan add-ons even when old rows are missing", () => {
  const billing = prepareLegacyBillingMigration(
    data({ store: store({ plano: "PRO_CRM_NFE" }) }),
    NOW,
  );

  assert.equal(product(billing, "growth").unitAmountCents, 17990);
  assert.equal(
    product(billing, "crm_whatsapp_instance").unitAmountCents,
    24900,
  );
  assert.equal(product(billing, "fiscal_spedy").unitAmountCents, 3500);
  assert.equal(entitlement(billing, "crm").active, true);
  assert.equal(entitlement(billing, "fiscal").active, true);
  assert.equal(billing.addons.filter((row) => row.synthetic).length, 2);
});

test("maps custom plan features and preserves its contracted amount", () => {
  const billing = prepareLegacyBillingMigration(
    data({
      customPlan: {
        api_integrations: true,
        auto_placa_lookup: false,
        custom_domain: true,
        monthly_price: "321.45",
      },
      store: store({ custom_plan_name: "CLIENTE_X", plano: "PRO" }),
    }),
    NOW,
  );

  assert.equal(product(billing, "growth").unitAmountCents, 32145);
  assert.equal(entitlement(billing, "custom_domain").active, true);
  assert.equal(entitlement(billing, "external_api").active, true);
  assert.equal(entitlement(billing, "marketplace").active, true);
  assert.equal(
    billing.entitlements.some((row) => row.featureKey === "plate_lookup"),
    false,
  );
});

test("expires a free V1 trial and does not invent a paid plan item", () => {
  const billing = prepareLegacyBillingMigration(
    data({
      store: store({
        plan_end_date: "2026-07-01T00:00:00.000Z",
        plano: "BASICO",
      }),
    }),
    NOW,
  );

  assert.equal(billing.subscription.status, "expired");
  assert.equal(billing.products.length, 0);
  assert.ok(billing.entitlements.every((row) => row.status === "inactive"));
});

test("rejects unknown V1 commercial records instead of silently granting", () => {
  assert.throws(
    () =>
      prepareLegacyBillingMigration(
        data({ addons: [addon(9, "UNKNOWN_ADDON")] }),
        NOW,
      ),
    /Unsupported V1 LojaAddon type/,
  );
  assert.throws(
    () =>
      prepareLegacyBillingMigration(
        data({ store: store({ plano: "UNKNOWN_PLAN" }) }),
        NOW,
      ),
    /Unsupported V1 billing plan/,
  );
});

test("maps every V1 payment status without synthetic success", () => {
  assert.equal(mapLegacyPaymentStatus("AUTHORIZED"), "paid");
  assert.equal(mapLegacyPaymentStatus("OVERDUE"), "overdue");
  assert.equal(mapLegacyPaymentStatus("CHARGEBACK"), "refunded");
  assert.equal(mapLegacyPaymentStatus("FAILED"), "cancelled");
  assert.equal(mapLegacyPaymentStatus("PENDING"), "pending");
  assert.throws(() => mapLegacyPaymentStatus("UNKNOWN"), /Unsupported/);
});

test("maps high-scale V1 Decimal payment amounts to exact cents", () => {
  const billing = prepareLegacyBillingMigration(
    data({
      billingPayments: [
        {
          amount: "149.000000000000000000000000000000",
          id: 92,
          status: "PENDING",
        },
        {
          amount: "1.005000000000000000000000000000",
          id: 93,
          status: "PENDING",
        },
      ],
    }),
    NOW,
  );

  assert.deepEqual(
    billing.payments.map((payment) => payment.amountCents),
    [14900, 101],
  );
  assert.equal(
    billing.payments[0].legacy.amount,
    "149.000000000000000000000000000000",
  );
});

function data(overrides = {}) {
  return {
    addons: [],
    billingPayments: [],
    customPlan: null,
    store: store(),
    ...overrides,
  };
}

function store(overrides = {}) {
  return {
    asaas_customer_id: "cus_v1",
    asaas_subscription_id: "sub_v1",
    customization: { contact: { email: "billing@loja.test" } },
    data_criacao: "2026-01-01T00:00:00.000Z",
    plan_end_date: PERIOD_END,
    plano: "PRO",
    status_assinatura: "ATIVA",
    subscription_start_date: NOW,
    user: { cpfCnpj: "12.345.678/0001-90" },
    ...overrides,
  };
}

function addon(id, addonType, overrides = {}) {
  return {
    activatedAt: NOW,
    active: true,
    addonType,
    id,
    planEndDate: PERIOD_END,
    subscriptionId: `sub_addon_${id}`,
    subscriptionStatus: "ACTIVE",
    ...overrides,
  };
}

function product(billing, catalogCode) {
  return billing.products.find((row) => row.catalogCode === catalogCode);
}

function entitlement(billing, featureKey) {
  return billing.entitlements.find((row) => row.featureKey === featureKey);
}
