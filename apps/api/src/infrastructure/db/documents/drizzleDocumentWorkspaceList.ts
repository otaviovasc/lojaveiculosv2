import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { documentLinks, documents } from "@lojaveiculosv2/db";
import type { InferSelectModel } from "drizzle-orm";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";
import type { ListDocumentsInput } from "../../../domains/documents/ports/documentRepository.js";

type DocumentRow = InferSelectModel<typeof documents>;
type DocumentLinkRow = InferSelectModel<typeof documentLinks>;

export type DrizzleDocumentClient = PostgresJsDatabase<typeof schema>;

export type DrizzleDocumentWorkspaceRow = {
  document: DocumentRow;
  link: DocumentLinkRow;
};

export async function listDrizzleDocumentWorkspace(
  db: DrizzleDocumentClient,
  input: ListDocumentsInput,
): Promise<{
  rows: readonly DrizzleDocumentWorkspaceRow[];
  total: number;
}> {
  const filters = and(...createDrizzleDocumentListFilters(db, input));
  const [documentRows, totals] = await Promise.all([
    db
      .selectDistinct({ document: documents })
      .from(documentLinks)
      .innerJoin(documents, eq(documents.id, documentLinks.documentId))
      .where(filters)
      .orderBy(desc(documents.uploadedAt), desc(documents.id))
      .limit(input.limit ?? 100)
      .offset(input.offset ?? 0),
    db
      .select({ total: countDistinct(documents.id) })
      .from(documentLinks)
      .innerJoin(documents, eq(documents.id, documentLinks.documentId))
      .where(filters),
  ]);

  if (documentRows.length === 0) {
    return { rows: [], total: totals[0]?.total ?? 0 };
  }

  const links = await db
    .select({ link: documentLinks })
    .from(documentLinks)
    .where(
      and(
        ...listLinkFilters(input),
        inArray(
          documentLinks.documentId,
          documentRows.map(({ document }) => document.id),
        ),
      ),
    )
    .orderBy(
      asc(documentLinks.documentId),
      asc(
        sql<number>`case when ${documentLinks.linkRole} = 'primary' then 0 else 1 end`,
      ),
      asc(documentLinks.targetType),
      asc(documentLinks.targetId),
      asc(documentLinks.linkRole),
      asc(documentLinks.id),
    );
  const firstLinkByDocumentId = new Map<string, DocumentLinkRow>();
  for (const { link } of links) {
    if (!firstLinkByDocumentId.has(link.documentId)) {
      firstLinkByDocumentId.set(link.documentId, link);
    }
  }

  return {
    rows: documentRows.map(({ document }) => {
      const link = firstLinkByDocumentId.get(document.id);
      if (!link) {
        throw new Error(`Document workspace link not found: ${document.id}`);
      }
      return { document, link };
    }),
    total: totals[0]?.total ?? 0,
  };
}

export function createDrizzleDocumentListFilters(
  db: DrizzleDocumentClient,
  input: ListDocumentsInput,
) {
  return [
    ...listLinkFilters(input),
    eq(documents.storeId, input.storeId),
    eq(documents.tenantId, input.tenantId),
    eq(documents.isDeleted, false),
    ...(input.kind ? [eq(documents.kind, input.kind)] : []),
    ...(input.status ? [eq(documents.status, input.status)] : []),
    ...(input.origin === "manual"
      ? [sql`${documents.metadata}->>'manualUpload' = 'true'`]
      : input.origin === "automatic"
        ? [
            sql`coalesce(${documents.metadata}->>'manualUpload', 'false') <> 'true'`,
          ]
        : []),
    ...(input.uploadedFrom
      ? [gte(documents.uploadedAt, input.uploadedFrom)]
      : []),
    ...(input.uploadedTo ? [lte(documents.uploadedAt, input.uploadedTo)] : []),
    ...documentScopeFilters(db, input),
    ...(input.search
      ? [
          or(
            ilike(documents.title, `%${input.search}%`),
            ilike(documents.fileName, `%${input.search}%`),
            ilike(
              sql<string>`${documents.metadata}::text`,
              `%${input.search}%`,
            ),
          ),
        ]
      : []),
  ];
}

function listLinkFilters(input: ListDocumentsInput) {
  return [
    eq(documentLinks.storeId, input.storeId),
    eq(documentLinks.tenantId, input.tenantId),
    ...(input.targetId ? [eq(documentLinks.targetId, input.targetId)] : []),
    ...(input.targetType
      ? [eq(documentLinks.targetType, input.targetType)]
      : input.scope === "vehicle"
        ? [eq(documentLinks.targetType, "vehicle_unit")]
        : []),
  ];
}

function documentScopeFilters(
  db: DrizzleDocumentClient,
  input: ListDocumentsInput,
) {
  if (!input.scope) return [];
  const unitLinks = alias(documentLinks, "document_workspace_unit_links");
  const matchingUnitLink = db
    .select({ id: unitLinks.id })
    .from(unitLinks)
    .where(
      and(
        eq(unitLinks.documentId, documents.id),
        eq(unitLinks.storeId, input.storeId),
        eq(unitLinks.tenantId, input.tenantId),
        eq(unitLinks.targetType, "vehicle_unit"),
      ),
    );
  return [
    input.scope === "vehicle"
      ? exists(matchingUnitLink)
      : notExists(matchingUnitLink),
  ];
}
