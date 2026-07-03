import type { CrmWhatsappQuickMessageKind } from "../ports/crmWhatsappRepository.js";

export type CreateWhatsappQuickMessageInput = {
  content?: string;
  kind?: CrmWhatsappQuickMessageKind;
  mediaBase64?: string;
  mediaFileName?: string;
  mediaType?: string;
  shortcut: string;
  title: string;
};

export type UpdateWhatsappQuickMessageInput =
  Partial<CreateWhatsappQuickMessageInput> & {
    quickMessageId: string;
  };
