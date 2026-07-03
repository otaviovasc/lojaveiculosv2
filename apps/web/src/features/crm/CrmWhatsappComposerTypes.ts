import type {
  CatalogDialogSend,
  CatalogProductDialogSend,
  CatalogProductLoader,
} from "./CrmWhatsappCatalogDialog";
import type { LocationDialogSend } from "./CrmWhatsappComposerActionDialogs";
import type {
  VehicleDialogLoader,
  VehicleDialogSend,
} from "./CrmWhatsappVehicleDialog";
import type {
  CrmWhatsappCreateQuickMessageInput,
  CrmWhatsappMessage,
  CrmWhatsappQuickMessage,
  CrmWhatsappSendMediaType,
} from "./crmWhatsappTypes";

export type ComposerDialog = "catalog" | "location" | "quick" | "vehicle";

export type MessageComposerProps = {
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
    mediaType: CrmWhatsappSendMediaType;
  }) => Promise<boolean>;
  onCreateQuickMessage: (
    input: CrmWhatsappCreateQuickMessageInput,
  ) => Promise<boolean>;
  onDeleteQuickMessage: (message: CrmWhatsappQuickMessage) => Promise<boolean>;
  onUpdateQuickMessage: (
    message: CrmWhatsappQuickMessage,
    input: Partial<CrmWhatsappCreateQuickMessageInput>,
  ) => Promise<boolean>;
  onSendQuickMessage: (message: CrmWhatsappQuickMessage) => Promise<boolean>;
  onSendCatalogProduct: CatalogProductDialogSend;
  onSendVehicle: VehicleDialogSend;
  quickMessages?: CrmWhatsappQuickMessage[];
  replyToMessage?: CrmWhatsappMessage | null;
};
