import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { WhatsappMessage } from "../../../domains/crm/whatsapp/whatsappModels.js";
import {
  createWhatsappQuickMessage,
  deleteWhatsappQuickMessage,
  updateWhatsappQuickMessage,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappQuickMessagesMutations.js";
import { listWhatsappQuickMessages } from "../../../domains/crm/services/CrmWhatsapp/whatsappQuickMessagesRead.js";
import {
  sendWhatsappQuickMessage,
  type SendWhatsappQuickMessageInput,
} from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappQuickMessage.js";
import type { WhatsappQuickMessage } from "../../../domains/crm/services/CrmWhatsapp/whatsappQuickMessageModels.js";
import type {
  CreateWhatsappQuickMessageInput,
  UpdateWhatsappQuickMessageInput,
} from "../../../domains/crm/whatsapp/quickMessageInput.js";

export type CrmWhatsappQuickMessageServices = {
  createWhatsappQuickMessage: (
    context: ServiceContext,
    input: CreateWhatsappQuickMessageInput,
  ) => Promise<WhatsappQuickMessage>;
  deleteWhatsappQuickMessage: (
    context: ServiceContext,
    input: { quickMessageId: string },
  ) => Promise<WhatsappQuickMessage>;
  listWhatsappQuickMessages: (
    context: ServiceContext,
  ) => Promise<readonly WhatsappQuickMessage[]>;
  sendWhatsappQuickMessage: (
    context: ServiceContext,
    input: SendWhatsappQuickMessageInput,
  ) => Promise<WhatsappMessage>;
  updateWhatsappQuickMessage: (
    context: ServiceContext,
    input: UpdateWhatsappQuickMessageInput,
  ) => Promise<WhatsappQuickMessage>;
};

export function createCrmWhatsappQuickMessageBindings(
  ports: CrmServicePorts,
): CrmWhatsappQuickMessageServices {
  return {
    createWhatsappQuickMessage: (context, input) =>
      createWhatsappQuickMessage(context, input, ports),
    deleteWhatsappQuickMessage: (context, input) =>
      deleteWhatsappQuickMessage(context, input, ports),
    listWhatsappQuickMessages: (context) =>
      listWhatsappQuickMessages(context, ports),
    sendWhatsappQuickMessage: (context, input) =>
      sendWhatsappQuickMessage(context, input, ports),
    updateWhatsappQuickMessage: (context, input) =>
      updateWhatsappQuickMessage(context, input, ports),
  };
}
