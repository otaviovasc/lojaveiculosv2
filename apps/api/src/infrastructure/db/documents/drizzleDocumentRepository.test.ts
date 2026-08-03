import { documentLinks, documents } from "@lojaveiculosv2/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  createDrizzleDocumentRepository,
  type DrizzleDocumentClient,
} from "./drizzleDocumentRepository.js";

describe("drizzle document repository", () => {
  it("lists multiple target documents with one scoped, newest-first join", async () => {
    let innerJoinCalls = 0;
    let joinClause: SQL | undefined;
    let orderByClause: SQL | undefined;
    let selectCalls = 0;
    let whereClause: SQL | undefined;
    const db = {
      select: () => {
        selectCalls += 1;
        return {
          from: (table: unknown) => {
            expect(table).toBe(documentLinks);
            return {
              innerJoin: (joinedTable: unknown, condition: SQL) => {
                innerJoinCalls += 1;
                joinClause = condition;
                expect(joinedTable).toBe(documents);
                return {
                  where: (where: SQL) => {
                    whereClause = where;
                    return {
                      orderBy: async (orderBy: SQL) => {
                        orderByClause = orderBy;
                        return [
                          linkedRow(
                            "document_newer",
                            new Date("2026-08-03T12:00:00.000Z"),
                          ),
                          linkedRow(
                            "document_older",
                            new Date("2026-08-02T12:00:00.000Z"),
                          ),
                        ];
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as DrizzleDocumentClient;

    const repository = createDrizzleDocumentRepository(db);
    const result = await repository.listByTarget({
      storeId: "store_1",
      targetId: "target_1",
      targetType: "finance_entry",
      tenantId: "tenant_1",
    });

    expect(selectCalls).toBe(1);
    expect(innerJoinCalls).toBe(1);
    expect(result.map(({ id }) => id)).toEqual([
      "document_newer",
      "document_older",
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "document_newer",
        storeId: "store_1",
        targetId: "target_1",
        targetType: "finance_entry",
        tenantId: "tenant_1",
      }),
      expect.objectContaining({
        id: "document_older",
        storeId: "store_1",
        targetId: "target_1",
        targetType: "finance_entry",
        tenantId: "tenant_1",
      }),
    ]);

    const dialect = new PgDialect();
    const joinQuery = dialect.sqlToQuery(joinClause!);
    const whereQuery = dialect.sqlToQuery(whereClause!);
    const orderByQuery = dialect.sqlToQuery(orderByClause!);

    expect(joinQuery.sql).toContain(
      '"documents"."id" = "document_links"."document_id"',
    );
    expect(whereQuery.sql).toContain('"document_links"."store_id"');
    expect(whereQuery.sql).toContain('"document_links"."tenant_id"');
    expect(whereQuery.sql).toContain('"document_links"."target_id"');
    expect(whereQuery.sql).toContain('"document_links"."target_type"');
    expect(whereQuery.sql).toContain('"documents"."store_id"');
    expect(whereQuery.sql).toContain('"documents"."tenant_id"');
    expect(whereQuery.sql).toContain('"documents"."is_deleted"');
    expect(whereQuery.params).toEqual([
      "store_1",
      "tenant_1",
      "store_1",
      "tenant_1",
      false,
      "target_1",
      "finance_entry",
    ]);
    expect(orderByQuery.sql).toBe('"documents"."uploaded_at" desc');
  });
});

function linkedRow(id: string, uploadedAt: Date) {
  const timestamp = new Date("2026-08-01T12:00:00.000Z");
  return {
    document: {
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
    },
    link: {
      linkRole: "primary",
      targetId: "target_1",
      targetType: "finance_entry" as const,
    },
  };
}
