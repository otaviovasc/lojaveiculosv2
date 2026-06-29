"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BackgroundConfig } from "@centroimovel/types";
import type { LucideIcon } from "lucide-react";
import {
  AlignCenter,
  ChevronDown,
  Maximize2,
  Palette,
  Play,
  Sparkles,
  Type,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { BackgroundSelector } from "./BackgroundSelector";
import {
  DEFAULT_BUILDER_FONT_FAMILY,
  STORE_BUILDER_FONT_FAMILIES,
} from "./builder-font-families";
import { MotionStyleFields } from "./motion-style-fields";

const PADDING_OPTIONS = [
  { value: "none", label: "0" },
  { value: "sm", label: "P" },
  { value: "md", label: "M" },
  { value: "lg", label: "G" },
  { value: "xl", label: "XG" },
  { value: "2xl", label: "2XG" },
  { value: "full", label: "Full" },
];

const MARGIN_OPTIONS = PADDING_OPTIONS.filter((opt) => opt.value !== "full");

const SHADOW_OPTIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "sm", label: "Suave" },
  { value: "md", label: "Média" },
  { value: "lg", label: "Elevada" },
  { value: "xl", label: "Forte" },
  { value: "2xl", label: "Deep" },
];

const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "0" },
  { value: "sm", label: "4" },
  { value: "md", label: "8" },
  { value: "lg", label: "12" },
  { value: "xl", label: "16" },
  { value: "2xl", label: "24" },
  { value: "full", label: "Round" },
];

const HEIGHT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "25vh", label: "25%" },
  { value: "50vh", label: "50%" },
  { value: "75vh", label: "75%" },
  { value: "100vh", label: "100%" },
];

const FONT_SIZE_OPTIONS = [
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "base", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
];

interface StyleEditorProps {
  style: Record<string, unknown>;
  onChange: (style: Record<string, unknown>) => void;
  workspaceSlug?: string;
  componentType?: string;
}

interface StyleSection {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: ReactNode;
}

