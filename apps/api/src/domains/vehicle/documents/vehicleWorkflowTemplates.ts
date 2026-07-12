import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { DocumentTemplate } from "../../documents/ports/documentRepository.js";
import {
  getDocumentTemplateRepository,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";
import { vehicleSaleDocumentKinds } from "./vehicleWorkflowDocuments.js";

export async function getReservationWorkflowTemplate(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
): Promise<DocumentTemplate | null> {
  const repository = getDocumentTemplateRepository(ports);
  if (!repository || !context.storeId || !context.tenantId) return null;
  return repository.findTemplate({
    kind: "reservation_receipt",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
}

export async function getSaleWorkflowTemplates(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
): Promise<ReadonlyMap<string, DocumentTemplate> | undefined> {
  const repository = getDocumentTemplateRepository(ports);
  const { storeId, tenantId } = context;
  if (!repository || !storeId || !tenantId) return undefined;

  const entries = await Promise.all(
    vehicleSaleDocumentKinds.map(
      async (kind) =>
        [
          kind,
          await repository.findTemplate({ kind, storeId, tenantId }),
        ] as const,
    ),
  );
  const templates = new Map<string, DocumentTemplate>();
  for (const [kind, template] of entries) {
    if (template) templates.set(kind, template);
  }
  return templates;
}
