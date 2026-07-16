import { Layers, Pipette, Save, Smartphone, Trash2 } from "lucide-react";
import { ControlSection, ToggleButton } from "./ImageTemplateControlPrimitives";
import {
  COLOR_PRESETS,
  type BgStyleType,
  type FormatType,
  type ImageTemplatePreset,
} from "./ImageTemplateTypes";
import { hexColor } from "./ImageTemplateCanvasColors";

const TEXT_COLOR_PRESETS = [
  hexColor("ffffff"),
  hexColor("f3f4f6"),
  hexColor("171717"),
  hexColor("facc15"),
  hexColor("ed1d24"),
  hexColor("10b981"),
];

const FONTS = [
  { name: "Satoshi", label: "Satoshi" },
  { name: "Geist", label: "Geist" },
  { name: "Bebas Neue", label: "Bebas Neue" },
  { name: "Montserrat", label: "Montserrat" },
  { name: "Playfair Display", label: "Playfair" },
  { name: "Outfit", label: "Outfit" },
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  presets: string[];
  label: string;
}

function ColorPicker({ color, onChange, presets, label }: ColorPickerProps) {
  const isPreset = presets.some((p) => p.toLowerCase() === color.toLowerCase());

  return (
    <div>
      <span className="block text-xs font-black text-app-text mb-2">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((presetColor) => {
          const isActive = color.toLowerCase() === presetColor.toLowerCase();
          return (
            <button
              key={presetColor}
              aria-label={`Usar cor ${presetColor}`}
              aria-pressed={isActive}
              onClick={() => onChange(presetColor)}
              className={[
                "size-9 cursor-pointer rounded-lg border outline-none transition-[border-color,transform] focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "scale-105 border-accent ring-2 ring-accent ring-offset-2 ring-offset-app-elevated"
                  : "border-line hover:scale-105 hover:border-line-strong",
              ].join(" ")}
              style={{ backgroundColor: presetColor }}
              type="button"
            />
          );
        })}

        <label
          className={[
            "relative flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-[border-color,transform] outline-none hover:scale-105",
            !isPreset
              ? "scale-105 border-accent ring-2 ring-accent ring-offset-2 ring-offset-app-elevated"
              : "border-line hover:border-line-strong bg-app-elevated",
          ].join(" ")}
          style={!isPreset ? { backgroundColor: color } : undefined}
          title="Selecionar cor personalizada"
        >
          <span className="grid size-6 place-items-center rounded-md border border-line bg-panel text-app-text">
            <Pipette className="size-4" />
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>

        <span className="select-all font-mono text-xs font-bold uppercase text-muted">
          {color}
        </span>
      </div>
    </div>
  );
}

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
      title="Modelos salvos"
    >
      <div className="p-4 pt-3 space-y-4">
        <div className="flex gap-2">
          <input
            aria-label="Nome do modelo"
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
            className="px-3 min-h-9 bg-accent text-accent-foreground rounded-lg text-xs font-black hover:bg-accent-strong hover:text-accent-strong-foreground disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            type="button"
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
                key={`${preset.name}-${idx}`}
                className="flex items-center justify-between p-2 bg-app border border-line rounded-lg"
              >
                <button
                  aria-label={`Aplicar modelo ${preset.name}`}
                  onClick={() => loadPreset(preset)}
                  className="flex-grow text-left text-xs font-black text-app-text hover:text-accent cursor-pointer"
                  type="button"
                >
                  {preset.name}
                </button>
                <button
                  aria-label={`Excluir modelo ${preset.name}`}
                  onClick={() => deletePreset(idx)}
                  className="text-muted hover:text-danger p-1 transition-colors cursor-pointer"
                  type="button"
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
  fontFamily,
  setFontFamily,
  customTextColor,
  setCustomTextColor,
}: {
  activeSection: string | null;
  bgStyle: BgStyleType;
  color: string;
  format: FormatType;
  setActiveSection: (section: string | null) => void;
  setBgStyle: (style: BgStyleType) => void;
  setColor: (color: string) => void;
  setFormat: (format: FormatType) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  customTextColor: string;
  setCustomTextColor: (color: string) => void;
}) {
  return (
    <ControlSection
      active={activeSection === "layout"}
      icon={<Smartphone className="size-4" />}
      onToggle={() =>
        setActiveSection(activeSection === "layout" ? null : "layout")
      }
      title="Layout e formato"
    >
      <div className="p-4 pt-3 space-y-4">
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
            Fonte do post
          </span>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => (
              <ToggleButton
                key={f.name}
                active={fontFamily === f.name}
                compact
                onClick={() => setFontFamily(f.name)}
              >
                <span style={{ fontFamily: `"${f.name}", sans-serif` }}>
                  {f.label}
                </span>
              </ToggleButton>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-black text-app-text mb-2">
            Estilo de fundo
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
          <ColorPicker
            color={color}
            onChange={setColor}
            presets={COLOR_PRESETS}
            label="Cor de fundo"
          />
        )}

        <ColorPicker
          color={customTextColor}
          onChange={setCustomTextColor}
          presets={TEXT_COLOR_PRESETS}
          label="Cor do texto"
        />
      </div>
    </ControlSection>
  );
}
