import { and, eq } from "drizzle-orm";
import { documentTemplates } from "@lojaveiculosv2/db";
import type { InferSelectModel } from "drizzle-orm";
import type {
  DocumentKind,
  DocumentRepository,
  UpsertDocumentTemplateInput,
} from "../../../domains/documents/ports/documentRepository.js";
import {
  defaultTemplate,
  listDefaultDocumentTemplates,
  mergeDocumentTemplate,
} from "../../../domains/documents/templates/documentTemplateDefaults.js";
import type { DrizzleDocumentClient } from "./drizzleDocumentRepository.js";

type TemplateRow = InferSelectModel<typeof documentTemplates>;

export function createDrizzleDocumentTemplateMethods(
  db: DrizzleDocumentClient,
): Pick<
  DocumentRepository,
  "findTemplate" | "listTemplates" | "upsertTemplate"
> {
  return {
    async findTemplate(input) {
      const row = await findTemplateRow(db, input);
      return mergeDocumentTemplate(input.kind, row ? toOverride(row) : null);
    },
    async listTemplates(input) {
      const rows = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.storeId, input.storeId),
            eq(documentTemplates.tenantId, input.tenantId),
            eq(documentTemplates.isEnabled, true),
          ),
        );
      const overrides = new Map(
        rows.map((row) => [row.kind, toOverride(row)] as const),
      );
      return listDefaultDocumentTemplates().map((template) => {
        return (
          mergeDocumentTemplate(
            template.kind,
            overrides.get(template.kind) ?? null,
          ) ?? template
        );
      });
    },
    async upsertTemplate(input) {
      const fallback = defaultTemplate(input.kind);
      if (!fallback) throw new Error(`Unsupported template: ${input.kind}`);
      const [row] = await db
        .insert(documentTemplates)
        .values({
          clauses: [...input.clauses],
          kind: input.kind,
          storeId: input.storeId,
          tenantId: input.tenantId,
          title: input.title,
          updatedByUserId: input.updatedByUserId,
        })
        .onConflictDoUpdate({
          set: {
            clauses: [...input.clauses],
            isEnabled: true,
            title: input.title,
            updatedByUserId: input.updatedByUserId,
          },
          target: [documentTemplates.storeId, documentTemplates.kind],
        })
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return template.");
      return mergeDocumentTemplate(input.kind, toOverride(row)) ?? fallback;
    },
  };
}

async function findTemplateRow(
  db: DrizzleDocumentClient,
  input: { kind: DocumentKind; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.kind, input.kind),
        eq(documentTemplates.storeId, input.storeId),
        eq(documentTemplates.tenantId, input.tenantId),
        eq(documentTemplates.isEnabled, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

function toOverride(row: TemplateRow) {
  return {
    clauses: toClauses(row.clauses),
    title: row.title,
    updatedAt: row.updatedAt,
  };
}

function toClauses(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
