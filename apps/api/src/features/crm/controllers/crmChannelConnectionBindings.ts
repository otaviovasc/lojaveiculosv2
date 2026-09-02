import {
  getCrmChannelConnectionOverview,
  listCrmChannelConnections,
  updateCrmChannelConnection,
} from "../../../domains/crm/services/CrmChannelConnectionService/crmChannelConnections.js";
import { createCrmChannelConnection } from "../../../domains/crm/services/CrmChannelConnectionService/createCrmChannelConnection.js";
import { listUazapiInstances } from "../../../domains/crm/services/CrmChannelConnectionService/listUazapiInstances.js";
import {
  authorizeComposioCrmChannelConnection,
  completeComposioCrmChannelConnection,
  selectComposioChannelSender,
} from "../../../domains/crm/services/CrmChannelConnectionService/composioChannelConnectionSetup.js";
import {
  requestZapiPairingCode,
  requestZapiPairingQr,
} from "../../../domains/crm/services/CrmWhatsappService/zapiWhatsappConnectionSetup.js";
import { requestUazapiPairingCode } from "../../../domains/crm/services/CrmWhatsappService/uazapiPairingCode.js";
import { requestUazapiPairingQr } from "../../../domains/crm/services/CrmWhatsappService/uazapiPairingQr.js";
import {
  disconnectZapiConnection,
  refreshZapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsappService/zapiConnectionLifecycle.js";
import {
  disconnectUazapiConnection,
  refreshUazapiConnectionStatus,
} from "../../../domains/crm/services/CrmWhatsappService/uazapiConnectionLifecycle.js";
import { configureWhatsappConnectionWebhooks } from "../../../domains/crm/services/CrmWhatsappService/configureWhatsappConnectionWebhooks.js";
import { configureUazapiConnectionWebhooks } from "../../../domains/crm/services/CrmWhatsappService/configureUazapiConnectionWebhooks.js";
import {
  getExternalBotIntegration,
  updateExternalBotIntegration,
} from "../../../domains/crm/services/CrmExternalBotService/externalBotIntegration.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { CrmMessagingServices } from "./crmMessagingServiceBindings.types.js";
import { archiveAbandonedZapiConnections } from "../../../domains/crm/services/CrmWhatsappService/archiveAbandonedZapiConnections.js";
import {
  configureZapiWebhooksAsSupport,
  createZapiConnectionAsSupport,
  requestZapiPairingCodeAsSupport,
  requestZapiPairingQrAsSupport,
  updateZapiCredentialsAsSupport,
} from "../../../domains/crm/services/CrmWhatsappService/manageZapiConnectionAsSupport.js";
import { retryOlxChatSetup } from "../../../domains/crm/services/CrmService/retryOlxChatSetup.js";
import { repairZapiConnectionCredentials } from "../../../domains/crm/services/CrmWhatsappService/repairZapiConnectionCredentials.js";
import {
  getZapiConnectionReplacementStatus,
  startZapiConnectionReplacement,
} from "../../../domains/crm/services/CrmWhatsappService/replaceZapiConnection.js";
import { grantConnectionMember } from "../../../domains/crm/services/CrmConnectionMemberService/grantConnectionMember.js";
import { listConnectionMembers } from "../../../domains/crm/services/CrmConnectionMemberService/listConnectionMembers.js";
import { revokeConnectionMember } from "../../../domains/crm/services/CrmConnectionMemberService/revokeConnectionMember.js";

type ConnectionBindings = Pick<
  CrmMessagingServices,
  | "archiveAbandonedZapiConnections"
  | "authorizeComposioCrmChannelConnection"
  | "completeComposioCrmChannelConnection"
  | "configureZapiWebhooksAsSupport"
  | "configureUazapiConnectionWebhooks"
  | "createZapiConnectionAsSupport"
  | "configureWhatsappConnectionWebhooks"
  | "createChannelConnection"
  | "disconnectZapiConnection"
  | "disconnectUazapiConnection"
  | "getExternalBotConfiguration"
  | "getChannelConnectionOverview"
  | "grantConnectionMember"
  | "listConnectionMembers"
  | "revokeConnectionMember"
  | "listCrmChannelConnections"
  | "listUazapiInstances"
  | "requestZapiPairingCode"
  | "requestZapiPairingQr"
  | "requestUazapiPairingCode"
  | "requestUazapiPairingQr"
  | "repairZapiConnectionCredentials"
  | "startZapiConnectionReplacement"
  | "getZapiConnectionReplacementStatus"
  | "retryOlxChatSetup"
  | "refreshZapiConnectionStatus"
  | "refreshUazapiConnectionStatus"
  | "requestZapiPairingCodeAsSupport"
  | "requestZapiPairingQrAsSupport"
  | "selectComposioChannelSender"
  | "updateExternalBotConfiguration"
  | "updateChannelConnection"
  | "updateZapiCredentialsAsSupport"
>;

export const createCrmChannelConnectionBindings = (
  ports: CrmServicePorts,
): ConnectionBindings => ({
  archiveAbandonedZapiConnections: (context, input) =>
    archiveAbandonedZapiConnections(context, input, ports),
  authorizeComposioCrmChannelConnection: (context, input) =>
    authorizeComposioCrmChannelConnection(context, input, ports),
  completeComposioCrmChannelConnection: (context, input) =>
    completeComposioCrmChannelConnection(context, input, ports),
  configureZapiWebhooksAsSupport: (context, input) =>
    configureZapiWebhooksAsSupport(context, input, ports),
  configureUazapiConnectionWebhooks: (context, input) =>
    configureUazapiConnectionWebhooks(context, input, ports),
  createZapiConnectionAsSupport: (context, input) =>
    createZapiConnectionAsSupport(context, input, ports),
  configureWhatsappConnectionWebhooks: (context, input) =>
    configureWhatsappConnectionWebhooks(context, input, ports),
  createChannelConnection: (context, input) =>
    createCrmChannelConnection(context, input, ports),
  disconnectZapiConnection: (context, input) =>
    disconnectZapiConnection(context, input, ports),
  disconnectUazapiConnection: (context, input) =>
    disconnectUazapiConnection(context, input, ports),
  getExternalBotConfiguration: (context) =>
    getExternalBotIntegration(context, ports),
  getChannelConnectionOverview: (context) =>
    getCrmChannelConnectionOverview(context, ports),
  grantConnectionMember: (context, input) =>
    grantConnectionMember(context, input, ports),
  listConnectionMembers: (context, input) =>
    listConnectionMembers(context, input, ports),
  revokeConnectionMember: (context, input) =>
    revokeConnectionMember(context, input, ports),
  listCrmChannelConnections: (context) =>
    listCrmChannelConnections(context, ports),
  listUazapiInstances: (context, input) =>
    listUazapiInstances(context, input, ports),
  requestZapiPairingCode: (context, input) =>
    requestZapiPairingCode(context, input, ports),
  requestZapiPairingQr: (context, input) =>
    requestZapiPairingQr(context, input, ports),
  requestUazapiPairingCode: (context, input) =>
    requestUazapiPairingCode(context, input, ports),
  requestUazapiPairingQr: (context, input) =>
    requestUazapiPairingQr(context, input, ports),
  repairZapiConnectionCredentials: (context, input) =>
    repairZapiConnectionCredentials(context, input, ports),
  startZapiConnectionReplacement: (context, input) =>
    startZapiConnectionReplacement(context, input, ports),
  getZapiConnectionReplacementStatus: (context, input) =>
    getZapiConnectionReplacementStatus(context, input, ports),
  retryOlxChatSetup: (context, input) =>
    retryOlxChatSetup(context, input, ports),
  refreshZapiConnectionStatus: (context, input) =>
    refreshZapiConnectionStatus(context, input, ports),
  refreshUazapiConnectionStatus: (context, input) =>
    refreshUazapiConnectionStatus(context, input, ports),
  requestZapiPairingCodeAsSupport: (context, input) =>
    requestZapiPairingCodeAsSupport(context, input, ports),
  requestZapiPairingQrAsSupport: (context, input) =>
    requestZapiPairingQrAsSupport(context, input, ports),
  selectComposioChannelSender: (context, input) =>
    selectComposioChannelSender(context, input, ports),
  updateExternalBotConfiguration: (context, input) =>
    updateExternalBotIntegration(context, input, ports),
  updateChannelConnection: (context, input) =>
    updateCrmChannelConnection(context, input, ports),
  updateZapiCredentialsAsSupport: (context, input) =>
    updateZapiCredentialsAsSupport(context, input, ports),
});
