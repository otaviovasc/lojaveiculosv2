import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Maximize2,
  Play,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicVehicleMedia } from "../types";
import type { QuadraDetailMediaGroup } from "./QuadraListingDetailModel";

export function QuadraListingGallery({
  groups,
  listingIdentity,
  title,
}: {
  groups: readonly QuadraDetailMediaGroup[];
  listingIdentity: string;
  title: string;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const activeGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const media = useMemo(() => activeGroup?.media ?? [], [activeGroup]);
  const currentMedia = media[currentIndex] ?? media[0] ?? null;
  const hasNavigation = media.length > 1;

  const move = useCallback(
    (direction: -1 | 1) => {
      setCurrentIndex((index) =>
        Math.min(Math.max(index + direction, 0), Math.max(media.length - 1, 0)),
      );
    },
    [media.length],
  );

  useEffect(() => {
    setSelectedGroupId(groups[0]?.id ?? "");
    setCurrentIndex(0);
    setIsFullscreen(false);
  }, [groups, listingIdentity]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Tab" && dialogRef.current) {
        containGalleryFocus(event, dialogRef.current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isFullscreen, move]);

  useEffect(() => {
    const adjacent = [media[currentIndex - 1], media[currentIndex + 1]];
    adjacent.forEach((item) => {
      if (item?.kind !== "photo") return;
      const image = new Image();
      image.src = item.url;
    });
  }, [currentIndex, media]);

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    setCurrentIndex(0);
  }

  return (
    <section aria-label="Fotos do veículo" className="quadra-detail-gallery">
      <div className="quadra-detail-gallery__stage">
        {currentMedia ? (
          <QuadraGalleryMedia
            alt={`${title} - Mídia ${currentIndex + 1}`}
            className="quadra-detail-gallery__media"
            media={currentMedia}
          />
        ) : (
          <div className="quadra-detail-gallery__empty">
            <ImageIcon aria-hidden="true" />
            <span>Sem foto</span>
          </div>
        )}

        {currentMedia ? (
          <button
            aria-label="Abrir galeria em tela cheia"
            className="quadra-detail-gallery__expand"
            onClick={() => setIsFullscreen(true)}
            type="button"
          >
            <Maximize2 aria-hidden="true" />
          </button>
        ) : null}
        <GalleryNavigation
          currentIndex={currentIndex}
          isVisible={hasNavigation}
          mediaCount={media.length}
          move={move}
        />
      </div>

      {groups.length > 1 ? (
        <div
          aria-label="Fotos por cor ou unidade"
          className="quadra-detail-gallery__groups"
          role="tablist"
        >
          {groups.map((group) => (
            <button
              aria-selected={group.id === activeGroup?.id}
              className="quadra-detail-gallery__group"
              key={group.id}
              onClick={() => selectGroup(group.id)}
              role="tab"
              type="button"
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}

      {media.length > 1 ? (
        <div className="quadra-detail-gallery__thumbnails">
          {media.map((item, index) => (
            <button
              aria-label={`Exibir mídia ${index + 1} de ${title}`}
              aria-pressed={index === currentIndex}
              className="quadra-detail-gallery__thumbnail"
              key={`${item.displayOrder}-${item.url}`}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              <QuadraGalleryMedia
                alt=""
                className="quadra-detail-gallery__thumbnail-media"
                media={item}
              />
              {item.kind === "video" ? <Play aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {isFullscreen && currentMedia ? (
        <div
          aria-label="Galeria de fotos em tela cheia"
          aria-modal="true"
          className="quadra-detail-gallery__dialog"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsFullscreen(false);
          }}
          ref={dialogRef}
          role="dialog"
        >
          <button
            aria-label="Fechar galeria"
            className="quadra-detail-gallery__close"
            onClick={() => setIsFullscreen(false)}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
          <div className="quadra-detail-gallery__dialog-media">
            <QuadraGalleryMedia
              alt={`${title} - Mídia ${currentIndex + 1}`}
              className="quadra-detail-gallery__fullscreen-media"
              media={currentMedia}
            />
          </div>
          <GalleryNavigation
            currentIndex={currentIndex}
            isVisible={hasNavigation}
            mediaCount={media.length}
            move={move}
          />
        </div>
      ) : null}
    </section>
  );
}

function GalleryNavigation({
  currentIndex,
  isVisible,
  mediaCount,
  move,
}: {
  currentIndex: number;
  isVisible: boolean;
  mediaCount: number;
  move: (direction: -1 | 1) => void;
}) {
  return (
    <>
      {isVisible ? (
        <>
          <button
            aria-label="Mídia anterior"
            className="quadra-detail-gallery__previous"
            disabled={currentIndex === 0}
            onClick={() => move(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            aria-label="Próxima mídia"
            className="quadra-detail-gallery__next"
            disabled={currentIndex === mediaCount - 1}
            onClick={() => move(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </>
      ) : null}
      <span aria-live="polite" className="quadra-detail-gallery__counter">
        {mediaCount ? currentIndex + 1 : 0} / {mediaCount}
      </span>
    </>
  );
}

function QuadraGalleryMedia({
  alt,
  className,
  media,
}: {
  alt: string;
  className: string;
  media: PublicVehicleMedia;
}) {
  if (media.kind === "document_preview") {
    return (
      <div
        aria-label={alt || "Prévia de documento"}
        className={`${className} quadra-detail-gallery__document`}
        role="img"
      >
        <FileText aria-hidden="true" />
        <span>Documento</span>
      </div>
    );
  }
  return media.kind === "video" ? (
    <video className={className} controls playsInline src={media.url} />
  ) : (
    <img alt={alt} className={className} draggable={false} src={media.url} />
  );
}

function containGalleryFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
