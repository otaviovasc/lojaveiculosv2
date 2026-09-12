import { documentLinks, documents } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  createDrizzleDocumentRepository,
  type DrizzleDocumentClient,
} from "./drizzleDocumentRepository.js";

describe("Drizzle document workspace list", () => {
  it("deduplicates multi-link documents before paging and counting", async () => {
    const newer = documentRow(
      "document_newer",
      new Date("2026-08-03T12:00:00.000Z"),
    );
    const older = documentRow(
      "document_older",
      new Date("2026-08-02T12:00:00.000Z"),
    );
    const capture: QueryCapture = {
      linkOrder: [],
      pageOrder: [],
      selectCalls: 0,
      selectDistinctCalls: 0,
    };
    const db = createListClient(
      capture,
      [newer, older],
      [
        linkRow(newer.id, "primary", "sale", "sale_1"),
        linkRow(newer.id, "related_vehicle", "vehicle_unit", "unit_1"),
        linkRow(older.id, "primary", "store", "store_1"),
      ],
    );

    const page = await createDrizzleDocumentRepository(db).list({
      limit: 2,
      offset: 1,
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(page.total).toBe(2);
    expect(page.documents.map(({ id }) => id)).toEqual([
      "document_newer",
      "document_older",
    ]);
    expect(page.documents[0]).toMatchObject({
      linkRole: "primary",
      targetId: "sale_1",
      targetType: "sale",
    });
    expect(capture).toMatchObject({
      limit: 2,
      offset: 1,
      selectCalls: 2,
      selectDistinctCalls: 1,
    });

    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(capture.totalExpression!).sql).toBe(
      'count(distinct "documents"."id")',
    );
    expect(dialect.sqlToQuery(capture.pageWhere!).sql).toContain(
      '"documents"."is_deleted"',
    );
    expect(dialect.sqlToQuery(capture.linkWhere!).sql).toContain(
      '"document_links"."document_id" in',
    );
    expect(
      capture.pageOrder.map((order) => dialect.sqlToQuery(order).sql),
    ).toEqual(['"documents"."uploaded_at" desc', '"documents"."id" desc']);
    expect(
      capture.linkOrder.map((order) => dialect.sqlToQuery(order).sql),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("case when"),
        '"document_links"."id" asc',
      ]),
    );
  });
});

type QueryCapture = {
  limit?: number;
  linkOrder: SQL[];
  linkWhere?: SQL;
  offset?: number;
  pageOrder: SQL[];
  pageWhere?: SQL;
  selectCalls: number;
  selectDistinctCalls: number;
  totalExpression?: SQL;
};

function createListClient(
  capture: QueryCapture,
  documentRows: readonly ReturnType<typeof documentRow>[],
  linkRows: readonly ReturnType<typeof linkRow>[],
) {
  const db = {
    selectDistinct: () => {
      capture.selectDistinctCalls += 1;
      return {
        from: (table: unknown) => {
          expect(table).toBe(documentLinks);
          return {
            innerJoin: (joinedTable: unknown) => {
              expect(joinedTable).toBe(documents);
              return {
                where: (where: SQL) => {
                  capture.pageWhere = where;
                  return {
                    orderBy: (...order: SQL[]) => {
                      capture.pageOrder = order;
                      return {
                        limit: (limit: number) => {
                          capture.limit = limit;
                          return {
                            offset: async (offset: number) => {
                              capture.offset = offset;
                              return documentRows.map((document) => ({
                                document,
                              }));
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    select: (selection: Record<string, unknown>) => {
      capture.selectCalls += 1;
      if ("total" in selection) {
        capture.totalExpression = selection.total as SQL;
        return totalQuery();
      }
      return linkQuery(capture, linkRows);
    },
  };
  return db as unknown as DrizzleDocumentClient;
}

function totalQuery() {
  return {
    from: (table: unknown) => {
      expect(table).toBe(documentLinks);
      return {
        innerJoin: (joinedTable: unknown) => {
          expect(joinedTable).toBe(documents);
          return { where: async () => [{ total: 2 }] };
        },
      };
    },
  };
}

function linkQuery(
  capture: QueryCapture,
  rows: readonly ReturnType<typeof linkRow>[],
) {
  return {
    from: (table: unknown) => {
      expect(table).toBe(documentLinks);
      return {
        where: (where: SQL) => {
          capture.linkWhere = where;
          return {
            orderBy: async (...order: SQL[]) => {
              capture.linkOrder = order;
              return rows.map((link) => ({ link }));
            },
          };
        },
      };
    },
  };
}

function documentRow(id: string, uploadedAt: Date) {
  const timestamp = new Date("2026-08-01T12:00:00.000Z");
  return {
    createdAt: timestamp,
    fileName: `${id}.pdf`,
    fileSizeBytes: 1_024,
    id,
    kind: "other" as const,
    metadata: {},
    mimeType: "application/pdf",
    status: "issued" as const,
    storageKey: `documents/${id}.pdf`,
    storeId: "store_1",
    tenantId: "tenant_1",
    title: id,
    updatedAt: timestamp,
    uploadedAt,
  };
}

function linkRow(
  documentId: string,
  linkRole: string,
  targetType: "sale" | "store" | "vehicle_unit",
  targetId: string,
) {
  const timestamp = new Date("2026-08-01T12:00:00.000Z");
  return {
    createdAt: timestamp,
    documentId,
    id: `${documentId}_${targetType}`,
    linkRole,
    storeId: "store_1",
    targetId,
    targetType,
    tenantId: "tenant_1",
    updatedAt: timestamp,
  };
}
