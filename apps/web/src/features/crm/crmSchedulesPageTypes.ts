import type {
  CrmCreateScheduledMessageInput,
  CrmListScheduledMessagesInput,
  CrmScheduledMessage,
  CrmConversationCycle,
} from "./crmConversationTypes";

export type CrmSchedulesPageProps = {
  activeSession: CrmConversationCycle | null;
  canCancel: boolean;
  canCreate: boolean;
  canProcess: boolean;
  canRead: boolean;
  connectionId: string | null;
  error: Error | null;
  initialMessages?: CrmScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<boolean>;
  onList: (
    input?: CrmListScheduledMessagesInput,
  ) => Promise<CrmScheduledMessage[]>;
  onProcessDue: () => Promise<boolean>;
  onSchedule: (input: CrmCreateScheduledMessageInput) => Promise<boolean>;
  onUpdate: (
    scheduledMessageId: string,
    input: { content: string; scheduledAt: string },
  ) => Promise<boolean>;
  conversationCycles: CrmConversationCycle[];
};
