import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { CrmMessage } from "../../../domains/crm/ports/crmConversationRepository.js";
import {
  createCrmQuickMessage,
  deleteCrmQuickMessage,
  updateCrmQuickMessage,
} from "../../../domains/crm/services/CrmMessagingService/crmQuickMessagesMutations.js";
import { listCrmQuickMessages } from "../../../domains/crm/services/CrmMessagingService/crmQuickMessagesRead.js";
import {
  sendCrmQuickMessage,
  type SendCrmQuickMessageInput,
} from "../../../domains/crm/services/CrmMessagingService/sendCrmQuickMessage.js";
import type { CrmQuickMessage } from "../../../domains/crm/services/CrmMessagingService/crmQuickMessageModels.js";
import type {
  CreateCrmQuickMessageInput,
  UpdateCrmQuickMessageInput,
} from "../../../domains/crm/messaging/quickMessageInput.js";

export type CrmQuickMessageServices = {
  createCrmQuickMessage: (
    context: ServiceContext,
    input: CreateCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage>;
  deleteCrmQuickMessage: (
    context: ServiceContext,
    input: { quickMessageId: string },
  ) => Promise<CrmQuickMessage>;
  listCrmQuickMessages: (
    context: ServiceContext,
  ) => Promise<readonly CrmQuickMessage[]>;
  sendCrmQuickMessage: (
    context: ServiceContext,
    input: SendCrmQuickMessageInput,
  ) => Promise<CrmMessage>;
  updateCrmQuickMessage: (
    context: ServiceContext,
    input: UpdateCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage>;
};

export function createCrmQuickMessageBindings(
  ports: CrmServicePorts,
): CrmQuickMessageServices {
  return {
    createCrmQuickMessage: (context, input) =>
      createCrmQuickMessage(context, input, ports),
    deleteCrmQuickMessage: (context, input) =>
      deleteCrmQuickMessage(context, input, ports),
    listCrmQuickMessages: (context) => listCrmQuickMessages(context, ports),
    sendCrmQuickMessage: (context, input) =>
      sendCrmQuickMessage(context, input, ports),
    updateCrmQuickMessage: (context, input) =>
      updateCrmQuickMessage(context, input, ports),
  };
}
