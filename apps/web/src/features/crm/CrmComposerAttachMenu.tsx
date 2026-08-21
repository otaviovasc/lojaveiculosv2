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
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close attach menu
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onToggle]);

  return (
    <div className="crm-attach" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="Anexos"
        className={
          open
            ? "crm-icon-action crm-attach-trigger active"
            : "crm-icon-action crm-attach-trigger"
        }
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
            <AttachMenuButton
              colorClass="crm-attach-color-image"
              icon={<ImageIcon />}
              onClick={onOpenImages}
            >
              {capabilities.allowVideo ? "Fotos e videos" : "Fotos"}
            </AttachMenuButton>
          ) : null}
          {capabilities.allowDocuments ? (
            <AttachMenuButton
              colorClass="crm-attach-color-doc"
              icon={<FileText />}
              onClick={onOpenDocuments}
            >
              Documentos
            </AttachMenuButton>
          ) : null}
          {capabilities.allowAudio ? (
            <AttachMenuButton
              colorClass="crm-attach-color-audio"
              icon={<Music />}
              onClick={onOpenAudio}
            >
              Audio
            </AttachMenuButton>
          ) : null}
          {capabilities.allowQuickMessages ? (
            <AttachMenuButton
              colorClass="crm-attach-color-quick"
              icon={<MessageSquareText />}
              onClick={onOpenQuickMessages}
            >
              Mensagens rapidas
            </AttachMenuButton>
          ) : null}
          {capabilities.allowCatalog ? (
            <AttachMenuButton
              colorClass="crm-attach-color-catalog"
              icon={<BookOpen />}
              onClick={onOpenCatalog}
            >
              Enviar catalogo
            </AttachMenuButton>
          ) : null}
          {capabilities.allowVehicle ? (
            <AttachMenuButton
              colorClass="crm-attach-color-vehicle"
              icon={<Car />}
              onClick={onOpenVehicle}
            >
              Enviar veiculo
            </AttachMenuButton>
          ) : null}
          {capabilities.allowLocation ? (
            <AttachMenuButton
              colorClass="crm-attach-color-location"
              icon={<MapPin />}
              onClick={onOpenLocation}
            >
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
  colorClass,
  icon,
  onClick,
}: {
  children: string;
  colorClass?: string | undefined;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="crm-attach-option" onClick={onClick} type="button">
      <span className={`crm-attach-icon-wrap ${colorClass ?? ""}`}>{icon}</span>
      <span className="crm-attach-label">{children}</span>
    </button>
  );
}
