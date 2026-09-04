import type { CrmQuickMessageKind } from "../ports/crmConversationRepository.js";

export type CreateCrmQuickMessageInput = {
  content?: string;
  kind?: CrmQuickMessageKind;
  mediaBase64?: string;
  mediaFileName?: string;
  mediaType?: string;
  shortcut: string;
  title: string;
};

export type UpdateCrmQuickMessageInput = Partial<CreateCrmQuickMessageInput> & {
  quickMessageId: string;
};
