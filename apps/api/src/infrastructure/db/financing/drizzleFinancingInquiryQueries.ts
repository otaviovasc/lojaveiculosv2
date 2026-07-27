import { and, desc, eq } from "drizzle-orm";
import { financingConditions, financingInquiries } from "@lojaveiculosv2/db";
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
  return toInquiry(row, await readConditions(db, row.id));
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
    rows.map(async (row) => toInquiry(row, await readConditions(db, row.id))),
  );
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
