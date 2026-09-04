import {
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Car,
  FileText,
  Image as ImageIcon,
  Landmark,
  MapPin,
  MessageSquareText,
  Music,
  Paperclip,
  StickyNote,
  Tags,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type { CrmProviderCapabilities } from "./crmProviderCapabilities";

const NO_LEAD_TOOLTIP = "Vincule um lead à conversa para registrar esta ação.";

export function CrmComposerAttachMenu({
  capabilities,
  disabled,
  hasLead,
  onOpenAudio,
  onOpenCatalog,
  onOpenDocuments,
  onOpenFinancing,
  onOpenImages,
  onOpenLocation,
  onOpenNote,
  onOpenQuickMessages,
  onOpenSchedule,
  onOpenTags,
  onOpenVehicle,
  onOpenVisit,
  onToggle,
  open,
}: {
  capabilities: CrmProviderCapabilities;
  disabled?: boolean;
  hasLead?: boolean;
  onOpenAudio: () => void;
  onOpenCatalog: () => void;
  onOpenDocuments: () => void;
  onOpenFinancing?: () => void;
  onOpenImages: () => void;
  onOpenLocation: () => void;
  onOpenNote?: () => void;
  onOpenQuickMessages: () => void;
  onOpenSchedule?: () => void;
  onOpenTags?: () => void;
  onOpenVehicle: () => void;
  onOpenVisit?: () => void;
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
          {capabilities.allowScheduling && onOpenSchedule ? (
            <AttachMenuButton
              colorClass="crm-attach-color-quick"
              icon={<CalendarClock />}
              onClick={onOpenSchedule}
            >
              Agendar mensagem
            </AttachMenuButton>
          ) : null}
          {capabilities.allowNotes && onOpenNote ? (
            <AttachMenuButton
              colorClass="crm-attach-color-audio"
              disabled={!hasLead}
              icon={<StickyNote />}
              onClick={onOpenNote}
              title={hasLead ? undefined : NO_LEAD_TOOLTIP}
            >
              Nota interna
            </AttachMenuButton>
          ) : null}
          {capabilities.allowTags && onOpenTags ? (
            <AttachMenuButton
              colorClass="crm-attach-color-catalog"
              icon={<Tags />}
              onClick={onOpenTags}
            >
              Adicionar etiqueta
            </AttachMenuButton>
          ) : null}
          {capabilities.allowVisits && onOpenVisit ? (
            <AttachMenuButton
              colorClass="crm-attach-color-doc"
              disabled={!hasLead}
              icon={<CalendarCheck />}
              onClick={onOpenVisit}
              title={hasLead ? undefined : NO_LEAD_TOOLTIP}
            >
              Agendar visita
            </AttachMenuButton>
          ) : null}
          {capabilities.allowFinancing && onOpenFinancing ? (
            <AttachMenuButton
              colorClass="crm-attach-color-vehicle"
              disabled={!hasLead}
              icon={<Landmark />}
              onClick={onOpenFinancing}
              title={hasLead ? undefined : NO_LEAD_TOOLTIP}
            >
              Status financiamento
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
  disabled,
  icon,
  onClick,
  title,
}: {
  children: string;
  colorClass?: string | undefined;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  title?: string | undefined;
}) {
  return (
    <button
      className="crm-attach-option"
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span className={`crm-attach-icon-wrap ${colorClass ?? ""}`}>{icon}</span>
      <span className="crm-attach-label">{children}</span>
    </button>
  );
}
