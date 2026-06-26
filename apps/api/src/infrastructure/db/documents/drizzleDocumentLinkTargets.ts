import { and, eq, isNull } from "drizzle-orm";
import {
  financeEntries,
  financingInquiries,
  fiscalDocuments,
  leads,
  salePayments,
  sales,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { DocumentLinkTargetValidator } from "../../../domains/documents/ports/documentLinkTargetValidator.js";
import type { DrizzleDocumentClient } from "./drizzleDocumentRepository.js";

export function createDrizzleDocumentLinkTargetValidator(
  db: DrizzleDocumentClient,
): DocumentLinkTargetValidator {
  return {
    async existsInScope(input) {
      if (input.targetType === "store") return input.targetId === input.storeId;
      switch (input.targetType) {
        case "finance_entry": {
          const [entry] = await db
            .select({ id: financeEntries.id })
            .from(financeEntries)
            .where(
              and(
                eq(financeEntries.id, input.targetId),
                eq(financeEntries.storeId, input.storeId),
                eq(financeEntries.tenantId, input.tenantId),
              ),
            )
            .limit(1);
          return Boolean(entry);
        }
        case "financing_inquiry": {
          const [inquiry] = await db
            .select({ id: financingInquiries.id })
            .from(financingInquiries)
            .where(
              and(
                eq(financingInquiries.id, input.targetId),
                eq(financingInquiries.storeId, input.storeId),
                eq(financingInquiries.tenantId, input.tenantId),
              ),
            )
            .limit(1);
          return Boolean(inquiry);
        }
        case "fiscal_document": {
          const [document] = await db
            .select({ id: fiscalDocuments.id })
            .from(fiscalDocuments)
            .where(
              and(
                eq(fiscalDocuments.id, input.targetId),
                eq(fiscalDocuments.storeId, input.storeId),
                eq(fiscalDocuments.tenantId, input.tenantId),
              ),
            )
            .limit(1);
          return Boolean(document);
        }
        case "lead": {
          const [lead] = await db
            .select({ id: leads.id })
            .from(leads)
            .where(
              and(
                eq(leads.id, input.targetId),
                eq(leads.storeId, input.storeId),
                eq(leads.tenantId, input.tenantId),
                eq(leads.isDeleted, false),
                isNull(leads.deletedAt),
              ),
            )
            .limit(1);
          return Boolean(lead);
        }
        case "sale": {
          const [sale] = await db
            .select({ id: sales.id })
            .from(sales)
            .where(
              and(
                eq(sales.id, input.targetId),
                eq(sales.storeId, input.storeId),
                eq(sales.tenantId, input.tenantId),
                eq(sales.isDeleted, false),
                isNull(sales.deletedAt),
              ),
            )
            .limit(1);
          return Boolean(sale);
        }
        case "sale_payment": {
          const [payment] = await db
            .select({ id: salePayments.id })
            .from(salePayments)
            .where(
              and(
                eq(salePayments.id, input.targetId),
                eq(salePayments.storeId, input.storeId),
                eq(salePayments.tenantId, input.tenantId),
              ),
            )
            .limit(1);
          return Boolean(payment);
        }
        case "vehicle_unit": {
          const [unit] = await db
            .select({ id: vehicleUnits.id })
            .from(vehicleUnits)
            .where(
              and(
                eq(vehicleUnits.id, input.targetId),
                eq(vehicleUnits.storeId, input.storeId),
                eq(vehicleUnits.tenantId, input.tenantId),
                eq(vehicleUnits.isDeleted, false),
                isNull(vehicleUnits.deletedAt),
              ),
            )
            .limit(1);
          return Boolean(unit);
        }
      }
    },
  };
}
