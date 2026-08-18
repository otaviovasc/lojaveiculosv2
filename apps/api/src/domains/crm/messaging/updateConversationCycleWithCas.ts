import type {
  CrmConversationRepository,
  CrmConversationCycle,
  UpdateCrmConversationCycleInput,
} from "../ports/crmConversationRepository.js";
import { ConversationCycleRevisionConflictError } from "./crmMessagingErrors.js";

type SessionUpdate = Omit<
  UpdateCrmConversationCycleInput,
  "expectedRevision" | "cycleId" | "storeId" | "tenantId"
>;

export async function updateConversationCycleWithCas(
  repository: CrmConversationRepository,
  input: {
    initialSession?: CrmConversationCycle;
    cycleId: string;
    storeId: string;
    tenantId: string;
    update: (conversationCycle: CrmConversationCycle) => SessionUpdate;
  },
) {
  let current = input.initialSession ?? (await findSession(repository, input));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const updated = await repository.updateConversationCycle({
      ...input.update(current),
      expectedRevision: current.revision,
      cycleId: input.cycleId,
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    });
    if (updated) return updated;
    current = await findSession(repository, input);
  }
  throw new ConversationCycleRevisionConflictError(input.cycleId);
}

async function findSession(
  repository: CrmConversationRepository,
  input: { cycleId: string; storeId: string; tenantId: string },
) {
  const [conversationCycle] = await repository.listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId: input.cycleId,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  if (!conversationCycle)
    throw new Error("CRM WhatsApp conversationCycle disappeared.");
  return conversationCycle;
}
