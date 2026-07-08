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
      return mergeDocumentTemplate(
        input.kind,
        row ? toOverride(row) : null,
        input.templateKey ?? input.kind,
      );
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
        rows.map((row) => [row.templateKey, toOverride(row)] as const),
      );
      return listDefaultDocumentTemplates().map((template) => {
        return (
          mergeDocumentTemplate(
            template.kind,
            overrides.get(template.templateKey) ?? null,
            template.templateKey,
          ) ?? template
        );
      });
    },
    async upsertTemplate(input) {
      const fallback = defaultTemplate(input.kind, input.templateKey);
      if (!fallback) throw new Error(`Unsupported template: ${input.kind}`);
      const [row] = await db
        .insert(documentTemplates)
        .values({
          clauses: [...(input.blocks?.length ? input.blocks : input.clauses)],
          kind: input.kind,
          storeId: input.storeId,
          templateKey: input.templateKey,
          tenantId: input.tenantId,
          title: input.title,
          updatedByUserId: input.updatedByUserId,
        })
        .onConflictDoUpdate({
          set: {
            clauses: [...(input.blocks?.length ? input.blocks : input.clauses)],
            isEnabled: true,
            title: input.title,
            updatedByUserId: input.updatedByUserId,
          },
          target: [documentTemplates.storeId, documentTemplates.templateKey],
        })
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return template.");
      return (
        mergeDocumentTemplate(input.kind, toOverride(row), input.templateKey) ??
        fallback
      );
    },
  };
}

async function findTemplateRow(
  db: DrizzleDocumentClient,
  input: {
    kind: DocumentKind;
    storeId: string;
    templateKey?: string | undefined;
    tenantId: string;
  },
) {
  const templateKey = input.templateKey ?? input.kind;
  const [row] = await db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.kind, input.kind),
        eq(documentTemplates.storeId, input.storeId),
        eq(documentTemplates.templateKey, templateKey),
        eq(documentTemplates.tenantId, input.tenantId),
        eq(documentTemplates.isEnabled, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

function toOverride(row: TemplateRow) {
  const blocks = toTemplateBlocks(row.clauses);
  return {
    blocks,
    clauses: toTemplateClauses(row.clauses),
    templateKey: row.templateKey,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}

export function toTemplateClauses(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "body" in item) {
        const body = (item as { body?: unknown }).body;
        return typeof body === "string" ? body : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item?.trim()));
}

export function toTemplateBlocks(
  value: unknown,
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          body: item,
          id: `legacy_clause_${index + 1}`,
          label: `Clausula ${index + 1}`,
          type: "clause",
        };
      }
      return item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : null;
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));
}