export function StyleEditor({
  style,
  onChange,
  workspaceSlug,
  componentType,
}: StyleEditorProps) {
  /** Default to spacing so padding/margin/border-radius are visible without hunting in Effects. */
  const [openSection, setOpenSection] = useState<string | null>("spacing");

  const updateStyle = (key: string, value: unknown) => {
    onChange({ ...style, [key]: value });
  };

  const clearBorderRadius = () => {
    const next = { ...style };
    delete next.borderRadius;
    onChange(next);
  };

  const handleBackgroundChange = (config: BackgroundConfig) => {
    onChange({ ...style, background: config, backgroundImageUrl: undefined });
  };

  const showMotionFields =
    componentType !== "spacer" && componentType !== "divider";
  const isMediaBlock = componentType === "image" || componentType === "video";

  const fontSizeUiKey =
    style.fontSize === "md" ? "base" : (style.fontSize as string) || "";

  const sections: StyleSection[] = [
    {
      id: "background",
      title: "Fundo e Cores",
      icon: Palette,
      fields: (
        <BackgroundSelector
          value={style.background as BackgroundConfig | undefined}
          onChange={handleBackgroundChange}
          workspaceSlug={workspaceSlug}
        />
      ),
    },
    ...(!isMediaBlock
      ? [
          {
            id: "dimensions",
            title: "Dimensões",
            icon: Maximize2,
            fields: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Altura Mínima
                  </Label>
                  <div className="grid grid-cols-5 gap-1">
                    {HEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateStyle("minHeight", opt.value)}
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-bold transition-all",
                          (style.minHeight as string) === opt.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Altura Máxima
                  </Label>
                  <div className="grid grid-cols-5 gap-1">
                    {HEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateStyle("maxHeight", opt.value)}
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-bold transition-all",
                          (style.maxHeight as string) === opt.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ),
          } satisfies StyleSection,
          {
            id: "typography",
            title: "Tipografia",
            icon: Type,
            fields: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Família da Fonte
                  </Label>
                  <select
                    value={
                      (style.fontFamily as string) ||
                      DEFAULT_BUILDER_FONT_FAMILY
                    }
                    onChange={(e) => updateStyle("fontFamily", e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    {STORE_BUILDER_FONT_FAMILIES.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Cor do Texto
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(style.textColor as string) || "#1A1A1A"}
                      onChange={(e) => updateStyle("textColor", e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border/50 overflow-hidden"
                    />
                    <Input
                      value={(style.textColor as string) || ""}
                      onChange={(e) => updateStyle("textColor", e.target.value)}
                      className="h-9 flex-1 font-mono text-xs focus:ring-2 focus:ring-primary/20"
                      placeholder="#1A1A1A"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Tamanho Base
                  </Label>
                  <div className="grid grid-cols-7 gap-1">
                    {FONT_SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateStyle("fontSize", opt.value)}
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-bold transition-all",
                          fontSizeUiKey === opt.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Alinhamento
                  </Label>
                  <div className="flex gap-1">
                    {["left", "center", "right"].map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateStyle("textAlign", align)}
                        className={cn(
                          "flex flex-1 items-center justify-center rounded-lg py-2 text-xs transition-all",
                          (style.textAlign as string) === align
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground",
                        )}
                      >
                        {align === "left" && "←"}
                        {align === "center" && "↔"}
                        {align === "right" && "→"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ),
          } satisfies StyleSection,
        ]
      : []),
    {
      id: "spacing",
      title: "Espaçamento",
      icon: AlignCenter,
      fields: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Padding (Interno)
            </Label>
            <div className="grid grid-cols-7 gap-1">
              {PADDING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle("padding", opt.value)}
                  className={cn(
                    "rounded-md py-1.5 text-[10px] font-bold transition-all",
                    (style.padding as string) === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Margem (Externo)
            </Label>
            <div className="grid grid-cols-6 gap-1">
              {MARGIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle("margin", opt.value)}
                  className={cn(
                    "rounded-md py-1.5 text-[10px] font-bold transition-all",
                    (style.margin as string) === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 border-t border-border/40 pt-4">
            <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Borda arredondada
            </Label>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={clearBorderRadius}
                className={cn(
                  "col-span-4 mb-1 rounded-md py-1.5 text-[10px] font-bold transition-all",
                  !Object.prototype.hasOwnProperty.call(
                    style,
                    "borderRadius",
                  ) ||
                    style.borderRadius === undefined ||
                    style.borderRadius === null
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                Resetar para padrão
              </button>
              {BORDER_RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle("borderRadius", opt.value)}
                  className={cn(
                    "rounded-md py-1.5 text-[10px] font-bold transition-all",
                    (style.borderRadius as string) === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "effects",
      title: "Efeitos Visuais",
      icon: Sparkles,
      fields: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Sombra
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {SHADOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateStyle("shadow", opt.value)}
                  className={cn(
                    "rounded-md py-1.5 text-[10px] font-bold transition-all",
                    (style.shadow as string) === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                Espessura
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={(style.borderWidth as number) || 0}
                onChange={(e) =>
                  updateStyle("borderWidth", parseInt(e.target.value) || 0)
                }
                className="h-9 text-xs focus:ring-2 focus:ring-primary/20"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                Cor da Borda
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(style.borderColor as string) || "#E5E7EB"}
                  onChange={(e) => updateStyle("borderColor", e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border/50 overflow-hidden"
                />
                <Input
                  value={(style.borderColor as string) || ""}
                  onChange={(e) => updateStyle("borderColor", e.target.value)}
                  className="h-9 flex-1 font-mono text-[10px] focus:ring-2 focus:ring-primary/20"
                  placeholder="#E5E7EB"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                Intensidade do Glow
              </Label>
              <span className="text-[10px] font-mono">
                {(style.glowIntensity as number) || 0}%
              </span>
            </div>
            <Input
              type="range"
              min={0}
              max={100}
              value={(style.glowIntensity as number) || 0}
              onChange={(e) =>
                updateStyle("glowIntensity", parseInt(e.target.value) || 0)
              }
              className="h-1.5 cursor-pointer accent-primary"
            />
          </div>
          {(style.glowIntensity as number) > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                Cor do Glow
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(style.glowColor as string) || "#3B82F6"}
                  onChange={(e) => updateStyle("glowColor", e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border/50 overflow-hidden"
                />
                <Input
                  value={(style.glowColor as string) || ""}
                  onChange={(e) => updateStyle("glowColor", e.target.value)}
                  className="h-9 flex-1 font-mono text-[10px] focus:ring-2 focus:ring-primary/20"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          )}
        </div>
      ),
    },
    ...(showMotionFields
      ? [
          {
            id: "animations",
            title: "Animações e Hover",
            icon: Play,
            fields: <MotionStyleFields style={style} onChange={onChange} />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/30 p-4">
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          Estilo do Bloco
        </Label>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <div
              key={section.id}
              className={cn(
                "overflow-hidden rounded-xl border transition-all duration-300",
                isOpen
                  ? "border-primary/30 bg-card shadow-lg shadow-primary/5"
                  : "border-border/40 bg-card/50 hover:border-border/80 hover:bg-card",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isOpen
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <section.icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold tracking-tight transition-colors",
                      isOpen ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {section.title}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180 text-primary",
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                  isOpen ? "opacity-100" : "max-h-0 opacity-0",
                )}
                style={{ maxHeight: isOpen ? 4000 : 0 }}
              >
                <div className="space-y-4 border-t border-border/40 p-4 bg-muted/5">
                  {section.fields}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
