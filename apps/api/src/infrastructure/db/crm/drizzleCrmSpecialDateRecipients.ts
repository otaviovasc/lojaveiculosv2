import { and, asc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { leads, sales } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { SpecialDateRecipientCandidate } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import { canonicalRecipientKey } from "./drizzleCrmSpecialDateSupport.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

const RECIPIENT_PAGE_SIZE = 100;

export async function findBirthdayRecipients(
  db: DrizzleCrmClient,
  tenantId: TenantId,
  storeId: StoreId,
): Promise<readonly SpecialDateRecipientCandidate[]> {
  const rows = await readAllPages((offset) =>
    db
      .select({
        birthDate: leads.birthDate,
        buyerName: leads.buyerName,
        buyerPhone: leads.buyerPhone,
      })
      .from(leads)
      .where(activeLeadScope(tenantId, storeId, true))
      .orderBy(asc(leads.id))
      .limit(RECIPIENT_PAGE_SIZE)
      .offset(offset),
  );

  return rows
    .filter((row) => Boolean(row.birthDate && row.buyerPhone))
    .map((row) => ({
      key: canonicalRecipientKey("lead", row.buyerPhone!),
      name: row.buyerName || "Cliente",
      phone: row.buyerPhone!,
      rawDate: row.birthDate!,
      storeId,
      tenantId,
    }));
}

export async function findAudienceRecipients(
  db: DrizzleCrmClient,
  tenantId: TenantId,
  storeId: StoreId,
): Promise<readonly SpecialDateRecipientCandidate[]> {
  const rows = await readAllPages((offset) =>
    db
      .select({
        buyerName: leads.buyerName,
        buyerPhone: leads.buyerPhone,
      })
      .from(leads)
      .where(activeLeadScope(tenantId, storeId, false))
      .orderBy(asc(leads.id))
      .limit(RECIPIENT_PAGE_SIZE)
      .offset(offset),
  );

  return rows
    .filter((row) => Boolean(row.buyerPhone))
    .map((row) => ({
      key: canonicalRecipientKey("lead", row.buyerPhone!),
      name: row.buyerName || "Cliente",
      phone: row.buyerPhone!,
      storeId,
      tenantId,
    }));
}

export async function findAnniversaryRecipients(
  db: DrizzleCrmClient,
  tenantId: TenantId,
  storeId: StoreId,
): Promise<readonly SpecialDateRecipientCandidate[]> {
  const rows = await readAllPages((offset) =>
    db
      .select({
        buyerSnapshot: sales.buyerSnapshot,
        closedAt: sales.closedAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.tenantId, tenantId),
          eq(sales.storeId, storeId),
          eq(sales.status, "closed"),
          eq(sales.isDeleted, false),
          isNull(sales.deletedAt),
          eq(sales.isCurrentRevision, true),
          isNotNull(sales.closedAt),
        ),
      )
      .orderBy(asc(sales.id))
      .limit(RECIPIENT_PAGE_SIZE)
      .offset(offset),
  );

  return rows.flatMap((row) => {
    if (!row.closedAt) return [];
    const phone = readCanonicalPhone(row.buyerSnapshot);
    if (!phone) return [];
    return [
      {
        closedAt: row.closedAt,
        key: canonicalRecipientKey("sale", phone),
        name: readCanonicalName(row.buyerSnapshot),
        phone,
        storeId,
        tenantId,
      },
    ];
  });
}

function activeLeadScope(
  tenantId: TenantId,
  storeId: StoreId,
  requireBirthDate: boolean,
) {
  const predicates = [
    eq(leads.tenantId, tenantId),
    eq(leads.storeId, storeId),
    eq(leads.isDeleted, false),
    isNull(leads.deletedAt),
    ne(leads.status, "archived"),
    isNotNull(leads.buyerPhone),
  ];
  if (requireBirthDate) predicates.push(isNotNull(leads.birthDate));
  return and(...predicates);
}

async function readAllPages<T>(readPage: (offset: number) => Promise<T[]>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += RECIPIENT_PAGE_SIZE) {
    const page = await readPage(offset);
    rows.push(...page);
    if (page.length < RECIPIENT_PAGE_SIZE) return rows;
  }
}

function readCanonicalPhone(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = (snapshot as { phone?: unknown }).phone;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCanonicalName(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "Cliente";
  const value = (snapshot as { name?: unknown }).name;
  return typeof value === "string" && value.trim() ? value.trim() : "Cliente";
}
