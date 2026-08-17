import type { CrmWhatsappRepository } from "../ports/crmWhatsappRepository.js";
import {
  WhatsappMessageActionError,
  WhatsappSessionNotFoundError,
} from "./whatsappSendErrors.js";

export async function assertWhatsappScheduledConnectionBinding(
  scheduled: { connectionId: string; sessionId: string },
  scope: { storeId: string; tenantId: string },
  repository: Pick<CrmWhatsappRepository, "listSessions">,
) {
  const [session] = await repository.listSessions({
    limit: 1,
    offset: 0,
    sessionId: scheduled.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(scheduled.sessionId);
  if (session.channel !== "WHATSAPP") {
    throw new WhatsappMessageActionError(
      "Scheduled messages are only supported for WhatsApp sessions.",
      409,
    );
  }
  if (session.connectionId !== scheduled.connectionId) {
    throw new WhatsappMessageActionError(
      "Scheduled message connection binding no longer matches its session.",
      409,
    );
  }
}
