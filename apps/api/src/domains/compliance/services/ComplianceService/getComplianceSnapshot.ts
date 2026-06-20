import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ComplianceSnapshot } from "../../ports/complianceRepository.js";
import {
  requireComplianceScope,
  type ComplianceServicePorts,
} from "./serviceSupport.js";

export async function getComplianceSnapshot(
  context: ServiceContext,
  ports: ComplianceServicePorts,
): Promise<ComplianceSnapshot> {
  assertPermission(context, "compliance.manage");
  const scope = requireComplianceScope(context);

  context.logger.info(
    "compliance.snapshot.read.started",
    createServiceLogMetadata(context),
  );

  const snapshot = await ports.complianceRepository.getSnapshot(scope);

  await context.audit.record({
    action: "compliance.snapshot.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "compliance_snapshot",
    metadata: {
      blocked: snapshot.summary.blocked,
      score: snapshot.score,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read compliance and security posture snapshot",
  });

  return snapshot;
}
