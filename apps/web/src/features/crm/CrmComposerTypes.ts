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
  CrmCreateQuickMessageInput,
  CrmMessage,
  CrmQuickMessage,
  CrmSendMediaType,
} from "./crmConversationTypes";
import type { CrmProviderCapabilities } from "./crmProviderCapabilities";

export type ComposerDialog = "catalog" | "location" | "quick" | "vehicle";

export type MessageComposerProps = {
  capabilities?: CrmProviderCapabilities;
  catalogUrl?: string | null | undefined;
  defaultLocationName?: string;
  disabled?: boolean;
  onCancelReply?: () => void;
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
