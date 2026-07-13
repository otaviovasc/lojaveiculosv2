import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export type CrmWhatsappSchedulesPageProps = {
  activeSession: CrmWhatsappSession | null;
  canCancel: boolean;
  canCreate: boolean;
  canProcess: boolean;
  canRead: boolean;
  connectionId: string | null;
  error: Error | null;
  onCancel: (scheduledMessageId: string) => Promise<boolean>;
  onList: (
    input?: CrmWhatsappListScheduledMessagesInput,
  ) => Promise<CrmWhatsappScheduledMessage[]>;
  onProcessDue: () => Promise<boolean>;
  onSchedule: (input: {
    scheduledAt: string;
    sessionId: string;
    text: string;
  }) => Promise<boolean>;
  sessions: CrmWhatsappSession[];
};
