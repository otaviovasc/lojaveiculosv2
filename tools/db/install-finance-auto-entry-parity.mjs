import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../../packages/db/drizzle/0008_finance_auto_entry_parity.sql",
  import.meta.url,
);

const expectedConstraints = [
  "finance_auto_entry_rules_calculation_valid",
  "finance_auto_entry_rules_conditions_valid",
  "finance_auto_entry_rules_event_basis_valid",
  "finance_auto_entry_rules_override_family_valid",
  "finance_auto_entry_rules_recipient_valid",
];

const expectedEvents = [
  "consortium_sold",
  "financing_approved",
  "insurance_issued",
  "transfer_documentation_charged",
  "vehicle_sale_closed",
];

export async function installFinanceAutoEntryParity(sql) {
  const tableExists = await sql`
    select to_regclass('public.finance_auto_entry_rules') is not null as exists
  `;
  if (!tableExists[0]?.exists) return;

  const migration = await readFile(migrationUrl, "utf8");
  await sql.unsafe(migration);
  await verifyFinanceAutoEntryParity(sql);
  console.log("Finance auto-entry parity constraints verified.");
}

async function verifyFinanceAutoEntryParity(sql) {
  const constraintRows = await sql`
    select conname
    from pg_constraint
    where conrelid = 'finance_auto_entry_rules'::regclass
      and conname in ${sql(expectedConstraints)}
  `;
  assertComplete(
    expectedConstraints,
    constraintRows.map((row) => row.conname),
    "constraints",
  );

  const eventRows = await sql`
    select enumlabel
    from pg_enum
    where enumtypid = 'finance_auto_entry_event'::regtype
  `;
  assertComplete(
    expectedEvents,
    eventRows.map((row) => row.enumlabel),
    "events",
  );

  const indexRows = await sql`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'finance_auto_entry_rules_scope_rule_key_unique'
  `;
  if (!indexRows.length) {
    throw new Error("Finance auto-entry parity rule-key index is missing.");
  }
}

function assertComplete(expected, actualValues, label) {
  const actual = new Set(actualValues);
  const missing = expected.filter((value) => !actual.has(value));
  if (missing.length) {
    throw new Error(
      `Finance auto-entry parity ${label} are missing: ${missing.join(", ")}`,
    );
  }
}
