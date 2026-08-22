import { fiscalDocuments, fiscalEvents } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { getOverview } from "./drizzleFiscalDocumentOperations.js";
import type { DrizzleFiscalClient } from "./drizzleFiscalRepository.js";

describe("Drizzle fiscal overview", () => {
  it("keeps recent documents bounded while aggregating every scoped document", async () => {
    const rows = createDocumentRows();
    const capture: QueryCapture = {};
    const overview = await getOverview(createOverviewClient(capture, rows), {
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(overview.documents).toHaveLength(50);
    expect(overview.summary).toEqual({
      cancelled: 5,
      failed: 12,
      issued: 20,
      pending: 18,
    });
    expect(capture.documentLimit).toBe(50);

    const dialect = new PgDialect();
    const scopeQuery = dialect.sqlToQuery(capture.summaryWhere!);
    expect(scopeQuery.sql).toContain('"fiscal_documents"."store_id"');
    expect(scopeQuery.sql).toContain('"fiscal_documents"."tenant_id"');
    expect(scopeQuery.params).toEqual(["store_1", "tenant_1"]);

    expect(summaryStatusParams(dialect, capture, "cancelled")).toEqual([
      "cancelled",
    ]);
    expect(summaryStatusParams(dialect, capture, "failed")).toEqual([
      "error",
      "failed",
      "rejected",
    ]);
    expect(summaryStatusParams(dialect, capture, "issued")).toEqual([
      "authorized",
      "issued",
    ]);
    expect(summaryStatusParams(dialect, capture, "pending")).toEqual([
      "draft",
      "processing",
      "queued",
    ]);
  });
});

type FiscalRow = typeof fiscalDocuments.$inferSelect;

type QueryCapture = {
  documentLimit?: number;
  summarySelection?: Record<string, SQL>;
  summaryWhere?: SQL;
};

function createOverviewClient(capture: QueryCapture, rows: FiscalRow[]) {
  const db = {
    select: (selection?: Record<string, SQL>) => ({
      from: (table: unknown) => {
        if (selection) {
          expect(table).toBe(fiscalDocuments);
          capture.summarySelection = selection;
          return {
            where: async (where: SQL) => {
              capture.summaryWhere = where;
              return [summarize(rows)];
            },
          };
        }
        return recentRowsQuery(table, rows, capture);
      },
    }),
  };
  return db as unknown as DrizzleFiscalClient;
}

function recentRowsQuery(
  table: unknown,
  rows: FiscalRow[],
  capture: QueryCapture,
) {
  return {
    where: () => ({
      orderBy: () => ({
        limit: async (limit: number) => {
          if (table === fiscalDocuments) {
            capture.documentLimit = limit;
            return rows.slice(0, limit);
          }
          expect(table).toBe(fiscalEvents);
          return [];
        },
      }),
    }),
  };
}

function createDocumentRows(): FiscalRow[] {
  const statuses = [
    ...repeatedStatus("authorized", 10),
    ...repeatedStatus("issued", 10),
    ...repeatedStatus("draft", 6),
    ...repeatedStatus("processing", 6),
    ...repeatedStatus("queued", 6),
    ...repeatedStatus("error", 4),
    ...repeatedStatus("failed", 4),
    ...repeatedStatus("rejected", 4),
    ...repeatedStatus("cancelled", 5),
  ];
  return statuses.map((status, index) => documentRow(index, status));
}

function repeatedStatus(
  status: FiscalRow["status"],
  count: number,
): FiscalRow["status"][] {
  return Array.from({ length: count }, () => status);
}

function documentRow(index: number, status: FiscalRow["status"]): FiscalRow {
  const timestamp = new Date(Date.UTC(2026, 7, 22, 12, 0, index));
  return {
    accessKey: null,
    createdAt: timestamp,
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    id: `document_${String(index).padStart(2, "0")}`,
    issuedAt: null,
    metadata: {},
    provider: "spedy",
    providerDocumentId: null,
    recipientId: null,
    status,
    storeId: "store_1",
    templateId: null,
    templateVersion: null,
    tenantId: "tenant_1",
    updatedAt: timestamp,
  };
}

function summarize(rows: FiscalRow[]) {
  const count = (...statuses: FiscalRow["status"][]) =>
    rows.filter((row) => statuses.includes(row.status)).length;
  return {
    cancelled: count("cancelled"),
    failed: count("error", "failed", "rejected"),
    issued: count("authorized", "issued"),
    pending: count("draft", "processing", "queued"),
  };
}

function summaryStatusParams(
  dialect: PgDialect,
  capture: QueryCapture,
  key: "cancelled" | "failed" | "issued" | "pending",
) {
  const expression = capture.summarySelection?.[key];
  expect(expression).toBeDefined();
  const query = dialect.sqlToQuery(expression!);
  expect(query.sql).toMatch(/^count\(\*\) filter \(where .*\)::int$/);
  return query.params;
}
