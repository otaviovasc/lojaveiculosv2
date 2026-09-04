import type {
  CatalogDialogSend,
  CatalogProductDialogSend,
  CatalogProductLoader,
} from "./CrmWhatsappCatalogDialog";
import type { LocationDialogSend } from "./CrmComposerActionDialogs";
import type {
  VehicleDialogLoader,
  VehicleDialogSend,
} from "./CrmWhatsappVehicleDialog";
import type {
  CrmAddConversationCycleTagInput,
  CrmConversationCycle,
  CrmCreateQuickMessageInput,
  CrmMessage,
  CrmQuickMessage,
  CrmScheduledMessage,
  CrmSendMediaType,
  CrmTag,
} from "./crmConversationTypes";
import type { CrmProviderCapabilities } from "./crmProviderCapabilities";

export type ComposerDialog =
  | "catalog"
  | "financing"
  | "location"
  | "note"
  | "quick"
  | "schedule"
  | "tags"
  | "vehicle"
  | "visit";

export type MessageComposerProps = {
  availableTags?: CrmTag[];
  capabilities?: CrmProviderCapabilities;
  canScheduleCreate?: boolean;
  catalogUrl?: string | null | undefined;
  cycle?: CrmConversationCycle | null;
  defaultLocationName?: string;
  disabled?: boolean;
  onAddCycleTag?: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
  onCancelReply?: () => void;
  onCancelScheduledMessage?: (scheduledMessageId: string) => Promise<boolean>;
  onListScheduledMessages?: () => Promise<CrmScheduledMessage[]>;
  onProcessDueScheduledMessages?: () => Promise<boolean>;
  onRemoveCycleTag?: (tagId: string) => Promise<boolean>;
  onScheduleMessage?: (input: {
    content: string;
    scheduledAt: string;
  }) => Promise<boolean>;
  onSend: (text: string) => Promise<boolean>;
  onSendCatalog: CatalogDialogSend;
  onLoadCatalogProducts: CatalogProductLoader;
  onLoadVehicles: VehicleDialogLoader;
  onSendLocation: LocationDialogSend;
  onSendMedia: (input: {
    caption?: string;
    file: File;
    mediaType: CrmSendMediaType;
  }) => Promise<boolean>;
  onCreateQuickMessage: (input: CrmCreateQuickMessageInput) => Promise<boolean>;
  onDeleteQuickMessage: (message: CrmQuickMessage) => Promise<boolean>;
  onUpdateQuickMessage: (
    message: CrmQuickMessage,
    input: Partial<CrmCreateQuickMessageInput>,
  ) => Promise<boolean>;
  onSendQuickMessage: (message: CrmQuickMessage) => Promise<boolean>;
  onSendCatalogProduct: CatalogProductDialogSend;
  onSendVehicle: VehicleDialogSend;
  quickMessages?: CrmQuickMessage[];
  replyToMessage?: CrmMessage | null;
};
