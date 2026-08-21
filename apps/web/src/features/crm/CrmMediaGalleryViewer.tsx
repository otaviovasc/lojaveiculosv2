import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Play,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";

export type CrmGalleryMediaItem = {
  caption?: string | undefined;
  sender?: string | undefined;
  time?: string | undefined;
  type: string;
  url: string;
};

export function CrmMediaGalleryViewer({
  initialIndex = 0,
  isOpen,
  mediaList,
  onClose,
}: {
  initialIndex?: number;
  isOpen: boolean;
  mediaList: CrmGalleryMediaItem[];
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(
        Math.max(0, Math.min(initialIndex, mediaList.length - 1)),
      );
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex, mediaList.length]);

  const handlePrev = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  }, [mediaList.length]);

  const handleNext = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  }, [mediaList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePrev();
      } else if (event.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext]);

  if (!isOpen || !mediaList.length) return null;

  const currentMedia = mediaList[currentIndex] ?? mediaList[0];
  if (!currentMedia) return null;
  const isVideo = currentMedia.type.toUpperCase() === "VIDEO";

  return (
    <Dialog
      containerClassName="p-0"
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
    >
      <DialogContent
        className="max-w-none crm-gallery-dialog-panel"
        padding="none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Visualizador de midia</DialogTitle>

        <div className="crm-gallery-viewer">
          <header className="crm-gallery-header">
            <div className="crm-gallery-info">
              {currentMedia.sender ? (
                <strong>{currentMedia.sender}</strong>
              ) : (
                <strong>Midia</strong>
              )}
              {currentMedia.time ? <span>{currentMedia.time}</span> : null}
            </div>

            <div className="crm-gallery-actions">
              {!isVideo ? (
                <button
                  aria-label={isZoomed ? "Ajustar tamanho" : "Ampliar imagem"}
                  className="crm-gallery-btn"
                  onClick={() => setIsZoomed((z) => !z)}
                  title={isZoomed ? "Ajustar" : "Ampliar"}
                  type="button"
                >
                  {isZoomed ? <Minimize2 /> : <Maximize2 />}
                </button>
              ) : null}

              <a
                aria-label="Baixar midia"
                className="crm-gallery-btn"
                download
                href={currentMedia.url}
                rel="noreferrer"
                target="_blank"
                title="Baixar"
              >
                <Download />
              </a>

              <button
                aria-label="Fechar visualizador"
                className="crm-gallery-btn crm-gallery-close"
                onClick={onClose}
                title="Fechar"
                type="button"
              >
                <X />
              </button>
            </div>
          </header>

          <main className="crm-gallery-stage">
            {mediaList.length > 1 ? (
              <button
                aria-label="Midia anterior"
                className="crm-gallery-nav crm-gallery-prev"
                onClick={handlePrev}
                title="Anterior"
                type="button"
              >
                <ChevronLeft />
              </button>
            ) : null}

            <div
              className={
                isZoomed
                  ? "crm-gallery-content crm-gallery-content-zoomed"
                  : "crm-gallery-content"
              }
            >
              {isVideo ? (
                <video
                  aria-label={currentMedia.caption || "Video da conversa"}
                  autoPlay
                  className="crm-gallery-video"
                  controls
                  key={currentMedia.url}
                  playsInline
                  src={currentMedia.url}
                />
              ) : (
                <img
                  alt={currentMedia.caption || "Imagem da conversa"}
                  className="crm-gallery-image"
                  key={currentMedia.url}
                  onClick={() => setIsZoomed((z) => !z)}
                  src={currentMedia.url}
                />
              )}

              {currentMedia.caption ? (
                <p className="crm-gallery-caption">{currentMedia.caption}</p>
              ) : null}
            </div>

            {mediaList.length > 1 ? (
              <button
                aria-label="Proxima midia"
                className="crm-gallery-nav crm-gallery-next"
                onClick={handleNext}
                title="Proxima"
                type="button"
              >
                <ChevronRight />
              </button>
            ) : null}
          </main>

          <footer className="crm-gallery-footer">
            {mediaList.length > 1 ? (
              <div className="crm-gallery-thumbs">
                {mediaList.map((item, idx) => (
                  <button
                    aria-label={`Visualizar midia ${idx + 1}`}
                    className={
                      idx === currentIndex
                        ? "crm-gallery-thumb active"
                        : "crm-gallery-thumb"
                    }
                    key={`${item.url}-${idx}`}
                    onClick={() => {
                      setIsZoomed(false);
                      setCurrentIndex(idx);
                    }}
                    type="button"
                  >
                    {item.type.toUpperCase() === "VIDEO" ? (
                      <div className="crm-gallery-thumb-video">
                        <video muted src={item.url} />
                        <Play className="size-3 fill-white text-white" />
                      </div>
                    ) : (
                      <img alt="" src={item.url} />
                    )}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="crm-gallery-counter">
              <span>
                {currentIndex + 1} / {mediaList.length}
              </span>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
