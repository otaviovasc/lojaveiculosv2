import { useCallback, useState } from "react";
import { hexColor } from "./ImageTemplateCanvasColors";
import { useImageTemplatePresets } from "./useImageTemplatePresets";
import type {
  BgStyleType,
  FormatType,
  ImageTemplatePreset,
  ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";

export function useImageTemplateEditorState(
  storeSettings?: ImageTemplateStoreSettings,
) {
  const [color, setColor] = useState(hexColor("171717"));
  const [format, setFormat] = useState<FormatType>("feed");
  const [bgStyle, setBgStyle] = useState<BgStyleType>("blur");
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
  const [activeSection, setActiveSection] = useState<string | null>(
    "ai-studio",
  );

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

  const presetState = useImageTemplatePresets(getCurrentConfig);

  return {
    activeSection,
    applyConfig,
    bgBlurAmount,
    bgStyle,
    blurBrightness,
    color,
    format,
    getCurrentConfig,
    imageHeightScale,
    imageXOffset,
    imageYOffset,
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
    setSelectedPhotoIndex,
    ...presetState,
  };
}
