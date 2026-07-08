import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import JSZip from "jszip";
import type { InventoryApi } from "../api/apiClient";
import { ImageTemplateControls } from "./ImageTemplateControls";
import { ImageTemplatePreview } from "./ImageTemplatePreview";
import { renderImageTemplate } from "./ImageTemplateRenderer";
import { useImageTemplateEditorState } from "./useImageTemplateEditorState";
import {
  getImageTemplateHeight,
  IMAGE_TEMPLATE_WIDTH,
} from "./ImageTemplateTypes";
import type {
  ImageTemplateListing,
  ImageTemplateMedia,
  ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";

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
  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [downloadingZip, setDownloadingZip] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    activeSection,
    applyConfig,
    bgBlurAmount,
    bgStyle,
    blurBrightness,
    color,
    deletePreset,
    format,
    getCurrentConfig,
    imageHeightScale,
    imageXOffset,
    imageYOffset,
    isSavingPreset,
    presetName,
    presets,
    savePreset,
    selectedPhotoIndex,
    setActiveSection,
    setBgBlurAmount,
    setBgStyle,
    setBlurBrightness,
    setColor,
    setFormat,
    setImageHeightScale,
    setImageWidthScale,
    setImageXOffset,
    setImageYOffset,
    setPresetName,
    setSelectedPhotoIndex,
  } = useImageTemplateEditorState(storeSettings);

  useEffect(() => {
    if (isOpen) setActiveSection("ai-studio");
  }, [isOpen, setActiveSection]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const { contentRect } of entries) {
        setContainerSize({
          height: contentRect.height,
          width: contentRect.width,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const generateTemplate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    await renderImageTemplate({
      canvas,
      config: getCurrentConfig(),
      format,
      listing,
      photoUrl: media[selectedPhotoIndex]?.url || "",
      storeSettings: storeSettings ?? null,
    });
    setGenerating(false);
  }, [
    format,
    getCurrentConfig,
    listing,
    media,
    selectedPhotoIndex,
    storeSettings,
  ]);

  useEffect(() => {
    if (isOpen && media.length) void generateTemplate();
  }, [isOpen, media.length, generateTemplate]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${format}.png`;
    link.href = canvas.toDataURL("image/png", 1);
    link.click();
  };

  const handleDownloadAllZipped = async () => {
    if (media.length === 0) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const canvas = document.createElement("canvas");
      for (let i = 0; i < media.length; i++) {
        const dataUrl = await renderImageTemplate({
          canvas,
          config: getCurrentConfig(),
          format,
          listing,
          photoUrl: media[i]?.url || "",
          storeSettings: storeSettings ?? null,
        });
        if (!dataUrl) continue;
        zip.file(
          `banner_${i + 1}.png`,
          dataUrl.replace(/^data:image\/png;base64,/, ""),
          {
            base64: true,
          },
        );
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `banners-${listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const padding =
    typeof window !== "undefined" && window.innerWidth <= 768 ? 32 : 64;
  const maxW = containerSize.width - padding;
  const maxH = containerSize.height - padding;
  const height = getImageTemplateHeight(format);
  const previewScale =
    maxW > 0 && maxH > 0
      ? Math.min(maxW / IMAGE_TEMPLATE_WIDTH, maxH / height, 0.6)
      : 0.3;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-panel border border-line rounded-2xl shadow-2xl w-full max-w-[1480px] overflow-hidden flex flex-col md:flex-row h-[92vh] z-10 animate-fade-in"
      >
        <ImageTemplatePreview
          canvasRef={canvasRef}
          containerRef={containerRef}
          format={format}
          generating={generating}
          media={media}
          previewScale={previewScale}
          selectedPhotoIndex={selectedPhotoIndex}
          setSelectedPhotoIndex={setSelectedPhotoIndex}
        />
        <ImageTemplateControls
          activeSection={activeSection}
          api={api}
          bgBlurAmount={bgBlurAmount}
          bgStyle={bgStyle}
          blurBrightness={blurBrightness}
          color={color}
          deletePreset={deletePreset}
          downloadingZip={downloadingZip}
          format={format}
          handleDownload={handleDownload}
          handleDownloadAllZipped={() => void handleDownloadAllZipped()}
          imageHeightScale={imageHeightScale}
          imageXOffset={imageXOffset}
          imageYOffset={imageYOffset}
          isSavingPreset={isSavingPreset}
          listing={listing}
          loadPreset={applyConfig}
          media={media}
          onClose={onClose}
          presetName={presetName}
          primaryUnitId={primaryUnitId}
          presets={presets}
          savePreset={savePreset}
          setActiveSection={setActiveSection}
          setBgBlurAmount={setBgBlurAmount}
          setBgStyle={setBgStyle}
          setBlurBrightness={setBlurBrightness}
          setColor={setColor}
          setFormat={setFormat}
          setImageHeightScale={setImageHeightScale}
          setImageWidthScale={setImageWidthScale}
          setImageXOffset={setImageXOffset}
          setImageYOffset={setImageYOffset}
          selectedPhotoIndex={selectedPhotoIndex}
          setPresetName={setPresetName}
          setSelectedPhotoIndex={setSelectedPhotoIndex}
        />
      </motion.div>
    </motion.div>,
    document.body,
  );
}
