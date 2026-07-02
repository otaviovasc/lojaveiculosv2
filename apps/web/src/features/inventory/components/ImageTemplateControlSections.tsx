import { Layers, Save, Smartphone, Trash2 } from "lucide-react";
import { ControlSection, ToggleButton } from "./ImageTemplateControlPrimitives";
import {
  COLOR_PRESETS,
  type BgStyleType,
  type FormatType,
  type ImageTemplatePreset,
} from "./ImageTemplateTypes";

export function PresetsSection({
  activeSection,
  deletePreset,
  isSavingPreset,
  loadPreset,
  presetName,
  presets,
  savePreset,
  setActiveSection,
  setPresetName,
}: {
  activeSection: string | null;
  deletePreset: (index: number) => void;
  isSavingPreset: boolean;
  loadPreset: (preset: ImageTemplatePreset) => void;
  presetName: string;
  presets: ImageTemplatePreset[];
  savePreset: () => void;
  setActiveSection: (section: string | null) => void;
  setPresetName: (name: string) => void;
}) {
  return (
    <ControlSection
      active={activeSection === "presets"}
      icon={<Layers className="size-4" />}
      onToggle={() =>
        setActiveSection(activeSection === "presets" ? null : "presets")
      }
      title="Modelos Salvos"
    >
      <div className="p-4 pt-0 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Nome do modelo..."
            className="flex-grow min-h-9 px-3 rounded-lg border border-line bg-app text-xs font-bold text-app-text outline-none"
          />
          <button
            onClick={savePreset}
            disabled={
              isSavingPreset || !presetName.trim() || presets.length >= 10
            }
            className="px-3 min-h-9 bg-accent text-inverse rounded-lg text-xs font-black hover:bg-accent-strong disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </button>
        </div>
        <div className="space-y-2">
          {presets.length === 0 ? (
            <p className="text-xs text-muted font-bold italic text-center py-2">
              Nenhum modelo personalizado salvo.
            </p>
          ) : (
            presets.map((preset, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-app border border-line rounded-lg"
              >
                <button
                  onClick={() => loadPreset(preset)}
                  className="flex-grow text-left text-xs font-black text-app-text hover:text-accent cursor-pointer"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(idx)}
                  className="text-muted hover:text-danger p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </ControlSection>
  );
}

export function LayoutSection({
  activeSection,
  bgStyle,
  color,
  format,
  setActiveSection,
  setBgStyle,
  setColor,
  setFormat,
}: {
  activeSection: string | null;
  bgStyle: BgStyleType;
  color: string;
  format: FormatType;
  setActiveSection: (section: string | null) => void;
  setBgStyle: (style: BgStyleType) => void;
  setColor: (color: string) => void;
  setFormat: (format: FormatType) => void;
}) {
  return (
    <ControlSection
      active={activeSection === "layout"}
      icon={<Smartphone className="size-4" />}
      onToggle={() =>
        setActiveSection(activeSection === "layout" ? null : "layout")
      }
      title="Layout e Formato"
    >
      <div className="p-4 pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            active={format === "feed"}
            onClick={() => setFormat("feed")}
          >
            Feed (1:1)
          </ToggleButton>
          <ToggleButton
            active={format === "story"}
            onClick={() => setFormat("story")}
          >
            Stories (9:16)
          </ToggleButton>
        </div>
        <div>
          <span className="block text-xs font-black text-app-text mb-2">
            Estilo de Fundo
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(["blur", "solid", "gradient"] as BgStyleType[]).map((type) => (
              <ToggleButton
                key={type}
                active={bgStyle === type}
                compact
                onClick={() => setBgStyle(type)}
              >
                {type === "blur"
                  ? "Blur"
                  : type === "solid"
                    ? "Sólido"
                    : "Gradiente"}
              </ToggleButton>
            ))}
          </div>
        </div>
        {bgStyle !== "blur" && (
          <div>
            <span className="block text-xs font-black text-app-text mb-2">
              Selecione a Cor
            </span>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((presetColor) => {
                const className = [
                  "w-8 h-8 rounded-full border transition-all cursor-pointer",
                  color === presetColor
                    ? "border-accent scale-110"
                    : "border-line",
                ].join(" ");
                return (
                  <button
                    key={presetColor}
                    onClick={() => setColor(presetColor)}
                    className={className}
                    style={{ backgroundColor: presetColor }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ControlSection>
  );
}
