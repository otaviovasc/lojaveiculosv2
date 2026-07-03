import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
  fallbackFileLabel,
  formatFileSize,
  readMediaType,
} from "./crmWhatsappMediaFiles";

export function CrmWhatsappMediaPreviewDialog({
  activeIndex,
  caption,
  disabled,
  files,
  onCaptionChange,
  onClose,
  onPickAudio,
  onPickDocuments,
  onPickImages,
  onRemove,
  onSelect,
  onSend,
  previewUrls,
}: {
  activeIndex: number;
  caption: string;
  disabled?: boolean;
  files: File[];
  onCaptionChange: (caption: string) => void;
  onClose: () => void;
  onPickAudio: () => void;
  onPickDocuments: () => void;
  onPickImages: () => void;
  onRemove: (index: number) => void;
  onSelect: (index: number) => void;
  onSend: () => void;
  previewUrls: Map<File, string>;
}) {
  const titleId = useId();
  const activeFile = files[activeIndex] ?? files[0];
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!activeFile) return null;

  return createPortal(
    <div className="crm-whatsapp-media-dialog">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="crm-whatsapp-media-dialog-panel"
        role="dialog"
      >
        <header className="crm-whatsapp-media-dialog-header">
          <button
            aria-label="Fechar pre-visualizacao"
            className="crm-whatsapp-media-icon"
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X />
          </button>
          <div>
            <h2 id={titleId}>{activeFile.name || "Anexo"}</h2>
            <span>
              {activeIndex + 1} de {files.length} -{" "}
              {formatFileSize(activeFile.size)}
            </span>
          </div>
          <button
            aria-label="Remover anexo atual"
            className="crm-whatsapp-media-icon"
            onClick={() => onRemove(activeIndex)}
            title="Remover"
            type="button"
          >
            <Trash2 />
          </button>
        </header>

        <div className="crm-whatsapp-media-preview-stage">
          <MediaPreview
            file={activeFile}
            previewUrl={previewUrls.get(activeFile)}
          />
        </div>

        <footer className="crm-whatsapp-media-dialog-footer">
          <div
            aria-label="Anexos selecionados"
            className="crm-whatsapp-media-dialog-strip"
          >
            {files.map((file, index) => (
              <button
                aria-label={`Selecionar ${file.name || fallbackFileLabel(readMediaType(file))}`}
                className={
                  index === activeIndex
                    ? "crm-whatsapp-media-dialog-thumb active"
                    : "crm-whatsapp-media-dialog-thumb"
                }
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                onClick={() => onSelect(index)}
                type="button"
              >
                <Thumb file={file} previewUrl={previewUrls.get(file)} />
              </button>
            ))}
            <div className="crm-whatsapp-media-dialog-add">
              <button
                aria-label="Adicionar foto ou video"
                onClick={onPickImages}
                title="Foto ou video"
                type="button"
              >
                <ImageIcon />
              </button>
              <button
                aria-label="Adicionar documento"
                onClick={onPickDocuments}
                title="Documento"
                type="button"
              >
                <FileText />
              </button>
              <button
                aria-label="Adicionar audio"
                onClick={onPickAudio}
                title="Audio"
                type="button"
              >
                <Music />
              </button>
            </div>
          </div>

          <div className="crm-whatsapp-media-caption-row">
            <textarea
              aria-label="Legenda da midia"
              disabled={disabled}
              onChange={(event) => onCaptionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder="Adicionar legenda..."
              rows={1}
              value={caption}
            />
            <button
              aria-label="Enviar mensagem"
              className="crm-whatsapp-media-send"
              disabled={disabled}
              onClick={onSend}
              title="Enviar"
              type="button"
            >
              {disabled ? <Loader2 className="crm-spin" /> : <Send />}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function MediaPreview({
  file,
  previewUrl,
}: {
  file: File;
  previewUrl: string | undefined;
}) {
  const mediaType = readMediaType(file);
  if (mediaType === "image" && previewUrl) {
    return <img alt={file.name || "Preview"} src={previewUrl} />;
  }
  if (mediaType === "video" && previewUrl) {
    return (
      <video
        aria-label={`Preview ${file.name || "video"}`}
        controls
        preload="metadata"
        src={previewUrl}
      />
    );
  }
  return (
    <div className="crm-whatsapp-media-file-preview">
      {mediaType === "audio" ? <Music /> : <FileText />}
      <strong>{file.name || fallbackFileLabel(mediaType)}</strong>
      <span>{formatFileSize(file.size)}</span>
    </div>
  );
}

function Thumb({
  file,
  previewUrl,
}: {
  file: File;
  previewUrl: string | undefined;
}) {
  const mediaType = readMediaType(file);
  if ((mediaType === "image" || mediaType === "video") && previewUrl) {
    return mediaType === "video" ? (
      <video aria-hidden="true" muted src={previewUrl} />
    ) : (
      <img alt="" src={previewUrl} />
    );
  }
  return mediaType === "audio" ? <Music /> : <FileText />;
}
