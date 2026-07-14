import { createHash } from "node:crypto";
import type { z } from "zod";
import type { FinanceServices } from "../../finance/controllers/financeServices.js";
import type { CrmServices } from "./crmServices.js";
import { assertPermission } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";
import type { createLeadFinancialProductSchema } from "./crm.controller.schemas.js";

type FinancialProductInput = z.infer<typeof createLeadFinancialProductSchema>;

export type CrmFinancialProductPorts = {
  createActivity: Pick<CrmServices, "createActivity">["createActivity"];
  materializeAutoEntries: Pick<
    FinanceServices,
    "materializeAutoEntries"
  >["materializeAutoEntries"];
};

export type CrmFinancialProductTransactionRunner =
  TransactionRunner<CrmFinancialProductPorts>;

export async function createCrmLeadFinancialProduct(
  context: ServiceContext,
  leadId: string,
  input: FinancialProductInput,
  services: Pick<CrmServices, "createActivity">,
  financeServices: Pick<FinanceServices, "materializeAutoEntries">,
  transactionRunner: CrmFinancialProductTransactionRunner = createPassthroughTransactionRunner(
    {
      createActivity: services.createActivity,
      materializeAutoEntries: financeServices.materializeAutoEntries,
    },
  ),
) {
  assertPermission(context, "finance.create");
  return transactionRunner.runInTransaction((ports) =>
    createFinancialProductInTransaction(context, leadId, input, ports),
  );
}

async function createFinancialProductInTransaction(
  context: ServiceContext,
  leadId: string,
  input: FinancialProductInput,
  ports: CrmFinancialProductPorts,
) {
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const productMetadata = financialProductMetadata(input);
  const activity = await ports.createActivity(context, {
    activityType: "note",
    content: financialProductContent(input),
    direction: "internal",
    idempotencyFingerprint: financialProductFingerprint(leadId, input),
    idempotencyKey: input.idempotencyKey,
    leadId,
    metadata: {
      financialProduct: productMetadata,
    },
    occurredAt,
  });
  const materialized = await ports.materializeAutoEntries(context, {
    basisCents: financialProductBasis(input),
    event: input.type === "insurance" ? "insurance_issued" : "consortium_sold",
    leadId,
    metadata: {
      activityId: activity.id,
      financialProduct: productMetadata,
      origin: "crm_financial_product",
    },
    occurredAt: activity.occurredAt,
    sellerUserId: input.sellerUserId,
    sourceId: activity.id,
    sourceRevision: 1,
  });

  return {
    activity,
    entries: materialized.map(({ created, entry }) => ({
      created,
      entry: entry.entry,
    })),
  };
}

function financialProductBasis(input: FinancialProductInput) {
  if (input.type === "consortium") {
    return { consortium: input.creditLetterAmountCents };
  }
  return {
    insurance_commission: Math.round(
      (input.premiumCents * input.appliedCommissionBasisPoints) / 10_000,
    ),
    premium: input.premiumCents,
  };
}

function financialProductContent(input: FinancialProductInput) {
  const amountCents =
    input.type === "insurance"
      ? input.premiumCents
      : input.creditLetterAmountCents;
  const product =
    input.type === "insurance" ? "Seguro emitido" : "Consórcio vendido";
  return `${product}: ${formatBrl(amountCents)}`;
}

function financialProductMetadata(input: FinancialProductInput) {
  return input.type === "insurance"
    ? {
        appliedCommissionBasisPoints: input.appliedCommissionBasisPoints,
        financialProductId: input.idempotencyKey,
        idempotencyKey: input.idempotencyKey,
        premiumCents: input.premiumCents,
        sellerUserId: input.sellerUserId,
        type: input.type,
      }
    : {
        creditLetterAmountCents: input.creditLetterAmountCents,
        financialProductId: input.idempotencyKey,
        idempotencyKey: input.idempotencyKey,
        sellerUserId: input.sellerUserId,
        type: input.type,
      };
}

function financialProductFingerprint(
  leadId: string,
  input: FinancialProductInput,
) {
  const identity =
    input.type === "insurance"
      ? [
          "crm_financial_product",
          1,
          leadId,
          input.type,
          input.premiumCents,
          input.appliedCommissionBasisPoints,
          input.sellerUserId,
          input.occurredAt ?? null,
        ]
      : [
          "crm_financial_product",
          1,
          leadId,
          input.type,
          input.creditLetterAmountCents,
          input.sellerUserId,
          input.occurredAt ?? null,
        ];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function formatBrl(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(amountCents / 100);
}
