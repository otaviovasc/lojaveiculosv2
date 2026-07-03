import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmWhatsappQuickMessage,
  CrmWhatsappQuickMessageKind,
} from "./crmWhatsappTypes";

export function KindButton({
  children,
  icon,
  kind,
  selected,
  setKind,
}: {
  children: string;
  icon: ReactNode;
  kind: CrmWhatsappQuickMessageKind;
  selected: CrmWhatsappQuickMessageKind;
  setKind: (kind: CrmWhatsappQuickMessageKind) => void;
}) {
  return (
    <button
      className={kind === selected ? "active" : ""}
      onClick={() => setKind(kind)}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

export function QuickMediaField({
  content,
  disabled,
  existingMediaUrl,
  file,
  kind,
  onCaptionChange,
  onFileChange,
  previewUrl,
}: {
  content: string;
  disabled?: boolean;
  existingMediaUrl?: string | null;
  file: File | null;
  kind: Exclude<CrmWhatsappQuickMessageKind, "TEXT">;
  onCaptionChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  previewUrl: string | null;
}) {
  return (
    <>
      <label>
        Midia
        <input
          accept={kind === "IMAGE" ? "image/*" : "audio/*"}
          disabled={disabled}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>
      {file && previewUrl ? (
        <div className="crm-whatsapp-template-preview">
          {kind === "IMAGE" ? (
            <img alt={file.name} src={previewUrl} />
          ) : (
            <audio controls src={previewUrl} />
          )}
          <strong>{file.name}</strong>
        </div>
      ) : existingMediaUrl ? (
        <div className="crm-whatsapp-template-preview">
          {kind === "IMAGE" ? (
            <img alt="" src={existingMediaUrl} />
          ) : (
            <audio controls src={existingMediaUrl} />
          )}
          <strong>Midia atual</strong>
        </div>
      ) : null}
      {kind === "IMAGE" ? (
        <label>
          Legenda
          <textarea
            disabled={disabled}
            onChange={(event) => onCaptionChange(event.target.value)}
            rows={3}
            value={content}
          />
        </label>
      ) : null}
    </>
  );
}

export function QuickTemplateList({
  disabled,
  messages,
  onDelete,
  onEdit,
}: {
  disabled?: boolean;
  messages: CrmWhatsappQuickMessage[];
  onDelete: (message: CrmWhatsappQuickMessage) => Promise<boolean>;
  onEdit: (message: CrmWhatsappQuickMessage) => void;
}) {
  return (
    <div className="crm-whatsapp-template-list">
      {messages.map((message) => (
        <div className="crm-whatsapp-template-row" key={message.id}>
          <span>{message.shortcut}</span>
          <strong>{message.title}</strong>
          <small>
            {message.kind === "TEXT" ? message.content : message.kind}
          </small>
          {message.isSystem ? (
            <em>Padrao</em>
          ) : (
            <span className="crm-whatsapp-template-actions">
              <button
                aria-label={`Editar ${message.title}`}
                disabled={disabled}
                onClick={() => onEdit(message)}
                type="button"
              >
                <Pencil />
              </button>
              <button
                aria-label={`Excluir ${message.title}`}
                disabled={disabled}
                onClick={() => void onDelete(message)}
                type="button"
              >
                <Trash2 />
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
