import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { sendWhatsappBotMediaByUrl } from "../services/CrmWhatsapp/sendWhatsappBotMediaByUrl.js";
import { sendWhatsappText } from "../services/CrmWhatsapp/sendWhatsappText.js";
import { startWhatsappConversation } from "../services/CrmWhatsapp/startWhatsappConversation.js";
import type { ExecuteWhatsappBotActionInput } from "../services/CrmWhatsapp/whatsappBotActions.js";
import {
  assertBotPhoneSendAllowed,
  assertBotSendAllowed,
  mediaTypeForBotAction,
  mediaUrlForBotAction,
  readOptionalBotActionSessionId,
  readOptionalText,
  readRequiredText,
  requireBotActionConnectionId,
} from "./whatsappBotActionSupport.js";
import { forwardWhatsappMessageToBot } from "./whatsappBotWebhookForwarding.js";

export async function executeBotSendTextAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const sessionId = readOptionalBotActionSessionId(input);
  if (sessionId) {
    await assertBotSendAllowed(context, sessionId, ports);
    return sendWhatsappText(
      context,
      {
        sessionId,
        text: readRequiredText(input.payload, "text"),
      },
      ports,
    );
  }

  const connectionId = requireBotActionConnectionId(input);
  const phone = await assertBotPhoneSendAllowed(
    context,
    {
      connectionId,
      phone: readRequiredText(input.payload, "phone"),
    },
    ports,
  );
  const started = await startWhatsappConversation(
    context,
    {
      ...(readOptionalText(input.payload, "buyerName")
        ? { buyerName: readRequiredText(input.payload, "buyerName") }
        : {}),
      connectionId,
      phone,
      senderType: "AI",
      text: readRequiredText(input.payload, "text"),
    },
    ports,
  );
  await forwardStartedBotConversation(context, connectionId, started, ports);
  return started;
}

export async function executeBotSendMediaAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  const sessionId = readOptionalBotActionSessionId(input);
  if (sessionId) await assertBotSendAllowed(context, sessionId, ports);
  return sendWhatsappBotMediaByUrl(
    context,
    {
      ...(readOptionalText(input.payload, "buyerName")
        ? { buyerName: readRequiredText(input.payload, "buyerName") }
        : {}),
      ...(readOptionalText(input.payload, "caption")
        ? { caption: readRequiredText(input.payload, "caption") }
        : {}),
      ...(input.connectionId ? { connectionId: input.connectionId } : {}),
      ...(readOptionalText(input.payload, "fileName")
        ? { fileName: readRequiredText(input.payload, "fileName") }
        : {}),
      mediaType: mediaTypeForBotAction(input.action),
      mediaUrl: mediaUrlForBotAction(input.payload, input.action),
      ...(readOptionalText(input.payload, "mimeType")
        ? { mimeType: readRequiredText(input.payload, "mimeType") }
        : {}),
      ...(readOptionalText(input.payload, "phone")
        ? { phone: readRequiredText(input.payload, "phone") }
        : {}),
      ...(sessionId ? { sessionId } : {}),
    },
    ports,
  );
}

async function forwardStartedBotConversation(
  context: ServiceContext,
  connectionId: string,
  input: Awaited<ReturnType<typeof startWhatsappConversation>>,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  const message = await getCrmWhatsappRepository(ports).findMessageById({
    messageId: input.message.id,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId: input.session.id,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!connection || !message || !session) return;
  await forwardWhatsappMessageToBot(
    context,
    { connection, message, session },
    ports,
  );
}
