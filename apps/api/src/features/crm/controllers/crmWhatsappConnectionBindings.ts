import {
  getWhatsappConnectionOverview,
  listWhatsappConnections,
  updateWhatsappConnection,
} from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
import { createWhatsappConnection } from "../../../domains/crm/services/CrmWhatsapp/createWhatsappConnection.js";
import {
  authorizeComposioWhatsappConnection,
  completeComposioWhatsappConnection,
  selectComposioWhatsappSender,
} from "../../../domains/crm/services/CrmWhatsapp/composioWhatsappConnectionSetup.js";
import {
  requestZapiPairingCode,
  requestZapiPairingQr,
} from "../../../domains/crm/services/CrmWhatsapp/zapiWhatsappConnectionSetup.js";
import {
  disconnectZapiConnection,
  refreshZapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsapp/zapiConnectionLifecycle.js";
import { configureWhatsappConnectionWebhooks } from "../../../domains/crm/services/CrmWhatsapp/configureWhatsappConnectionWebhooks.js";
import {
  authenticateWhatsappBotSecret,
  getWhatsappBotIntegration,
  updateWhatsappBotIntegration,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import { executeWhatsappBotAction } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotActions.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { CrmWhatsappServices } from "./crmWhatsappServiceBindings.types.js";
import { archiveAbandonedZapiConnections } from "../../../domains/crm/services/CrmWhatsapp/archiveAbandonedZapiConnections.js";
import {
  configureZapiWebhooksAsSupport,
  createZapiConnectionAsSupport,
  requestZapiPairingCodeAsSupport,
  requestZapiPairingQrAsSupport,
  updateZapiCredentialsAsSupport,
} from "../../../domains/crm/services/CrmWhatsapp/manageZapiConnectionAsSupport.js";

type ConnectionBindings = Pick<
  CrmWhatsappServices,
  | "authenticateWhatsappBotSecret"
  | "archiveAbandonedZapiConnections"
  | "authorizeComposioWhatsappConnection"
  | "completeComposioWhatsappConnection"
  | "configureZapiWebhooksAsSupport"
  | "createZapiConnectionAsSupport"
  | "configureWhatsappConnectionWebhooks"
  | "createWhatsappConnection"
  | "disconnectZapiConnection"
  | "executeWhatsappBotAction"
  | "getWhatsappBotIntegration"
  | "getWhatsappConnectionOverview"
  | "listWhatsappConnections"
  | "requestZapiPairingCode"
  | "requestZapiPairingQr"
  | "refreshZapiConnectionStatus"
  | "requestZapiPairingCodeAsSupport"
  | "requestZapiPairingQrAsSupport"
  | "selectComposioWhatsappSender"
  | "updateWhatsappBotIntegration"
  | "updateWhatsappConnection"
  | "updateZapiCredentialsAsSupport"
>;

export const createCrmWhatsappConnectionBindings = (
  ports: CrmServicePorts,
): ConnectionBindings => ({
  archiveAbandonedZapiConnections: (context, input) =>
    archiveAbandonedZapiConnections(context, input, ports),
  authenticateWhatsappBotSecret: (context, input) =>
    authenticateWhatsappBotSecret(context, input, ports),
  authorizeComposioWhatsappConnection: (context, input) =>
    authorizeComposioWhatsappConnection(context, input, ports),
  completeComposioWhatsappConnection: (context, input) =>
    completeComposioWhatsappConnection(context, input, ports),
  configureZapiWebhooksAsSupport: (context, input) =>
    configureZapiWebhooksAsSupport(context, input, ports),
  createZapiConnectionAsSupport: (context, input) =>
    createZapiConnectionAsSupport(context, input, ports),
  configureWhatsappConnectionWebhooks: (context, input) =>
    configureWhatsappConnectionWebhooks(context, input, ports),
  createWhatsappConnection: (context, input) =>
    createWhatsappConnection(context, input, ports),
  disconnectZapiConnection: (context, input) =>
    disconnectZapiConnection(context, input, ports),
  executeWhatsappBotAction: (context, input) =>
    executeWhatsappBotAction(context, input, ports),
  getWhatsappBotIntegration: (context) =>
    getWhatsappBotIntegration(context, ports),
  getWhatsappConnectionOverview: (context) =>
    getWhatsappConnectionOverview(context, ports),
  listWhatsappConnections: (context) => listWhatsappConnections(context, ports),
  requestZapiPairingCode: (context, input) =>
    requestZapiPairingCode(context, input, ports),
  requestZapiPairingQr: (context, input) =>
    requestZapiPairingQr(context, input, ports),
  refreshZapiConnectionStatus: (context, input) =>
    refreshZapiConnectionStatus(context, input, ports),
  requestZapiPairingCodeAsSupport: (context, input) =>
    requestZapiPairingCodeAsSupport(context, input, ports),
  requestZapiPairingQrAsSupport: (context, input) =>
    requestZapiPairingQrAsSupport(context, input, ports),
  selectComposioWhatsappSender: (context, input) =>
    selectComposioWhatsappSender(context, input, ports),
  updateWhatsappBotIntegration: (context, input) =>
    updateWhatsappBotIntegration(context, input, ports),
  updateWhatsappConnection: (context, input) =>
    updateWhatsappConnection(context, input, ports),
  updateZapiCredentialsAsSupport: (context, input) =>
    updateZapiCredentialsAsSupport(context, input, ports),
});
