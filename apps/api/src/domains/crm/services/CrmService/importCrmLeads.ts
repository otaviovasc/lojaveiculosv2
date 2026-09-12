import { createHash } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { LeadSource } from "../../ports/crmRepository.js";
import { CrmPipelineStageNotFoundError } from "../../crmServiceDomainErrors.js";
import {
  getCrmPipelineRepository,
  getCrmRepository,
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "./serviceSupport.js";

export type ImportCrmLeadsInput = {
  rows: Array<{
    buyerName?: string | undefined;
    buyerPhone?: string | undefined;
    buyerEmail?: string | undefined;
    source?: string | undefined;
  }>;
  pipelineStageId: string;
  idempotencyKey: string;
};
export type ImportCrmLeadsResult = {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};
const sources = new Set<LeadSource>([
  "public_site",
  "crm",
  "external_api",
  "manual",
  "olx",
  "instagram",
  "whatsapp",
  "other",
]);

export async function importCrmLeads(
  context: ServiceContext,
  input: ImportCrmLeadsInput,
  ports: CrmServicePorts,
): Promise<ImportCrmLeadsResult> {
  assertPermission(context, "lead.create");
  const scope = requireCrmScope(context);
  if (
    !input.rows.length ||
    input.rows.length > 500 ||
    !input.idempotencyKey.trim()
  )
    throw new Error("Invalid lead import batch.");
  context.logger.info("crm.leads.import.started", {
    requestId: context.requestId,
    rowCount: input.rows.length,
  });
  const result = await runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmRepository(transactionPorts);
    const scoped = {
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    };
    const stage = await getCrmPipelineRepository(
      transactionPorts,
    ).findStageById({ ...scoped, stageId: input.pipelineStageId });
    if (!stage) throw new CrmPipelineStageNotFoundError(input.pipelineStageId);
    const summary: ImportCrmLeadsResult = {
      created: 0,
      skipped: 0,
      errors: [],
    };
    for (const [index, row] of input.rows.entries()) {
      const parsed = normalizeImportLead(row);
      if (typeof parsed === "string") {
        summary.errors.push({ row: index + 1, message: parsed });
        continue;
      }
      const byPhone = parsed.buyerPhone
        ? await repository.findLeadByPhone({
            ...scoped,
            buyerPhone: parsed.buyerPhone,
            includeClosed: true,
          })
        : null;
      const existing =
        byPhone ??
        (parsed.buyerEmail
          ? await repository.findLeadByEmail({
              ...scoped,
              buyerEmail: parsed.buyerEmail,
            })
          : null);
      if (existing) {
        summary.skipped += 1;
        continue;
      }
      const identity = createHash("sha256")
        .update(parsed.buyerPhone || parsed.buyerEmail!)
        .digest("hex");
      const saved = await repository.createLeadIdempotently({
        ...scoped,
        ...parsed,
        pipelineId: stage.pipelineId,
        pipelineStageId: stage.id,
        sourceIdentityKey: `csv:${identity}`,
        metadata: { importBatchKey: input.idempotencyKey },
      });
      if (saved.created && saved.lead.status !== stage.leadStatus)
        await repository.updateLead({
          ...scoped,
          leadId: saved.lead.id,
          status: stage.leadStatus,
        });
      if (saved.created) summary.created += 1;
      else summary.skipped += 1;
    }
    return summary;
  });
  await context.audit.record({
    action: "crm.leads.import",
    actor: context.actor,
    category: "data_change",
    entityId: scope.storeId,
    entityType: "store",
    metadata: {
      created: result.created,
      skipped: result.skipped,
      invalid: result.errors.length,
      permission: "lead.create",
      pipelineStageId: input.pipelineStageId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    ...scope,
    summary: "Imported CRM leads from CSV",
  });
  return result;
}

export function normalizeImportLead(row: ImportCrmLeadsInput["rows"][number]) {
  const buyerName = row.buyerName?.trim();
  let buyerPhone = row.buyerPhone?.replace(/\D/g, "") || undefined;
  if (buyerPhone && (buyerPhone.length === 10 || buyerPhone.length === 11))
    buyerPhone = `55${buyerPhone}`;
  const buyerEmail = row.buyerEmail?.trim().toLowerCase() || undefined;
  if (!buyerName || buyerName.length > 191)
    return "Informe um nome com até 191 caracteres.";
  if (!buyerPhone && !buyerEmail) return "Informe telefone ou e-mail.";
  if (buyerPhone && (buyerPhone.length < 10 || buyerPhone.length > 15))
    return "Telefone inválido.";
  if (
    buyerEmail &&
    (buyerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))
  )
    return "E-mail inválido.";
  const source = (row.source?.trim() || "manual") as LeadSource;
  if (!sources.has(source)) return "Origem inválida.";
  return {
    buyerName,
    ...(buyerPhone ? { buyerPhone } : {}),
    ...(buyerEmail ? { buyerEmail } : {}),
    source,
  };
}
