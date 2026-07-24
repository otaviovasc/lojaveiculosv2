import {
  addons,
  billingCustomers,
  plans,
  subscriptionItems,
  subscriptions,
  tenants,
} from "@lojaveiculosv2/db";
import type { DrizzleBillingAccountClient } from "./drizzleBillingAccount.js";

type Row = Record<string, unknown>;

type FakeBillingRows = {
  addons: readonly Row[];
  billingCustomers: readonly Row[];
  plans: readonly Row[];
  subscriptionItems: readonly Row[];
  subscriptions: readonly Row[];
  tenants: readonly Row[];
};

export function createFakeBillingAccountDb(
  overrides: Partial<FakeBillingRows> = {},
) {
  const tables = new Map<unknown, Row[]>([
    [addons, [...(overrides.addons ?? [])]],
    [billingCustomers, [...(overrides.billingCustomers ?? [])]],
    [plans, [...(overrides.plans ?? [])]],
    [subscriptionItems, [...(overrides.subscriptionItems ?? [])]],
    [subscriptions, [...(overrides.subscriptions ?? [])]],
    [tenants, [...(overrides.tenants ?? [])]],
  ]);
  const inserted: { row: Row; table: unknown }[] = [];
  const executeCalls: unknown[] = [];

  const rowsFor = (table: unknown) => {
    const rows = tables.get(table);
    if (!rows) {
      throw new Error(`Unhandled fake billing table: ${String(table)}`);
    }
    return rows;
  };

  const db = {
    executeCalls,
    inserted,
    async execute(fragment: unknown) {
      executeCalls.push(fragment);
      return [];
    },
    select() {
      return {
        from(table: unknown) {
          const builder = {
            where() {
              return builder;
            },
            orderBy() {
              return builder;
            },
            async limit(count: number) {
              return rowsFor(table).slice(0, count);
            },
            then(
              onFulfilled?: ((value: Row[]) => unknown) | null,
              onRejected?: ((reason: unknown) => unknown) | null,
            ) {
              return Promise.resolve(rowsFor(table)).then(
                onFulfilled,
                onRejected,
              );
            },
          };
          return builder;
        },
      };
    },
    insert(table: unknown) {
      return {
        values(row: Row) {
          const stored = { id: `generated_${inserted.length + 1}`, ...row };
          rowsFor(table).push(stored);
          inserted.push({ row: stored, table });
          const builder = {
            onConflictDoNothing() {
              return builder;
            },
            async returning() {
              return [stored];
            },
            then(
              onFulfilled?: ((value: Row[]) => unknown) | null,
              onRejected?: ((reason: unknown) => unknown) | null,
            ) {
              return Promise.resolve([stored]).then(onFulfilled, onRejected);
            },
          };
          return builder;
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Row) {
          return {
            where() {
              return {
                async returning() {
                  const rows = rowsFor(table);
                  for (const row of rows) Object.assign(row, values);
                  return rows;
                },
              };
            },
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        where() {
          return {
            then(
              onFulfilled?: ((value: unknown) => unknown) | null,
              onRejected?: ((reason: unknown) => unknown) | null,
            ) {
              rowsFor(table).length = 0;
              return Promise.resolve().then(onFulfilled, onRejected);
            },
          };
        },
      };
    },
  };

  return db as typeof db & DrizzleBillingAccountClient;
}
