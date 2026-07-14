import { Download, FileArchive, Loader2, X } from "lucide-react";
import type {
  ImageTemplatePreset,
  BgStyleType,
  FormatType,
} from "./ImageTemplateTypes";
import { AdjustSection } from "./ImageTemplateAdjustSection";
import { LayoutSection, PresetsSection } from "./ImageTemplateControlSections";

export function ImageTemplateControls({
  activeSection,
  bgBlurAmount,
  bgStyle,
  blurBrightness,
  color,
  deletePreset,
  downloadingZip,
  format,
  handleDownload,
  handleDownloadAllZipped,
  imageHeightScale,
  imageXOffset,
  imageYOffset,
  isSavingPreset,
  loadPreset,
  onClose,
  presetName,
  presets,
  savePreset,
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
}: {
  activeSection: string | null;
  bgBlurAmount: number;
  bgStyle: BgStyleType;
  blurBrightness: number;
  color: string;
  deletePreset: (index: number) => void;
  downloadingZip: boolean;
  format: FormatType;
  handleDownload: () => void;
  handleDownloadAllZipped: () => void;
  imageHeightScale: number;
  imageXOffset: number;
  imageYOffset: number;
  isSavingPreset: boolean;
  loadPreset: (preset: ImageTemplatePreset) => void;
  onClose: () => void;
  presetName: string;
  presets: ImageTemplatePreset[];
  savePreset: () => void;
  setActiveSection: (section: string | null) => void;
  setBgBlurAmount: (value: number) => void;
  setBgStyle: (style: BgStyleType) => void;
  setBlurBrightness: (value: number) => void;
  setColor: (color: string) => void;
  setFormat: (format: FormatType) => void;
  setImageHeightScale: (value: number) => void;
  setImageWidthScale: (value: number) => void;
  setImageXOffset: (value: number) => void;
  setImageYOffset: (value: number) => void;
  setPresetName: (name: string) => void;
}) {
  return (
    <div className="w-full md:w-[420px] bg-panel flex flex-col md:border-l border-line h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-line">
        <div>
          <h2 className="text-lg font-black text-app-text">
            Personalizar Banner
          </h2>
          <p className="text-xs font-bold text-muted">
            Ajuste o visual para redes sociais
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-app-elevated hover:bg-line/45 flex items-center justify-center transition-colors text-app-text cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 p-6 overflow-y-auto pb-8">
        <PresetsSection
          activeSection={activeSection}
          deletePreset={deletePreset}
          isSavingPreset={isSavingPreset}
          loadPreset={loadPreset}
          presetName={presetName}
          presets={presets}
          savePreset={savePreset}
          setActiveSection={setActiveSection}
          setPresetName={setPresetName}
        />
        <LayoutSection
          activeSection={activeSection}
          bgStyle={bgStyle}
          color={color}
          format={format}
          setActiveSection={setActiveSection}
          setBgStyle={setBgStyle}
          setColor={setColor}
          setFormat={setFormat}
        />
        <AdjustSection
          activeSection={activeSection}
          bgBlurAmount={bgBlurAmount}
          bgStyle={bgStyle}
          blurBrightness={blurBrightness}
          imageHeightScale={imageHeightScale}
          imageXOffset={imageXOffset}
          imageYOffset={imageYOffset}
          setActiveSection={setActiveSection}
          setBgBlurAmount={setBgBlurAmount}
          setBlurBrightness={setBlurBrightness}
          setImageHeightScale={setImageHeightScale}
          setImageWidthScale={setImageWidthScale}
          setImageXOffset={setImageXOffset}
          setImageYOffset={setImageYOffset}
        />
      </div>
      <div className="p-6 border-t border-line space-y-3 bg-panel sticky bottom-0 z-10">
        <button
          onClick={handleDownload}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-accent-foreground cursor-pointer hover:bg-accent-strong hover:text-accent-strong-foreground transition-colors"
        >
          <Download aria-hidden="true" className="size-4" />
          Baixar Foto Atual
        </button>
        <button
          onClick={handleDownloadAllZipped}
          disabled={downloadingZip}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-app-elevated px-4 text-sm font-black text-app-text cursor-pointer hover:bg-line/25 transition-colors disabled:opacity-50"
        >
          {downloadingZip ? (
            <Loader2 className="size-4 animate-spin text-accent" />
          ) : (
            <FileArchive aria-hidden="true" className="size-4" />
          )}
          {downloadingZip ? "Criando ZIP..." : "Baixar Todas em ZIP"}
        </button>
      </div>
    </div>
  );
}
