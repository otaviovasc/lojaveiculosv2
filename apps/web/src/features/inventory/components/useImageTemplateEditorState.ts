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
  presetScope = "default",
) {
  const defaultPriceColor =
    storeSettings?.publicSite?.theme?.primaryColor || hexColor("facc15");
  const [color, rawSetColor] = useState(hexColor("171717"));
  const [format, setFormat] = useState<FormatType>("feed");
  const [bgStyle, rawSetBgStyle] = useState<BgStyleType>("blur");
  const [priceColor, setPriceColor] = useState(defaultPriceColor);
  const [customTextColor, setCustomTextColor] = useState(hexColor("ffffff"));
  const [fontFamily, setFontFamily] = useState("Satoshi");
  const [logoScale, setLogoScale] = useState(1);
  const [imageHeightScale, setImageHeightScale] = useState(1);
  const [imageWidthScale, setImageWidthScale] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(1);
  const [cardYOffset, setCardYOffset] = useState(0);
  const [imageYOffset, setImageYOffset] = useState(0);
  const [imageXOffset, setImageXOffset] = useState(0);
  const [cropXOffset, setCropXOffset] = useState(0);
  const [cropYOffset, setCropYOffset] = useState(0);
  const [footerYOffset, setFooterYOffset] = useState(0);
  const [contactSizeScale, setContactSizeScale] = useState(1);
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
  const [activeSection, setActiveSection] = useState<string | null>("presets");

  const getLuminance = useCallback((hex: string) => {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return 0.5;
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, []);

  const setBgStyle = useCallback(
    (style: BgStyleType) => {
      rawSetBgStyle(style);
      if (style === "blur") {
        setGlassOpacity(0.08);
        setCustomTextColor(hexColor("ffffff"));
      } else {
        const isLightBg = getLuminance(color) > 0.6;
        setGlassOpacity(isLightBg ? 0.85 : 0.08);
        setCustomTextColor(isLightBg ? hexColor("171717") : hexColor("ffffff"));
      }
    },
    [color, getLuminance],
  );

  const setColor = useCallback(
    (newColor: string) => {
      rawSetColor(newColor);
      const isLightBg = getLuminance(newColor) > 0.6;
      setGlassOpacity(isLightBg ? 0.85 : 0.08);
      setCustomTextColor(isLightBg ? hexColor("171717") : hexColor("ffffff"));
    },
    [getLuminance],
  );

  const getCurrentConfig = useCallback(
    (): ImageTemplatePreset => ({
      name: "",
      format,
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
      footerYOffset,
      contactSizeScale,
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
      format,
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
      footerYOffset,
      contactSizeScale,
    ],
  );

  const applyConfig = useCallback((config: ImageTemplatePreset) => {
    setFormat(config.format ?? "feed");
    rawSetColor(config.color);
    rawSetBgStyle(config.bgStyle);
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
    setFooterYOffset(config.footerYOffset ?? 0);
    setContactSizeScale(config.contactSizeScale ?? 1);
  }, []);

  const resetEditor = useCallback(() => {
    rawSetColor(hexColor("171717"));
    setFormat("feed");
    rawSetBgStyle("blur");
    setPriceColor(defaultPriceColor);
    setCustomTextColor(hexColor("ffffff"));
    setFontFamily("Satoshi");
    setLogoScale(1);
    setImageHeightScale(1);
    setImageWidthScale(1);
    setFontSizeScale(1);
    setCardYOffset(0);
    setImageYOffset(0);
    setImageXOffset(0);
    setCropXOffset(0);
    setCropYOffset(0);
    setBlurBrightness(0.4);
    setBgBlurAmount(40);
    setGlassBlur(15);
    setGlassOpacity(0.08);
    setShowGlassBox(true);
    setShowVehicleDetails(true);
    setShowPrice(true);
    setShowContactSection(true);
    setShowPhones(true);
    setShowInstagram(true);
    setShowWebsite(true);
    setSelectedPhotoIndex(0);
    setActiveSection("presets");
    setFooterYOffset(0);
    setContactSizeScale(1);
  }, [defaultPriceColor]);

  const presetState = useImageTemplatePresets(getCurrentConfig, presetScope);

  return {
    activeSection,
    applyConfig,
    bgBlurAmount,
    bgStyle,
    blurBrightness,
    cardYOffset,
    color,
    customTextColor,
    format,
    fontSizeScale,
    fontFamily,
    getCurrentConfig,
    glassBlur,
    glassOpacity,
    imageHeightScale,
    imageXOffset,
    imageYOffset,
    logoScale,
    priceColor,
    resetEditor,
    selectedPhotoIndex,
    setActiveSection,
    setBgBlurAmount,
    setBgStyle,
    setBlurBrightness,
    setCardYOffset,
    setColor,
    setCustomTextColor,
    setFormat,
    setFontSizeScale,
    setFontFamily,
    setGlassBlur,
    setGlassOpacity,
    setImageHeightScale,
    setImageWidthScale,
    setImageXOffset,
    setImageYOffset,
    setLogoScale,
    setPriceColor,
    setSelectedPhotoIndex,
    setShowContactSection,
    setShowGlassBox,
    setShowPhones,
    setShowPrice,
    setShowVehicleDetails,
    setShowWebsite,
    showContactSection,
    showGlassBox,
    showPhones,
    showPrice,
    showVehicleDetails,
    showWebsite,
    cropXOffset,
    setCropXOffset,
    cropYOffset,
    setCropYOffset,
    footerYOffset,
    setFooterYOffset,
    contactSizeScale,
    setContactSizeScale,
    ...presetState,
  };
}

export type ImageTemplateEditorState = ReturnType<
  typeof useImageTemplateEditorState
>;
