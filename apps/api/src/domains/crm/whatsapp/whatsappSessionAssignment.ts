import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { reloadScopedWhatsappSession } from "../services/CrmWhatsapp/executeWhatsappSessionCommand.js";

export type WhatsappSessionAssignmentResult = {
  previousAssignedUserId?: string;
  result: "already_applied" | "applied" | "superseded";
  session: CrmWhatsappSession;
};

export async function applyWhatsappSessionAssignment(input: {
  allowReassignment: boolean;
  assignedAt: Date;
  assignedUserId: string | null;
  initialSession: CrmWhatsappSession;
  ports: CrmServicePorts;
  scope: { storeId: string; tenantId: string };
}): Promise<WhatsappSessionAssignmentResult> {
  let current = input.initialSession;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (current.assignedUserId === input.assignedUserId) {
      return { result: "already_applied", session: current };
    }
    if (current.assignedUserId !== null && !input.allowReassignment) {
      return { result: "superseded", session: current };
    }
    const updated = await getCrmWhatsappRepository(input.ports).updateSession({
      assignedUserId: input.assignedUserId as never,
      expectedRevision: current.revision,
      ...(input.assignedUserId
        ? {
            firstHandledAt: current.firstHandledAt ?? input.assignedAt,
            lastAssignedAt: input.assignedAt,
          }
        : {}),
      sessionId: current.id,
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (updated) {
      if (current.leadId) {
        await getCrmRepository(input.ports).updateLead({
          assignedUserId: input.assignedUserId as never,
          leadId: current.leadId,
          storeId: input.scope.storeId as never,
          tenantId: input.scope.tenantId as never,
        });
      }
      return {
        ...(current.assignedUserId
          ? { previousAssignedUserId: current.assignedUserId }
          : {}),
        result: "applied",
        session: updated,
      };
    }
    current = await reloadScopedWhatsappSession(
      input.ports,
      current.id,
      input.scope,
    );
  }
  return { result: "superseded", session: current };
}
