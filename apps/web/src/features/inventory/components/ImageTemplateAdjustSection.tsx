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
  cropXOffset,
  setCropXOffset,
  cropYOffset,
  setCropYOffset,
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
  cropXOffset: number;
  setCropXOffset: (value: number) => void;
  cropYOffset: number;
  setCropYOffset: (value: number) => void;
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
      title="Enquadramento e fundo"
    >
      <div className="p-4 pt-3 space-y-4 text-xs font-bold text-app-text">
        <RangeControl
          defaultValue={1}
          label="Zoom da foto"
          max="2"
          maxLabel="2,00x"
          min="1"
          minLabel="1,00x"
          step="0.05"
          value={imageHeightScale}
          valueLabel={`${imageHeightScale.toFixed(2)}x`}
          onChange={(val) => {
            setImageHeightScale(val);
            setImageWidthScale(val);
          }}
        />
        <RangeControl
          defaultValue={0}
          label="Deslocamento horizontal"
          max="300"
          maxLabel="+300px"
          min="-300"
          minLabel="−300px"
          step="5"
          value={imageXOffset}
          valueLabel={`${imageXOffset}px`}
          onChange={setImageXOffset}
        />
        <RangeControl
          defaultValue={0}
          label="Deslocamento vertical"
          max="300"
          maxLabel="+300px"
          min="-300"
          minLabel="−300px"
          step="5"
          value={imageYOffset}
          valueLabel={`${imageYOffset}px`}
          onChange={setImageYOffset}
        />
        <RangeControl
          defaultValue={0}
          label="Recorte horizontal"
          max="300"
          maxLabel="+300px"
          min="-300"
          minLabel="−300px"
          step="5"
          value={cropXOffset}
          valueLabel={`${cropXOffset}px`}
          onChange={setCropXOffset}
        />
        <RangeControl
          defaultValue={0}
          label="Recorte vertical"
          max="300"
          maxLabel="+300px"
          min="-300"
          minLabel="−300px"
          step="5"
          value={cropYOffset}
          valueLabel={`${cropYOffset}px`}
          onChange={setCropYOffset}
        />
        {bgStyle === "blur" && (
          <>
            <RangeControl
              defaultValue={0.4}
              label="Luminosidade do fundo"
              max="0.9"
              maxLabel="Claro"
              min="0.1"
              minLabel="Escuro"
              step="0.05"
              value={blurBrightness}
              valueLabel={blurBrightness.toFixed(2)}
              onChange={setBlurBrightness}
            />
            <RangeControl
              defaultValue={40}
              label="Desfoque do fundo"
              max="80"
              maxLabel="80px"
              min="10"
              minLabel="10px"
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
