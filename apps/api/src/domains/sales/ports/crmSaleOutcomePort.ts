import type { ServiceContext } from "../../../shared/serviceContext.js";

export type ApplyWonCrmSaleOutcomeCommand = {
  commandId: string;
  leadId: string;
  saleId: string;
};

export type CrmSaleOutcomePort = {
  applyWon: (
    context: ServiceContext,
    command: ApplyWonCrmSaleOutcomeCommand,
  ) => Promise<void>;
};
