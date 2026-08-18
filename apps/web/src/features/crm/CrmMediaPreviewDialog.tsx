import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import {
  fallbackFileLabel,
  formatFileSize,
  readMediaType,
} from "./crmMediaFiles";

export function CrmMediaPreviewDialog({
  activeIndex,
  allowAudio = true,
  allowCaption = true,
  allowDocuments = true,
  allowVideo = true,
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
  allowAudio?: boolean;
  allowCaption?: boolean;
  allowDocuments?: boolean;
  allowVideo?: boolean;
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
  const activeFile = files[activeIndex] ?? files[0];
  if (!activeFile) return null;

  return (
    <Dialog
      containerClassName="p-3 sm:p-6"
      onOpenChange={(open) => !open && onClose()}
      open
    >
      <DialogContent
        className="max-w-none crm-media-dialog-panel"
        padding="none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {activeFile.name || "Anexo"}
        </DialogTitle>
        <header className="crm-media-dialog-header">
          <button
            aria-label="Fechar pre-visualizacao"
            className="crm-media-icon"
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X />
          </button>
          <div>
            <h2>{activeFile.name || "Anexo"}</h2>
            <span>
              {activeIndex + 1} de {files.length} -{" "}
              {formatFileSize(activeFile.size)}
            </span>
          </div>
          <button
            aria-label="Remover anexo atual"
            className="crm-media-icon"
            onClick={() => onRemove(activeIndex)}
            title="Remover"
            type="button"
          >
            <Trash2 />
          </button>
        </header>

        <div className="crm-media-preview-stage">
          <MediaPreview
            file={activeFile}
            previewUrl={previewUrls.get(activeFile)}
          />
        </div>

        <footer className="crm-media-dialog-footer">
          <div
            aria-label="Anexos selecionados"
            className="crm-media-dialog-strip"
          >
            {files.map((file, index) => (
              <button
                aria-label={`Selecionar ${file.name || fallbackFileLabel(readMediaType(file))}`}
                className={
                  index === activeIndex
                    ? "crm-media-dialog-thumb active"
                    : "crm-media-dialog-thumb"
                }
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                onClick={() => onSelect(index)}
                type="button"
              >
                <Thumb file={file} previewUrl={previewUrls.get(file)} />
              </button>
            ))}
            <div className="crm-media-dialog-add">
              <button
                aria-label={
                  allowVideo ? "Adicionar foto ou video" : "Adicionar foto"
                }
                onClick={onPickImages}
                title={allowVideo ? "Foto ou video" : "Foto"}
                type="button"
              >
                <ImageIcon />
              </button>
              {allowDocuments ? (
                <button
                  aria-label="Adicionar documento"
                  onClick={onPickDocuments}
                  title="Documento"
                  type="button"
                >
                  <FileText />
                </button>
              ) : null}
              {allowAudio ? (
                <button
                  aria-label="Adicionar audio"
                  onClick={onPickAudio}
                  title="Audio"
                  type="button"
                >
                  <Music />
                </button>
              ) : null}
            </div>
          </div>

          <div className="crm-media-caption-row">
            <textarea
              aria-label="Legenda da midia"
              disabled={disabled || !allowCaption}
              onChange={(event) => onCaptionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder={
                allowCaption
                  ? "Adicionar legenda..."
                  : "Envie o texto separadamente da imagem."
              }
              rows={1}
              value={allowCaption ? caption : ""}
            />
            <button
              aria-label="Enviar mensagem"
              className="crm-media-send"
              disabled={disabled}
              onClick={onSend}
              title="Enviar"
              type="button"
            >
              {disabled ? <Loader2 className="crm-spin" /> : <Send />}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
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
    <div className="crm-media-file-preview">
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
