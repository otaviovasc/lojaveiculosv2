import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { billingAuditOutbox } from "./schema/billingAuditOutbox.js";

describe("billing audit outbox schema", () => {
  it("enforces scoped identity, delivery state, and idempotency", () => {
    const config = getTableConfig(billingAuditOutbox);
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      "billing_audit_outbox_store_tenant_fk",
    );
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        "billing_audit_outbox_audit_id_unique",
        "billing_audit_outbox_idempotency_unique",
        "billing_audit_outbox_claim_idx",
      ]),
    );
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        "billing_audit_outbox_action_check",
        "billing_audit_outbox_lease_pair_check",
        "billing_audit_outbox_metadata_check",
        "billing_audit_outbox_state_check",
      ]),
    );
    const actionCheck = config.checks.find(
      (constraint) => constraint.name === "billing_audit_outbox_action_check",
    );
    expect(actionCheck).toBeDefined();
    if (!actionCheck) throw new Error("Action check was not defined.");
    const actionSql = new PgDialect().sqlToQuery(actionCheck.value).sql;
    expect(actionSql).toContain("billing.plan_hire.activated");
    expect(actionSql).toContain("billing.plan_quote.requested");
    expect(actionSql).toContain("billing.plan_quote.approved");
  });
});
