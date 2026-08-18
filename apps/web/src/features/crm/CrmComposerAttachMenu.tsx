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
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type { ReactNode } from "react";
import type { CrmProviderCapabilities } from "./crmProviderCapabilities";

export function CrmComposerAttachMenu({
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
  capabilities: CrmProviderCapabilities;
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
    <div className="crm-attach">
      <button
        aria-label="Anexos"
        className="crm-icon-action"
        disabled={disabled}
        onClick={onToggle}
        title="Anexos"
        type="button"
      >
        <AnimatedIconSwap stateKey={open} variant="rotate-spin">
          <Paperclip
            className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`}
          />
        </AnimatedIconSwap>
      </button>
      {open ? (
        <div className="crm-attach-menu">
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
