import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import type { InventoryApi } from "../api/apiClient";
import { ImageTemplateControls } from "./ImageTemplateControls";
import { ImageTemplatePreview } from "./ImageTemplatePreview";
import { renderImageTemplate } from "./ImageTemplateRenderer";
import {
  getImageTemplateDownloadBaseName,
  getImageTemplateHeight,
  IMAGE_TEMPLATE_WIDTH,
  isImageTemplatePhoto,
  type ImageTemplateListing,
  type ImageTemplateMedia,
  type ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";
import { useImageTemplateEditorState } from "./useImageTemplateEditorState";

interface ImageTemplateModalProps {
  api: InventoryApi | null;
  isOpen: boolean;
  onClose: () => void;
  listing: ImageTemplateListing;
  media: ImageTemplateMedia[];
  primaryUnitId?: string | null;
  storeSettings?: ImageTemplateStoreSettings;
}

export default function ImageTemplateModal({
  api,
  isOpen,
  onClose,
  listing,
  media,
  primaryUnitId,
  storeSettings,
}: ImageTemplateModalProps) {
  const photos = useMemo(() => media.filter(isImageTemplatePhoto), [media]);
  const presetScope = listing.storeId ?? listing.tenantId ?? "default";
  const editor = useImageTemplateEditorState(storeSettings, presetScope);
  const { format, getCurrentConfig, selectedPhotoIndex } = editor;
  const [canvasReady, setCanvasReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderReady, setRenderReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderSessionRef = useRef(0);
  const mediaObjectUrlsRef = useRef(new Map<string, string>());
  const handleCanvasReady = useCallback(() => setCanvasReady(true), []);

  const resolvePhotoUrl = useCallback(
    async (photo: ImageTemplateMedia) => {
      const cached = mediaObjectUrlsRef.current.get(photo.id);
      if (cached) return cached;

      const unitId = photo.unitId ?? primaryUnitId;
      if (!api || !unitId) return photo.url;

      const blob = await api.getMediaContent(unitId, photo.id);
      const objectUrl = URL.createObjectURL(blob);
      mediaObjectUrlsRef.current.set(photo.id, objectUrl);
      return objectUrl;
    },
    [api, primaryUnitId],
  );

  useEffect(() => {
    if (isOpen) return;
    renderSessionRef.current += 1;
    setRenderReady(false);
    for (const url of mediaObjectUrlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    mediaObjectUrlsRef.current.clear();
  }, [isOpen]);

  useEffect(
    () => () => {
      for (const url of mediaObjectUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const linkId = "google-fonts-post-studio";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@700;800;900&family=Montserrat:wght@700;800;900&family=Outfit:wght@700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap";
      document.head.appendChild(link);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canvasReady || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        height: entry.contentRect.height,
        width: entry.contentRect.width,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasReady, isOpen]);

  const generateTemplate = useCallback(async () => {
    const visibleCanvas = canvasRef.current;
    const photo = photos[selectedPhotoIndex];
    if (!visibleCanvas || !photo) return;

    const session = ++renderSessionRef.current;
    setGenerating(true);
    setRenderError(null);
    setRenderReady(false);
    try {
      await document.fonts?.ready;
      const photoUrl = await resolvePhotoUrl(photo);
      const workingCanvas = document.createElement("canvas");
      const dataUrl = await renderImageTemplate({
        canvas: workingCanvas,
        config: getCurrentConfig(),
        format,
        listing,
        photoUrl,
        storeSettings: storeSettings ?? null,
      });
      if (session !== renderSessionRef.current || !dataUrl) return;
      visibleCanvas.width = workingCanvas.width;
      visibleCanvas.height = workingCanvas.height;
      const context = visibleCanvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponível");
      context.drawImage(workingCanvas, 0, 0);
      setRenderReady(true);
    } catch (error) {
      if (session !== renderSessionRef.current) return;
      console.error(error);
      setRenderError(
        "Não foi possível montar a prévia. Verifique a foto e tente novamente.",
      );
    } finally {
      if (session === renderSessionRef.current) setGenerating(false);
    }
  }, [
    format,
    getCurrentConfig,
    listing,
    photos,
    resolvePhotoUrl,
    selectedPhotoIndex,
    storeSettings,
  ]);

  useEffect(() => {
    if (isOpen && canvasReady && photos.length > 0) {
      void generateTemplate();
    }
  }, [canvasReady, generateTemplate, isOpen, photos.length]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !renderReady) return;
    try {
      const link = document.createElement("a");
      const baseName = getImageTemplateDownloadBaseName(listing.title);
      link.download = `${baseName}-${editor.format}.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
      setDownloadMessage("Post baixado em PNG.");
    } catch (error) {
      console.error(error);
      setDownloadMessage("Não foi possível baixar o post.");
    }
  };

  const handleDownloadAllZipped = async () => {
    if (!renderReady || photos.length === 0) return;
    setDownloadingZip(true);
    setDownloadMessage(null);
    try {
      const zip = new JSZip();
      const baseName = getImageTemplateDownloadBaseName(listing.title);
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        if (!photo) continue;
        const canvas = document.createElement("canvas");
        const photoUrl = await resolvePhotoUrl(photo);
        const dataUrl = await renderImageTemplate({
          canvas,
          config: editor.getCurrentConfig(),
          format: editor.format,
          listing,
          photoUrl,
          storeSettings: storeSettings ?? null,
        });
        if (!dataUrl) continue;
        zip.file(
          `${String(index + 1).padStart(2, "0")}-${baseName}-${editor.format}.png`,
          dataUrl.replace(/^data:image\/png;base64,/, ""),
          { base64: true },
        );
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `posts-${baseName}-${editor.format}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDownloadMessage(
        `${photos.length} ${photos.length === 1 ? "post preparado" : "posts preparados"} em ZIP.`,
      );
    } catch (error) {
      console.error(error);
      setDownloadMessage("Não foi possível preparar o arquivo ZIP.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const maxWidth = Math.max(0, containerSize.width - 40);
  const maxHeight = Math.max(0, containerSize.height - 32);
  const templateHeight = getImageTemplateHeight(editor.format);
  const previewScale =
    maxWidth > 0 && maxHeight > 0
      ? Math.min(
          maxWidth / IMAGE_TEMPLATE_WIDTH,
          maxHeight / templateHeight,
          0.9,
        )
      : 0.24;
  const canDownload =
    photos.length > 0 && renderReady && !generating && !renderError;

  return (
    <Dialog
      containerClassName="p-2 sm:p-4"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={isOpen}
    >
      <DialogContent
        className="grid h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[92rem] grid-rows-[minmax(15rem,38dvh)_minmax(0,1fr)] overflow-hidden sm:h-[92dvh] sm:w-[calc(100vw-2rem)] lg:grid-cols-[minmax(0,1fr)_27rem] lg:grid-rows-1"
        data-testid="inventory-post-studio"
        padding="none"
        radius="3xl"
        showCloseButton={false}
        surface="panel"
      >
        <ImageTemplatePreview
          canvasRef={canvasRef}
          containerRef={containerRef}
          format={editor.format}
          generating={generating}
          listingTitle={listing.title}
          media={photos}
          onCanvasReady={handleCanvasReady}
          previewScale={previewScale}
          renderError={renderError}
          selectedPhotoIndex={editor.selectedPhotoIndex}
          setSelectedPhotoIndex={editor.setSelectedPhotoIndex}
        />
        <ImageTemplateControls
          api={api}
          canDownload={canDownload}
          downloadMessage={
            photos.length === 0
              ? "Adicione uma foto no workspace do veículo para liberar os downloads."
              : downloadMessage
          }
          downloadingZip={downloadingZip}
          editor={editor}
          handleDownload={handleDownload}
          handleDownloadAllZipped={() => void handleDownloadAllZipped()}
          listing={listing}
          media={photos}
          onClose={onClose}
          primaryUnitId={primaryUnitId ?? null}
          storeSettings={storeSettings ?? null}
        />
      </DialogContent>
    </Dialog>
  );
}
