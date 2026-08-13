import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { applyWonCrmLeadOutcome } from "../../../domains/crm/services/CrmService/concludeWhatsappAttendance.js";
import type { CrmSaleOutcomePort } from "../../../domains/sales/ports/crmSaleOutcomePort.js";

export function createCrmSaleOutcomePort(
  crmPorts: CrmServicePorts,
): CrmSaleOutcomePort {
  return {
    async applyWon(context, command) {
      await applyWonCrmLeadOutcome(context, command, crmPorts);
    },
  };
}
