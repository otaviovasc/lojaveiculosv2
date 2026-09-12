import type { CrmPipelineRepository } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import { ensureLeadPipeline } from "../../../domains/crm/pipeline/ensureLeadPipeline.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/types.js";
import type { PublicStorefrontLeadSink } from "../../../domains/storefront/ports/publicStorefrontLeadSink.js";

export function createStorefrontCrmLeadSink(
  repository: CrmRepository,
  pipelineRepository: CrmPipelineRepository,
  transaction?: CrmServicePorts["transaction"],
): PublicStorefrontLeadSink {
  const run =
    transaction ??
    (<T>(action: (ports: CrmServicePorts) => Promise<T>) =>
      action({
        crmPipelineRepository: pipelineRepository,
        crmRepository: repository,
      }));
  return {
    createLead: async (input) =>
      run(async (ports) => {
        const placement = await ensureLeadPipeline(ports, {
          storeId: input.storeId,
          tenantId: input.tenantId,
        });
        return toPublicLead(
          await ports.crmRepository.createLead({ ...input, ...placement }),
        );
      }),
    listLeads: async (input) =>
      (await repository.listLeads(input))
        .filter((lead) => lead.source === "public_site")
        .map(toPublicLead),
  };
}

function toPublicLead(lead: Awaited<ReturnType<CrmRepository["createLead"]>>) {
  return {
    buyerEmail: lead.buyerEmail,
    buyerPhone: lead.buyerPhone,
    createdAt: lead.createdAt,
    id: lead.id,
    listingId: lead.listingId,
    source: "public_site" as const,
    status: lead.status,
  };
}
