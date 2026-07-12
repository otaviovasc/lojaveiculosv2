import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  RefreshCcw,
} from "lucide-react";

export function ArtifactViewerControls({
  canGoNext,
  canGoPrevious,
  fileName,
  onFullscreen,
  onNext,
  onPrevious,
  onRefresh,
  onZoomIn,
  onZoomOut,
  page,
  pages,
  url,
  zoomLabel,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  fileName: string;
  onFullscreen: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRefresh?: (() => void) | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  page: number;
  pages: number;
  url: string;
  zoomLabel: string;
}) {
  return (
    <div
      aria-label="Controles do documento"
      className="artifact-toolbar"
      role="toolbar"
    >
      <div className="artifact-toolbar__group">
        <button
          aria-label="Página anterior"
          disabled={!canGoPrevious}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <span aria-live="polite" className="artifact-toolbar__page">
          <strong>{page}</strong>
          <span>de {pages || "—"}</span>
        </span>
        <button
          aria-label="Próxima página"
          disabled={!canGoNext}
          onClick={onNext}
          type="button"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="artifact-toolbar__group">
        <button aria-label="Reduzir zoom" onClick={onZoomOut} type="button">
          <Minus aria-hidden="true" />
        </button>
        <span className="artifact-toolbar__zoom">{zoomLabel}</span>
        <button aria-label="Aumentar zoom" onClick={onZoomIn} type="button">
          <Plus aria-hidden="true" />
        </button>
      </div>

      <div className="artifact-toolbar__group artifact-toolbar__group--end">
        {onRefresh ? (
          <button aria-label="Renovar acesso" onClick={onRefresh} type="button">
            <RefreshCcw aria-hidden="true" />
          </button>
        ) : null}
        <button aria-label="Tela cheia" onClick={onFullscreen} type="button">
          <Maximize2 aria-hidden="true" />
        </button>
        <a
          href={url}
          rel="noreferrer"
          target="_blank"
          title="Abrir em nova aba"
        >
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">Abrir em nova aba</span>
        </a>
        <a download={fileName} href={url} title="Baixar arquivo">
          <Download aria-hidden="true" />
          <span className="sr-only">Baixar arquivo</span>
        </a>
      </div>
    </div>
  );
}
