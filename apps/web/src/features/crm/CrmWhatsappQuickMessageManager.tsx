import {
  Image as ImageIcon,
  MessageSquareText,
  Music,
  Type,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { readFileAsBase64 } from "./crmWhatsappMediaFiles";
import type {
  CrmWhatsappCreateQuickMessageInput,
  CrmWhatsappQuickMessage,
  CrmWhatsappQuickMessageKind,
  CrmWhatsappUpdateQuickMessageInput,
} from "./crmWhatsappTypes";
import {
  KindButton,
  QuickMediaField,
  QuickTemplateList,
} from "./CrmWhatsappQuickMessageManagerParts";

export function CrmWhatsappQuickMessageManager({
  disabled,
  messages,
  onClose,
  onCreate,
  onDelete,
  onUpdate,
}: {
  disabled?: boolean;
  messages: CrmWhatsappQuickMessage[];
  onClose: () => void;
  onCreate: (input: CrmWhatsappCreateQuickMessageInput) => Promise<boolean>;
  onDelete: (message: CrmWhatsappQuickMessage) => Promise<boolean>;
  onUpdate: (
    message: CrmWhatsappQuickMessage,
    input: CrmWhatsappUpdateQuickMessageInput,
  ) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<CrmWhatsappQuickMessage | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<CrmWhatsappQuickMessageKind>("TEXT");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasExistingMedia =
    editing?.kind === kind && kind !== "TEXT" && Boolean(editing.mediaUrl);
  const canSave =
    Boolean(title.trim() && shortcut.trim()) &&
    (kind === "TEXT"
      ? Boolean(content.trim())
      : Boolean(file || hasExistingMedia));

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const save = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      const media = file ? await readFileAsBase64(file) : null;
      const input = {
        ...(content.trim() ? { content: content.trim() } : {}),
        kind,
        ...(media ? { mediaBase64: media } : {}),
        ...(file ? { mediaFileName: file.name, mediaType: file.type } : {}),
        shortcut: shortcut.trim(),
        title: title.trim(),
      };
      const accepted = editing
        ? await onUpdate(editing, input)
        : await onCreate(input);
      if (accepted) resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setEditing(null);
    setFile(null);
    setKind("TEXT");
    setShortcut("");
    setTitle("");
  };

  const editMessage = (message: CrmWhatsappQuickMessage) => {
    setContent(message.content ?? "");
    setEditing(message);
    setFile(null);
    setKind(message.kind);
    setShortcut(message.shortcut);
    setTitle(message.title);
  };

  return (
    <div className="crm-whatsapp-action-dialog" role="dialog" aria-modal="true">
      <div className="crm-whatsapp-action-panel crm-whatsapp-quick-manager">
        <header>
          <span>
            <MessageSquareText />
          </span>
          <h2>Mensagens rapidas</h2>
          <button
            aria-label="Fechar"
            className="crm-icon-action"
            onClick={onClose}
            type="button"
          >
            <X />
          </button>
        </header>
        <div className="crm-whatsapp-action-fields">
          <div className="crm-whatsapp-template-kind">
            <KindButton
              icon={<Type />}
              kind="TEXT"
              selected={kind}
              setKind={(nextKind) => {
                setKind(nextKind);
                setFile(null);
              }}
            >
              Texto
            </KindButton>
            <KindButton
              icon={<ImageIcon />}
              kind="IMAGE"
              selected={kind}
              setKind={(nextKind) => {
                setKind(nextKind);
                setFile(null);
              }}
            >
              Foto
            </KindButton>
            <KindButton
              icon={<Music />}
              kind="AUDIO"
              selected={kind}
              setKind={(nextKind) => {
                setKind(nextKind);
                setFile(null);
              }}
            >
              Audio
            </KindButton>
          </div>
          <div className="crm-whatsapp-action-grid">
            <label>
              Atalho
              <input
                disabled={disabled || isSaving}
                onChange={(event) => setShortcut(event.target.value)}
                placeholder="/pix"
                value={shortcut}
              />
            </label>
            <label>
              Nome
              <input
                disabled={disabled || isSaving}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Chave Pix"
                value={title}
              />
            </label>
          </div>
          {kind === "TEXT" ? (
            <label>
              Texto
              <textarea
                disabled={disabled || isSaving}
                onChange={(event) => setContent(event.target.value)}
                rows={4}
                value={content}
              />
            </label>
          ) : (
            <QuickMediaField
              content={content}
              disabled={disabled || isSaving}
              existingMediaUrl={
                editing?.kind === kind ? (editing.mediaUrl ?? null) : null
              }
              file={file}
              kind={kind}
              onCaptionChange={setContent}
              onFileChange={setFile}
              previewUrl={previewUrl}
            />
          )}
          <QuickTemplateList
            disabled={disabled || isSaving}
            messages={messages}
            onDelete={onDelete}
            onEdit={editMessage}
          />
        </div>
        <footer>
          {editing ? (
            <button
              className="crm-action crm-action-muted"
              onClick={resetForm}
              type="button"
            >
              Novo
            </button>
          ) : null}
          <button
            className="crm-action crm-action-muted"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
          <button
            className="crm-action"
            disabled={disabled || isSaving || !canSave}
            onClick={() => void save()}
            type="button"
          >
            {editing ? "Atualizar modelo" : "Salvar modelo"}
          </button>
        </footer>
      </div>
    </div>
  );
}
