import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  financeAutoEntryEvents,
  financeAutoEntryRecipientKinds,
  financeAutoEntryRuleResolutions,
  financeAutoEntryRuleStatuses,
  type FinanceAutoEntryCalculation,
  type FinanceAutoEntryCalculationSnapshot,
  type FinanceAutoEntryRuleConditions,
  type FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";
import { lifecycleColumns } from "./_shared.js";
import { financeEntries, financeEntryType } from "./finance.js";
import { stores, tenants, users } from "./identity.js";

export const financeAutoEntryEvent = pgEnum(
  "finance_auto_entry_event",
  financeAutoEntryEvents,
);

export const financeAutoEntryRuleStatus = pgEnum(
  "finance_auto_entry_rule_status",
  financeAutoEntryRuleStatuses,
);

export const financeAutoEntryRuleResolution = pgEnum(
  "finance_auto_entry_rule_resolution",
  financeAutoEntryRuleResolutions,
);

export const financeAutoEntryRecipientKind = pgEnum(
  "finance_auto_entry_recipient_kind",
  financeAutoEntryRecipientKinds,
);

export const financeAutoEntryRules = pgTable(
  "finance_auto_entry_rules",
  {
    ...lifecycleColumns,
    calculation: jsonb("calculation")
      .$type<FinanceAutoEntryCalculation>()
      .notNull(),
    category: varchar("category", { length: 120 }),
    conditions: jsonb("conditions")
      .$type<FinanceAutoEntryRuleConditions>()
      .notNull()
      .default({}),
    event: financeAutoEntryEvent("event").notNull(),
    family: varchar("family", { length: 191 }),
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }),
    outputType: financeEntryType("output_type").notNull(),
    priority: integer("priority").notNull().default(0),
    recipientKind: financeAutoEntryRecipientKind("recipient_kind")
      .notNull()
      .default("event_seller"),
    recipientUserId: uuid("recipient_user_id").references(() => users.id),
    resolution: financeAutoEntryRuleResolution("resolution")
      .notNull()
      .default("additive"),
    ruleKey: varchar("rule_key", { length: 191 }),
    sellerUserId: uuid("seller_user_id").references(() => users.id),
    status: financeAutoEntryRuleStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    timing: jsonb("timing").$type<FinanceAutoEntryTiming>().notNull(),
  },
  (table) => [
    index("finance_auto_entry_rules_scope_event_idx").on(
      table.tenantId,
      table.storeId,
      table.event,
      table.status,
    ),
    index("finance_auto_entry_rules_seller_idx").on(table.sellerUserId),
    uniqueIndex("finance_auto_entry_rules_scope_rule_key_unique")
      .on(
        table.tenantId,
        table.storeId,
        table.ruleKey,
        sql`coalesce(${table.sellerUserId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      )
      .where(sql`${table.ruleKey} IS NOT NULL`),
    check(
      "finance_auto_entry_rules_priority_range",
      sql`${table.priority} BETWEEN 0 AND 100`,
    ),
    check(
      "finance_auto_entry_rules_calculation_valid",
      sql`(
        (${table.calculation} ->> 'kind' = 'fixed'
          AND jsonb_typeof(${table.calculation} -> 'amountCents') = 'number'
          AND (${table.calculation} ->> 'amountCents')::numeric
            = trunc((${table.calculation} ->> 'amountCents')::numeric)
          AND (${table.calculation} ->> 'amountCents')::numeric
            BETWEEN 1 AND 2147483647)
        OR
        (${table.calculation} ->> 'kind' = 'percentage'
          AND jsonb_typeof(${table.calculation} -> 'basisPoints') = 'number'
          AND (${table.calculation} ->> 'basisPoints')::numeric
            = trunc((${table.calculation} ->> 'basisPoints')::numeric)
          AND (${table.calculation} ->> 'basisPoints')::numeric BETWEEN 1 AND 10000
          AND ${table.calculation} ->> 'basis' IN (
            'sale', 'commission', 'financing', 'premium', 'insurance_commission',
            'documentation', 'consortium'
          ))
        OR
        (${table.calculation} ->> 'kind' = 'rate_ppm'
          AND jsonb_typeof(${table.calculation} -> 'ratePpm') = 'number'
          AND (${table.calculation} ->> 'ratePpm')::numeric
            = trunc((${table.calculation} ->> 'ratePpm')::numeric)
          AND (${table.calculation} ->> 'ratePpm')::numeric BETWEEN 1 AND 1000000
          AND ${table.calculation} ->> 'basis' IN (
            'sale', 'commission', 'financing', 'premium', 'insurance_commission',
            'documentation', 'consortium'
          ))
      )`,
    ),
    check(
      "finance_auto_entry_rules_event_basis_valid",
      sql`(
        ${table.calculation} ->> 'kind' = 'fixed'
        OR (${table.event} = 'vehicle_sale_closed'
          AND ${table.calculation} ->> 'basis' IN ('sale', 'commission'))
        OR (${table.event} = 'financing_approved'
          AND ${table.calculation} ->> 'basis' = 'financing')
        OR (${table.event} = 'insurance_issued'
          AND ${table.calculation} ->> 'basis' IN ('premium', 'insurance_commission'))
        OR (${table.event} = 'transfer_documentation_charged'
          AND ${table.calculation} ->> 'basis' = 'documentation')
        OR (${table.event} = 'consortium_sold'
          AND ${table.calculation} ->> 'basis' = 'consortium')
      )`,
    ),
    check(
      "finance_auto_entry_rules_sale_output_valid",
      sql`${table.event} <> 'vehicle_sale_closed' OR ${table.outputType} = 'commission'`,
    ),
    check(
      "finance_auto_entry_rules_conditions_valid",
      sql`jsonb_typeof(${table.conditions}) = 'object'`,
    ),
    check(
      "finance_auto_entry_rules_recipient_valid",
      sql`(
        (${table.recipientKind} = 'fixed_user' AND ${table.recipientUserId} IS NOT NULL)
        OR (${table.recipientKind} <> 'fixed_user' AND ${table.recipientUserId} IS NULL)
      )`,
    ),
    check(
      "finance_auto_entry_rules_override_family_valid",
      sql`${table.resolution} <> 'seller_override' OR ${table.family} IS NOT NULL`,
    ),
    check(
      "finance_auto_entry_rules_timing_valid",
      sql`(
        ${table.timing} ->> 'kind' = 'same_day'
        OR (${table.timing} ->> 'kind' = 'days_after'
          AND jsonb_typeof(${table.timing} -> 'days') = 'number'
          AND (${table.timing} ->> 'days')::integer BETWEEN 1 AND 365)
        OR (${table.timing} ->> 'kind' IN ('day_of_month', 'next_month_day')
          AND jsonb_typeof(${table.timing} -> 'day') = 'number'
          AND (${table.timing} ->> 'day')::integer BETWEEN 1 AND 31)
      )`,
    ),
  ],
);

export const financeAutoEntryExecutions = pgTable(
  "finance_auto_entry_executions",
  {
    ...lifecycleColumns,
    calculationSnapshot: jsonb("calculation_snapshot")
      .$type<FinanceAutoEntryCalculationSnapshot>()
      .notNull(),
    financeEntryId: uuid("finance_entry_id")
      .notNull()
      .references(() => financeEntries.id),
    metadata: jsonb("metadata").notNull().default({}),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => financeAutoEntryRules.id),
    sourceId: uuid("source_id").notNull(),
    sourceRevision: integer("source_revision").notNull(),
    sourceType: financeAutoEntryEvent("source_type").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("finance_auto_entry_executions_idempotency_unique").on(
      table.storeId,
      table.ruleId,
      table.sourceType,
      table.sourceId,
      table.sourceRevision,
    ),
    index("finance_auto_entry_executions_scope_source_idx").on(
      table.tenantId,
      table.storeId,
      table.sourceType,
      table.sourceId,
    ),
    index("finance_auto_entry_executions_entry_idx").on(table.financeEntryId),
    check(
      "finance_auto_entry_executions_source_revision_positive",
      sql`${table.sourceRevision} > 0`,
    ),
  ],
);
