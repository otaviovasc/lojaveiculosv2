import { and, desc, eq, isNull } from "drizzle-orm";
import {
  fiscalServiceInvoiceTemplates,
  fiscalServiceRecipients,
} from "@lojaveiculosv2/db";
import {
  FiscalRecipientNotFoundError,
  FiscalTemplateNotFoundError,
} from "../../../domains/fiscal/domain/fiscalErrors.js";
import type {
  CreateFiscalRecipientInput,
  CreateFiscalTemplateInput,
  UpdateFiscalRecipientInput,
  UpdateFiscalTemplateInput,
} from "../../../domains/fiscal/ports/fiscalRepository.js";
import type { DrizzleFiscalClient } from "./drizzleFiscalRepository.js";
import { toRecipient, toTemplate } from "./drizzleFiscalRepositoryMappers.js";

export async function createRecipient(
  db: DrizzleFiscalClient,
  input: CreateFiscalRecipientInput,
) {
  const [row] = await db
    .insert(fiscalServiceRecipients)
    .values(input)
    .returning();
  if (!row) throw new Error("Fiscal recipient was not created.");
  return toRecipient(row);
}

export async function listRecipients(
  db: DrizzleFiscalClient,
  input: { storeId: string; tenantId: string },
) {
  return (
    await db
      .select()
      .from(fiscalServiceRecipients)
      .where(activeRecipients(input))
      .orderBy(desc(fiscalServiceRecipients.createdAt))
      .limit(100)
  ).map(toRecipient);
}

export async function getRecipient(
  db: DrizzleFiscalClient,
  input: { id: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(fiscalServiceRecipients)
    .where(scopedRecipient(input.id, input))
    .limit(1);
  return row ? toRecipient(row) : null;
}

export async function updateRecipient(
  db: DrizzleFiscalClient,
  input: UpdateFiscalRecipientInput,
) {
  const [row] = await db
    .update(fiscalServiceRecipients)
    .set(withoutIdentity(input))
    .where(scopedRecipient(input.id, input))
    .returning();
  if (!row) throw new FiscalRecipientNotFoundError(input.id);
  return toRecipient(row);
}

export async function createTemplate(
  db: DrizzleFiscalClient,
  input: CreateFiscalTemplateInput,
) {
  const [row] = await db
    .insert(fiscalServiceInvoiceTemplates)
    .values({ ...input, version: input.version ?? 1 })
    .returning();
  if (!row) throw new Error("Fiscal template was not created.");
  return toTemplate(row);
}

export async function listTemplates(
  db: DrizzleFiscalClient,
  input: {
    recipientId?: string | null | undefined;
    storeId: string;
    tenantId: string;
  },
) {
  return (
    await db
      .select()
      .from(fiscalServiceInvoiceTemplates)
      .where(activeTemplates(input))
      .orderBy(desc(fiscalServiceInvoiceTemplates.createdAt))
      .limit(100)
  ).map(toTemplate);
}

export async function getTemplate(
  db: DrizzleFiscalClient,
  input: { id: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(fiscalServiceInvoiceTemplates)
    .where(scopedTemplate(input.id, input))
    .limit(1);
  return row ? toTemplate(row) : null;
}

export async function updateTemplate(
  db: DrizzleFiscalClient,
  input: UpdateFiscalTemplateInput,
) {
  const [row] = await db
    .update(fiscalServiceInvoiceTemplates)
    .set(withoutIdentity(input))
    .where(scopedTemplate(input.id, input))
    .returning();
  if (!row) throw new FiscalTemplateNotFoundError(input.id);
  return toTemplate(row);
}

function activeRecipients(input: { storeId: string; tenantId: string }) {
  return and(
    eq(fiscalServiceRecipients.storeId, input.storeId),
    eq(fiscalServiceRecipients.tenantId, input.tenantId),
    eq(fiscalServiceRecipients.isActive, true),
    eq(fiscalServiceRecipients.isDeleted, false),
  );
}

function scopedRecipient(
  recipientId: string,
  input: { storeId: string; tenantId: string },
) {
  return and(
    eq(fiscalServiceRecipients.id, recipientId),
    activeRecipients(input),
  );
}

function activeTemplates(input: {
  recipientId?: string | null | undefined;
  storeId: string;
  tenantId: string;
}) {
  const recipientFilter =
    input.recipientId === undefined
      ? undefined
      : input.recipientId === null
        ? isNull(fiscalServiceInvoiceTemplates.recipientId)
        : eq(fiscalServiceInvoiceTemplates.recipientId, input.recipientId);
  return and(
    eq(fiscalServiceInvoiceTemplates.storeId, input.storeId),
    eq(fiscalServiceInvoiceTemplates.tenantId, input.tenantId),
    eq(fiscalServiceInvoiceTemplates.isActive, true),
    eq(fiscalServiceInvoiceTemplates.isDeleted, false),
    recipientFilter,
  );
}

function scopedTemplate(
  templateId: string,
  input: { storeId: string; tenantId: string },
) {
  return and(
    eq(fiscalServiceInvoiceTemplates.id, templateId),
    activeTemplates(input),
  );
}

function withoutIdentity<
  T extends { id: string; storeId: string; tenantId: string },
>(input: T) {
  const { id: _id, storeId: _storeId, tenantId: _tenantId, ...rest } = input;
  return rest;
}
