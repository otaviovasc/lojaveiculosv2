import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type {
  CrmQuickMessage,
  CrmQuickMessageKind,
} from "./crmConversationTypes";

export function KindButton({
  children,
  icon,
  kind,
  selected,
  setKind,
}: {
  children: string;
  icon: ReactNode;
  kind: CrmQuickMessageKind;
  selected: CrmQuickMessageKind;
  setKind: (kind: CrmQuickMessageKind) => void;
}) {
  const isSelected = kind === selected;
  return (
    <button
      className={isSelected ? "active" : ""}
      onClick={() => setKind(kind)}
      type="button"
    >
      <AnimatedIconSwap stateKey={isSelected} variant="pop">
        {icon}
      </AnimatedIconSwap>
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
  kind: Exclude<CrmQuickMessageKind, "TEXT">;
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
        <div className="crm-template-preview">
          {kind === "IMAGE" ? (
            <img alt={file.name} src={previewUrl} />
          ) : (
            <audio controls src={previewUrl} />
          )}
          <strong>{file.name}</strong>
        </div>
      ) : existingMediaUrl ? (
        <div className="crm-template-preview">
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
  messages: CrmQuickMessage[];
  onDelete: (message: CrmQuickMessage) => Promise<boolean>;
  onEdit: (message: CrmQuickMessage) => void;
}) {
  return (
    <div className="crm-template-list">
      {messages.map((message) => (
        <div className="crm-template-row" key={message.id}>
          <span>{message.shortcut}</span>
          <strong>{message.title}</strong>
          <small>
            {message.kind === "TEXT" ? message.content : message.kind}
          </small>
          {message.isSystem ? (
            <em>Padrao</em>
          ) : (
            <span className="crm-template-actions">
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
