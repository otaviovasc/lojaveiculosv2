import { and, desc, eq } from "drizzle-orm";
import {
  financingConditions,
  financingCustomerConsents,
  financingInquiries,
} from "@lojaveiculosv2/db";
import { toCondition, toInquiry } from "./drizzleFinancingMappers.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function findInquiryById(
  db: DrizzleFinancingClient,
  input: { inquiryId: string; storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(financingInquiries)
    .where(inquiryScope(input))
    .limit(1);
  if (!row) return null;
  return toInquiry(
    row,
    await readConditions(db, row.id),
    await readConsent(db, row),
  );
}

export async function listInquiries(
  db: DrizzleFinancingClient,
  input: { limit?: number; storeId: string; tenantId: string },
) {
  const rows = await db
    .select()
    .from(financingInquiries)
    .where(
      and(
        eq(financingInquiries.storeId, input.storeId),
        eq(financingInquiries.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(financingInquiries.createdAt))
    .limit(input.limit ?? 50);
  return Promise.all(
    rows.map(async (row) =>
      toInquiry(
        row,
        await readConditions(db, row.id),
        await readConsent(db, row),
      ),
    ),
  );
}

export async function readConsent(
  db: DrizzleFinancingClient,
  input: {
    consentId: string | null;
    storeId: string;
    tenantId: string;
  },
) {
  if (!input.consentId) return null;
  const [row] = await db
    .select({
      consentVersion: financingCustomerConsents.consentVersion,
      grantedAt: financingCustomerConsents.grantedAt,
    })
    .from(financingCustomerConsents)
    .where(
      and(
        eq(financingCustomerConsents.id, input.consentId),
        eq(financingCustomerConsents.storeId, input.storeId),
        eq(financingCustomerConsents.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function readConditions(
  db: DrizzleFinancingClient,
  inquiryId: string,
) {
  const rows = await db
    .select()
    .from(financingConditions)
    .where(eq(financingConditions.inquiryId, inquiryId));
  return rows.map(toCondition);
}

export function inquiryScope(input: {
  inquiryId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(financingInquiries.id, input.inquiryId),
    eq(financingInquiries.storeId, input.storeId),
    eq(financingInquiries.tenantId, input.tenantId),
  );
}
