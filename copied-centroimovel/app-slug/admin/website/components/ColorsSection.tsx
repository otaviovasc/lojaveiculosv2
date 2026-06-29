"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/* ── Pre-built color palettes for real estate ── */

const COLOR_PALETTES = [
  {
    name: "Elegância Clássica",
    colors: {
      brandColor: "#1A1A1A",
      accentColor: "#C9A84C",
      backgroundColor: "#F8F5F0",
    },
  },
  {
    name: "Moderno Azul",
    colors: {
      brandColor: "#1E3A5F",
      accentColor: "#3B82F6",
      backgroundColor: "#F0F4FF",
    },
  },
  {
    name: "Terra & Natureza",
    colors: {
      brandColor: "#C4622D",
      accentColor: "#2D5A3D",
      backgroundColor: "#FFFCF7",
    },
  },
  {
    name: "Luxo Minimalista",
    colors: {
      brandColor: "#2D2D2D",
      accentColor: "#B76E79",
      backgroundColor: "#FAFAFA",
    },
  },
  {
    name: "Urbano",
    colors: {
      brandColor: "#334155",
      accentColor: "#14B8A6",
      backgroundColor: "#F8FAFC",
    },
  },
  {
    name: "Dourado Imperial",
    colors: {
      brandColor: "#1C1917",
      accentColor: "#D4A847",
      backgroundColor: "#FDF8ED",
    },
  },
];

const COLOR_FIELDS = [
  { key: "brandColor", label: "Cor da Marca", fallback: "#1A1A1A" },
  { key: "accentColor", label: "Cor de Destaque", fallback: "#C9A84C" },
  { key: "backgroundColor", label: "Fundo das Seções", fallback: "#F8F5F0" },
] as const;

interface ColorsSectionProps {
  config: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
}

export function ColorsSection({ config, onUpdate }: ColorsSectionProps) {
  const applyPalette = (palette: (typeof COLOR_PALETTES)[number]) => {
    onUpdate("brandColor", palette.colors.brandColor);
    onUpdate("accentColor", palette.colors.accentColor);
    onUpdate("backgroundColor", palette.colors.backgroundColor);
  };

  const currentMatch = COLOR_PALETTES.find(
    (p) =>
      (config?.brandColor as string)?.toLowerCase() ===
        p.colors.brandColor.toLowerCase() &&
      (config?.accentColor as string)?.toLowerCase() ===
        p.colors.accentColor.toLowerCase() &&
      (config?.backgroundColor as string)?.toLowerCase() ===
        p.colors.backgroundColor.toLowerCase(),
  );

  return (
    <div className="space-y-8">
      {/* Palette presets */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Paletas Prontas
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Clique para aplicar uma paleta de cores.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_PALETTES.map((palette) => {
            const isActive = currentMatch === palette;
            return (
              <button
                key={palette.name}
                onClick={() => applyPalette(palette)}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20 shadow-sm"
                    : "border-border/50 hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
              >
                {/* Row 1: Color swatches */}
                <div className="flex justify-center gap-2">
                  {Object.values(palette.colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 shrink-0 rounded-full border-2 border-card shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {/* Row 2: Palette name */}
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 text-xs font-medium text-foreground/90 leading-tight truncate">
                    {palette.name}
                  </span>
                  {isActive && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual color pickers */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Personalizar Cores
        </h4>
        <div className="space-y-4">
          {COLOR_FIELDS.map(({ key, label, fallback }) => (
            <div key={key} className="space-y-2">
              <Label className="text-xs font-medium">{label}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={(config?.[key] as string) ?? fallback}
                  onChange={(e) => onUpdate(key, e.target.value)}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-2 border-border/50 shadow-inner"
                />
                <Input
                  value={(config?.[key] as string) ?? ""}
                  onChange={(e) => onUpdate(key, e.target.value)}
                  className="h-10 flex-1 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
