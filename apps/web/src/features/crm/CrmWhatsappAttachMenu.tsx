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

export function CrmWhatsappAttachMenu({
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
          <AttachMenuButton icon={<ImageIcon />} onClick={onOpenImages}>
            Fotos e videos
          </AttachMenuButton>
          <AttachMenuButton icon={<FileText />} onClick={onOpenDocuments}>
            Documentos
          </AttachMenuButton>
          <AttachMenuButton icon={<Music />} onClick={onOpenAudio}>
            Audio
          </AttachMenuButton>
          <AttachMenuButton
            icon={<MessageSquareText />}
            onClick={onOpenQuickMessages}
          >
            Mensagens rapidas
          </AttachMenuButton>
          <AttachMenuButton icon={<BookOpen />} onClick={onOpenCatalog}>
            Enviar catalogo
          </AttachMenuButton>
          <AttachMenuButton icon={<Car />} onClick={onOpenVehicle}>
            Enviar veiculo
          </AttachMenuButton>
          <AttachMenuButton icon={<MapPin />} onClick={onOpenLocation}>
            Localizacao
          </AttachMenuButton>
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
