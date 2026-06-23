import { Car } from "lucide-react";
import { ControlSection, RangeControl } from "./ImageTemplateControlPrimitives";
import type { BgStyleType } from "./ImageTemplateTypes";

export function AdjustSection({
  activeSection,
  bgBlurAmount,
  bgStyle,
  blurBrightness,
  imageHeightScale,
  imageXOffset,
  imageYOffset,
  setActiveSection,
  setBgBlurAmount,
  setBlurBrightness,
  setImageHeightScale,
  setImageWidthScale,
  setImageXOffset,
  setImageYOffset,
}: {
  activeSection: string | null;
  bgBlurAmount: number;
  bgStyle: BgStyleType;
  blurBrightness: number;
  imageHeightScale: number;
  imageXOffset: number;
  imageYOffset: number;
  setActiveSection: (section: string | null) => void;
  setBgBlurAmount: (value: number) => void;
  setBlurBrightness: (value: number) => void;
  setImageHeightScale: (value: number) => void;
  setImageWidthScale: (value: number) => void;
  setImageXOffset: (value: number) => void;
  setImageYOffset: (value: number) => void;
}) {
  return (
    <ControlSection
      active={activeSection === "adjust"}
      icon={<Car className="size-4" />}
      onToggle={() =>
        setActiveSection(activeSection === "adjust" ? null : "adjust")
      }
      title="Enquadramento & Tamanhos"
    >
      <div className="p-4 pt-0 space-y-4 text-xs font-bold text-app-text">
        <RangeControl
          label="Zoom Imagem"
          max="2"
          min="0.5"
          step="0.05"
          value={imageHeightScale}
          valueLabel={`${imageHeightScale.toFixed(2)}x`}
          onChange={(value) => {
            setImageHeightScale(value);
            setImageWidthScale(value);
          }}
        />
        <RangeControl
          label="Deslocar Horizontal X"
          max="300"
          min="-300"
          step="5"
          value={imageXOffset}
          valueLabel={`${imageXOffset}px`}
          onChange={setImageXOffset}
        />
        <RangeControl
          label="Deslocar Vertical Y"
          max="300"
          min="-300"
          step="5"
          value={imageYOffset}
          valueLabel={`${imageYOffset}px`}
          onChange={setImageYOffset}
        />
        {bgStyle === "blur" && (
          <>
            <RangeControl
              label="Opacidade Fundo"
              max="0.9"
              min="0.1"
              step="0.05"
              value={blurBrightness}
              valueLabel={blurBrightness.toFixed(2)}
              onChange={setBlurBrightness}
            />
            <RangeControl
              label="Desfoque Fundo"
              max="80"
              min="10"
              step="5"
              value={bgBlurAmount}
              valueLabel={`${bgBlurAmount}px`}
              onChange={setBgBlurAmount}
            />
          </>
        )}
      </div>
    </ControlSection>
  );
}
