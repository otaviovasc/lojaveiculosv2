import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { DocumentTemplate } from "../../ports/documentRepository.js";
import {
  getDocumentRepository,
  requireDocumentWorkspaceScope,
  type DocumentWorkspaceServicePorts,
} from "../DocumentWorkspaceService/serviceSupport.js";

const permission = "documents.read";

export async function listDocumentTemplates(
  context: ServiceContext,
  ports?: DocumentWorkspaceServicePorts,
): Promise<readonly DocumentTemplate[]> {
  assertPermission(context, permission);
  const scope = requireDocumentWorkspaceScope(context);

  const templates = await getDocumentRepository(ports).listTemplates(scope);

  context.logger.info(
    "documents.templates.list",
    createServiceLogMetadata(context, { templateCount: templates.length }),
  );
  await context.audit.record({
    action: "documents.templates.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "document_template",
    metadata: { permission, templateCount: templates.length },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Listed document templates",
    tenantId: scope.tenantId,
  });

  return templates;
}
