import type {
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
  onSchedule: (input: {
    content: string;
    scheduledAt: string;
    cycleId: string;
  }) => Promise<boolean>;
  conversationCycles: CrmConversationCycle[];
};
