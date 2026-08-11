import type {
  CrmWhatsappRepository,
  CrmWhatsappSession,
  UpdateCrmWhatsappSessionInput,
} from "../ports/crmWhatsappRepository.js";
import { WhatsappSessionRevisionConflictError } from "./whatsappSendErrors.js";

type SessionUpdate = Omit<
  UpdateCrmWhatsappSessionInput,
  "expectedRevision" | "sessionId" | "storeId" | "tenantId"
>;

export async function updateWhatsappSessionWithCas(
  repository: CrmWhatsappRepository,
  input: {
    initialSession?: CrmWhatsappSession;
    sessionId: string;
    storeId: string;
    tenantId: string;
    update: (session: CrmWhatsappSession) => SessionUpdate;
  },
) {
  let current = input.initialSession ?? (await findSession(repository, input));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const updated = await repository.updateSession({
      ...input.update(current),
      expectedRevision: current.revision,
      sessionId: input.sessionId,
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    });
    if (updated) return updated;
    current = await findSession(repository, input);
  }
  throw new WhatsappSessionRevisionConflictError(input.sessionId);
}

async function findSession(
  repository: CrmWhatsappRepository,
  input: { sessionId: string; storeId: string; tenantId: string },
) {
  const [session] = await repository.listSessions({
    limit: 1,
    offset: 0,
    sessionId: input.sessionId,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  if (!session) throw new Error("CRM WhatsApp session disappeared.");
  return session;
}
