import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertOfficialMessagingWindow } from "../messaging/assertOfficialMessagingWindow.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappRepository,
  isCrmOlxChatEnabled,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { assertWhatsappProviderEffectAllowed } from "./assertWhatsappProviderEffectAllowed.js";
import { WhatsappConnectionNotFoundError } from "./whatsappSendErrors.js";

export async function resolveOutboundWhatsappConnection(
  context: ServiceContext,
  session: CrmWhatsappSession,
  ports: CrmServicePorts,
) {
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    session.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== session.storeId ||
    connection.tenantId !== session.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(session.connectionId);
  }
  assertWhatsappProviderEffectAllowed(context, connection, {
    olxChatEnabled: isCrmOlxChatEnabled(ports),
  });
  await assertOfficialMessagingWindow(
    connection,
    session,
    getCrmWhatsappRepository(ports),
  );
  return connection;
}
