import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import JSZip from "jszip";
import { hexColor } from "./ImageTemplateCanvasColors";
import { ImageTemplateControls } from "./ImageTemplateControls";
import { ImageTemplatePreview } from "./ImageTemplatePreview";
import { renderImageTemplate } from "./ImageTemplateRenderer";
import { useImageTemplatePresets } from "./useImageTemplatePresets";
import {
  getImageTemplateHeight,
  IMAGE_TEMPLATE_WIDTH,
  type BgStyleType,
  type FormatType,
  type ImageTemplateListing,
  type ImageTemplateMedia,
  type ImageTemplatePreset,
  type ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";

interface ImageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ImageTemplateListing;
  media: ImageTemplateMedia[];
  storeSettings?: ImageTemplateStoreSettings;
}

export default function ImageTemplateModal({
  isOpen,
  onClose,
  listing,
  media,
  storeSettings,
}: ImageTemplateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [color, setColor] = useState(hexColor("171717"));
  const [format, setFormat] = useState<FormatType>("feed");
  const [bgStyle, setBgStyle] = useState<BgStyleType>("blur");
  const [generating, setGenerating] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [priceColor, setPriceColor] = useState(
    storeSettings?.publicSite?.theme?.primaryColor || hexColor("facc15"),
  );
  const [customTextColor, setCustomTextColor] = useState(hexColor("ffffff"));
  const [fontFamily, setFontFamily] = useState("Inter");
  const [logoScale, setLogoScale] = useState(1);
  const [imageHeightScale, setImageHeightScale] = useState(1);
  const [imageWidthScale, setImageWidthScale] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(1);
  const [cardYOffset, setCardYOffset] = useState(0);
  const [imageYOffset, setImageYOffset] = useState(0);
  const [imageXOffset, setImageXOffset] = useState(0);
  const [cropXOffset, setCropXOffset] = useState(0);
  const [cropYOffset, setCropYOffset] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [blurBrightness, setBlurBrightness] = useState(0.4);
  const [bgBlurAmount, setBgBlurAmount] = useState(40);
  const [glassBlur, setGlassBlur] = useState(15);
  const [glassOpacity, setGlassOpacity] = useState(0.08);
  const [showGlassBox, setShowGlassBox] = useState(true);
  const [showVehicleDetails, setShowVehicleDetails] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showContactSection, setShowContactSection] = useState(true);
  const [showPhones, setShowPhones] = useState(true);
  const [showInstagram, setShowInstagram] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>("layout");
  const [downloadingZip, setDownloadingZip] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const getCurrentConfig = useCallback(
    (): ImageTemplatePreset => ({
      name: "",
      bgBlurAmount,
      bgStyle,
      blurBrightness,
      cardYOffset,
      color,
      cropXOffset,
      cropYOffset,
      customTextColor,
      fontFamily,
      fontSizeScale,
      glassBlur,
      glassOpacity,
      imageHeightScale,
      imageWidthScale,
      imageXOffset,
      imageYOffset,
      logoScale,
      priceColor,
      showContactSection,
      showGlassBox,
      showInstagram,
      showPhones,
      showPrice,
      showVehicleDetails,
      showWebsite,
    }),
    [
      bgBlurAmount,
      bgStyle,
      blurBrightness,
      cardYOffset,
      color,
      cropXOffset,
      cropYOffset,
      customTextColor,
      fontFamily,
      fontSizeScale,
      glassBlur,
      glassOpacity,
      imageHeightScale,
      imageWidthScale,
      imageXOffset,
      imageYOffset,
      logoScale,
      priceColor,
      showContactSection,
      showGlassBox,
      showInstagram,
      showPhones,
      showPrice,
      showVehicleDetails,
      showWebsite,
    ],
  );

  const applyConfig = useCallback((config: ImageTemplatePreset) => {
    setColor(config.color);
    setBgStyle(config.bgStyle);
    setPriceColor(config.priceColor);
    setCustomTextColor(config.customTextColor);
    setFontFamily(config.fontFamily);
    setLogoScale(config.logoScale);
    setImageHeightScale(config.imageHeightScale);
    setImageWidthScale(config.imageWidthScale);
    setFontSizeScale(config.fontSizeScale);
    setCardYOffset(config.cardYOffset);
    setImageYOffset(config.imageYOffset);
    setImageXOffset(config.imageXOffset);
    setCropXOffset(config.cropXOffset);
    setCropYOffset(config.cropYOffset);
    setBlurBrightness(config.blurBrightness);
    setBgBlurAmount(config.bgBlurAmount);
    setGlassBlur(config.glassBlur);
    setGlassOpacity(config.glassOpacity);
    setShowGlassBox(config.showGlassBox);
    setShowVehicleDetails(config.showVehicleDetails);
    setShowPrice(config.showPrice);
    setShowContactSection(config.showContactSection);
    setShowPhones(config.showPhones);
    setShowInstagram(config.showInstagram);
    setShowWebsite(config.showWebsite);
  }, []);

  const {
    deletePreset,
    isSavingPreset,
    presetName,
    presets,
    savePreset,
    setPresetName,
  } = useImageTemplatePresets(getCurrentConfig);

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-panel border border-line rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-[90vh] z-10 animate-fade-in"
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
            loadPreset={applyConfig}
            onClose={onClose}
            presetName={presetName}
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
            setPresetName={setPresetName}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
