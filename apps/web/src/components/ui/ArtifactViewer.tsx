import { FileWarning, ImageIcon, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArtifactViewerControls } from "./ArtifactViewerControls";
import {
  artifactPageWidth,
  humanizePdfError,
  isArtifactAccessExpired,
  isPdfArtifact,
  toggleArtifactFullscreen,
  useElementWidth,
} from "./ArtifactViewerSupport";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type ArtifactViewerProps = {
  externalUrl?: string | undefined;
  expiresAt?: string | undefined;
  fileName: string;
  mimeType: string | null;
  onRefresh?: (() => void) | undefined;
  requestHeaders?: Record<string, string> | undefined;
  title: string;
  url: string;
};

export function ArtifactViewer(props: ArtifactViewerProps) {
  if (isArtifactAccessExpired(props.expiresAt)) {
    return (
      <ArtifactMessage
        body="O acesso temporário venceu. Renove o link para continuar sem perder o contexto."
        icon={<RefreshCcw aria-hidden="true" />}
        title="Acesso expirado"
      >
        {props.onRefresh ? (
          <button onClick={props.onRefresh} type="button">
            Renovar acesso
          </button>
        ) : null}
      </ArtifactMessage>
    );
  }
  if (isPdfArtifact(props)) return <PdfArtifactViewer {...props} />;
  if (props.mimeType?.startsWith("image/")) {
    return <ImageArtifactViewer {...props} />;
  }
  return (
    <ArtifactMessage
      body="Este formato não pode ser exibido com segurança no navegador. Abra ou baixe o arquivo original."
      icon={<FileWarning aria-hidden="true" />}
      title="Visualização indisponível"
    >
      <a href={props.url} rel="noreferrer" target="_blank">
        Abrir arquivo
      </a>
    </ArtifactMessage>
  );
}

function PdfArtifactViewer(props: ArtifactViewerProps) {
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null);
  const stageWidth = useElementWidth(stageNode);
  const file = useMemo(
    () =>
      props.requestHeaders
        ? { httpHeaders: props.requestHeaders, url: props.url }
        : props.url,
    [props.requestHeaders, props.url],
  );

  useEffect(() => {
    setPages(0);
    setPage(1);
    setZoom(1);
    setError(null);
  }, [props.url]);

  return (
    <section
      aria-label={`Documento ${props.title}`}
      className="artifact-viewer"
      ref={rootRef}
    >
      <ArtifactViewerControls
        canGoNext={page < pages}
        canGoPrevious={page > 1}
        fileName={props.fileName}
        onFullscreen={() => void toggleArtifactFullscreen(rootRef.current)}
        onNext={() => setPage((current) => Math.min(pages, current + 1))}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onRefresh={props.onRefresh}
        onZoomIn={() => setZoom((current) => Math.min(1.6, current + 0.1))}
        onZoomOut={() => setZoom((current) => Math.max(0.7, current - 0.1))}
        page={page}
        pages={pages}
        url={props.externalUrl ?? props.url}
        zoomLabel={`${Math.round(zoom * 100)}%`}
      />
      <Document
        className="artifact-viewer__document"
        error={
          <ArtifactMessage
            body={error ?? "Não foi possível renderizar este PDF."}
            icon={<FileWarning aria-hidden="true" />}
            title="Falha ao abrir o arquivo"
          >
            {props.onRefresh ? (
              <button onClick={props.onRefresh} type="button">
                Tentar com novo acesso
              </button>
            ) : null}
          </ArtifactMessage>
        }
        file={file}
        loading={<ArtifactLoading />}
        onLoadError={(loadError) => setError(humanizePdfError(loadError))}
        onLoadSuccess={(result) => {
          setPages(result.numPages);
          setPage((current) => Math.min(current, result.numPages));
        }}
      >
        {pages ? (
          <aside
            aria-label="Miniaturas"
            className="artifact-viewer__thumbnails"
          >
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  aria-current={pageNumber === page ? "page" : undefined}
                  aria-label={`Ir para página ${pageNumber}`}
                  className={pageNumber === page ? "is-active" : undefined}
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  type="button"
                >
                  <Page
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    width={92}
                  />
                  <span>{pageNumber}</span>
                </button>
              ),
            )}
          </aside>
        ) : null}
        <div className="artifact-viewer__stage" ref={setStageNode}>
          {pages && stageWidth > 0 ? (
            <Page
              pageNumber={page}
              renderAnnotationLayer={false}
              renderTextLayer
              width={artifactPageWidth(stageWidth, zoom)}
            />
          ) : null}
        </div>
      </Document>
    </section>
  );
}

function ImageArtifactViewer(props: ArtifactViewerProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => setZoom(1), [props.url]);

  return (
    <section
      aria-label={`Imagem ${props.title}`}
      className="artifact-viewer"
      ref={rootRef}
    >
      <ArtifactViewerControls
        canGoNext={false}
        canGoPrevious={false}
        fileName={props.fileName}
        onFullscreen={() => void toggleArtifactFullscreen(rootRef.current)}
        onNext={() => undefined}
        onPrevious={() => undefined}
        onRefresh={props.onRefresh}
        onZoomIn={() => setZoom((current) => Math.min(2, current + 0.1))}
        onZoomOut={() => setZoom((current) => Math.max(0.5, current - 0.1))}
        page={1}
        pages={1}
        url={props.externalUrl ?? props.url}
        zoomLabel={`${Math.round(zoom * 100)}%`}
      />
      <div className="artifact-viewer__image-stage">
        <img
          alt={`Prévia de ${props.title}`}
          src={props.url}
          style={{ scale: zoom }}
        />
      </div>
    </section>
  );
}

function ArtifactLoading() {
  return (
    <div aria-live="polite" className="artifact-viewer__loading" role="status">
      <span aria-hidden="true" />
      <strong>Preparando páginas</strong>
      <small>O arquivo original está sendo renderizado com segurança.</small>
    </div>
  );
}

function ArtifactMessage({
  body,
  children,
  icon,
  title,
}: {
  body: string;
  children?: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="artifact-viewer__message" role="status">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  );
}
