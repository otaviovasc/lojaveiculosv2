import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
} from "../ports/crmConversationRepository.js";

export type CrmMessageSenderUser = { id: string; name: string };

export function withHumanCrmSenderSnapshot(
  context: ServiceContext,
  input: {
    metadata: Record<string, unknown>;
    senderOrigin: CrmMessageSenderOrigin;
    senderType: CrmMessageSenderType;
  },
): Record<string, unknown> {
  if (input.senderOrigin !== "human_crm" || input.senderType !== "HUMAN") {
    return input.metadata;
  }
  const {
    authorName: _authorName,
    sentByActorId: _actorId,
    ...metadata
  } = input.metadata;
  if (context.actor.kind !== "user") return metadata;

  const name = context.actor.displayName?.trim();

  return {
    ...metadata,
    ...(name ? { authorName: name } : {}),
    sentByActorId: context.actor.id,
  };
}

export function readHumanCrmMessageSenderUser(input: {
  metadata: Record<string, unknown>;
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
}): CrmMessageSenderUser | null {
  if (input.senderOrigin !== "human_crm" || input.senderType !== "HUMAN") {
    return null;
  }
  const metadata = input.metadata;
  const id = readTrimmedString(metadata.sentByActorId);
  const name = readTrimmedString(metadata.authorName);
  return id && name ? { id, name } : null;
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
