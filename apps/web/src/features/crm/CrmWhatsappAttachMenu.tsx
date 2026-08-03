import {
  BookOpen,
  Car,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageSquareText,
  Music,
  Paperclip,
} from "lucide-react";
import type { ReactNode } from "react";
import type { CrmWhatsappProviderCapabilities } from "./crmWhatsappProviderCapabilities";

export function CrmWhatsappAttachMenu({
  capabilities,
  disabled,
  onOpenAudio,
  onOpenCatalog,
  onOpenDocuments,
  onOpenImages,
  onOpenLocation,
  onOpenQuickMessages,
  onOpenVehicle,
  onToggle,
  open,
}: {
  capabilities: CrmWhatsappProviderCapabilities;
  disabled?: boolean;
  onOpenAudio: () => void;
  onOpenCatalog: () => void;
  onOpenDocuments: () => void;
  onOpenImages: () => void;
  onOpenLocation: () => void;
  onOpenQuickMessages: () => void;
  onOpenVehicle: () => void;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <div className="crm-whatsapp-attach">
      <button
        aria-label="Anexos"
        className="crm-icon-action"
        disabled={disabled}
        onClick={onToggle}
        title="Anexos"
        type="button"
      >
        <Paperclip />
      </button>
      {open ? (
        <div className="crm-whatsapp-attach-menu">
          {capabilities.allowImages ? (
            <AttachMenuButton icon={<ImageIcon />} onClick={onOpenImages}>
              {capabilities.allowVideo ? "Fotos e videos" : "Fotos"}
            </AttachMenuButton>
          ) : null}
          {capabilities.allowDocuments ? (
            <AttachMenuButton icon={<FileText />} onClick={onOpenDocuments}>
              Documentos
            </AttachMenuButton>
          ) : null}
          {capabilities.allowAudio ? (
            <AttachMenuButton icon={<Music />} onClick={onOpenAudio}>
              Audio
            </AttachMenuButton>
          ) : null}
          {capabilities.allowQuickMessages ? (
            <AttachMenuButton
              icon={<MessageSquareText />}
              onClick={onOpenQuickMessages}
            >
              Mensagens rapidas
            </AttachMenuButton>
          ) : null}
          {capabilities.allowCatalog ? (
            <AttachMenuButton icon={<BookOpen />} onClick={onOpenCatalog}>
              Enviar catalogo
            </AttachMenuButton>
          ) : null}
          {capabilities.allowVehicle ? (
            <AttachMenuButton icon={<Car />} onClick={onOpenVehicle}>
              Enviar veiculo
            </AttachMenuButton>
          ) : null}
          {capabilities.allowLocation ? (
            <AttachMenuButton icon={<MapPin />} onClick={onOpenLocation}>
              Localizacao
            </AttachMenuButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AttachMenuButton({
  children,
  icon,
  onClick,
}: {
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} type="button">
      {icon}
      {children}
    </button>
  );
}
